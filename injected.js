class ValidationResult {
    constructor({ status = 'PENDING', matchCount = 0, errors = [], duration = 0, method = 'none' } = {}) {
        this.status = status; // UNIQUE, AMBIGUOUS, MISSING, INVALID, NOT_VERIFIABLE
        this.matchCount = matchCount;
        this.errors = errors;
        this.duration = duration;
        this.method = method; // CSS, XPath, Native, Unsupported
    }
}


class RankingResult {
    constructor({ baseScore = 0, finalScore = 0, modifiers = {} } = {}) {
        this.baseScore = baseScore;
        this.finalScore = finalScore;
        this.modifiers = modifiers; // Key-value pairs of rule name -> multiplier applied
    }
}


class LocatorCandidate {
    constructor({ strategy, locator, generatedBy = [], reason = '', features = {}, metadata = {}, rank = 0 }) {
        this.id = 'lc-' + Math.random().toString(16).substring(2, 10);
        this.strategy = strategy;
        this.locator = locator;
        this.generatedBy = generatedBy.length > 0 ? generatedBy : [strategy];
        this.reason = reason;
        this.features = features; // Dropped during serialization
        this.metadata = metadata;
        this.rank = rank;
        
        // Complex state objects
        this.validation = new ValidationResult();
        this.ranking = new RankingResult();
        this.structural = {
            depth: 0,
            nthCount: 0,
            absoluteSegments: 0,
            dynamicSegments: 0,
            parentVolatility: 0,
            score: 'PENDING'
        };
        this.telemetry = {
            generatedAt: Date.now(),
            validatedAt: null,
            rankedAt: null
        };
    }
}


class PipelineContext {
    constructor(element) {
        this.element = element;
        this.features = null;
        this.candidates = []; // Array of LocatorCandidate
        this.metadata = {
            locatorVersion: 'v2',
            rankingVersion: 'v2',
            strategyVersion: 'v2',
            startTime: Date.now()
        };
        this.telemetry = {
            pipelineDurationMs: 0,
            stages: {}
        };
    }
}


class PipelineStep {
    constructor(name) {
        this.name = name;
    }

    execute(context) {
        throw new Error('PipelineStep subclass must implement execute(context)');
    }
}


class FeatureExtractor extends PipelineStep {
    constructor() {
        super('FeatureExtractor');
    }

    execute(context) {
        const el = context.element;
        if (!(el instanceof Element)) {
            context.features = null;
            return;
        }
        
        const features = {
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            tagName: el.nodeName.toLowerCase(),
            text: '',
            dataOps: {},
            ariaLabel: el.getAttribute('aria-label') || '',
            role: el.getAttribute('role') || '',
            href: el.getAttribute('href') || '',
            src: el.getAttribute('src') || '',
            alt: el.getAttribute('alt') || '',
            placeholder: el.getAttribute('placeholder') || '',
            name: el.getAttribute('name') || '',
            type: el.getAttribute('type') || '',
            rect: null,
            isIntersecting: true, // fallback heuristic
            isIframe: false
        };

        // Extract text carefully excluding scripts/styles
        let textContent = '';
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                textContent += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.nodeName.toLowerCase();
                if (tag !== 'script' && tag !== 'style') {
                    textContent += node.innerText || node.textContent || '';
                }
            }
        }
        features.text = textContent.trim().replace(/\s+/g, ' ');

        const dataAttrs = ['data-op', 'data-testid', 'data-id', 'data-action'];
        for (const attr of dataAttrs) {
            const val = el.getAttribute(attr);
            if (val) features.dataOps[attr] = val;
        }

        try {
            features.rect = el.getBoundingClientRect();
            features.isIntersecting = (features.rect.width > 0 && features.rect.height > 0);
        } catch (e) {}

        context.features = features;
    }
}


class DataAttributeStrategy {
    static generate(el, features) {
        let candidates = [];
        for (const [attr, val] of Object.entries(features.dataOps)) {
            candidates.push(new LocatorCandidate({
                strategy: 'DataAttributeStrategy',
                locator: '[' + attr + '="' + CSS.escape(val) + '"]',
                features,
                reason: 'Matches ' + attr
            }));
        }
        return candidates;
    }
}


class TextStrategy {
    static generate(el, features) {
        if (features.text && features.text.length > 0 && features.text.length < 50) {
            return [new LocatorCandidate({
                strategy: 'TextStrategy',
                locator: 'text="' + features.text.replace(/"/g, '\\"') + '"',
                features,
                reason: 'Visible short text'
            })];
        }
        return [];
    }
}


class AriaStrategy {
    static generate(el, features) {
        if (features.ariaLabel) {
            return [new LocatorCandidate({
                strategy: 'AriaStrategy',
                locator: '[aria-label="' + CSS.escape(features.ariaLabel) + '"]',
                features,
                reason: 'Has aria-label'
            })];
        }
        return [];
    }
}


class RoleStrategy {
    static generate(el, features) {
        if (features.role) {
            let loc = 'role=' + CSS.escape(features.role);
            if (features.name && features.name.length < 50) {
                loc += '[name="' + features.name.replace(/"/g, '\\"') + '"]';
            }
            return [new LocatorCandidate({
                strategy: 'RoleStrategy',
                locator: loc,
                features,
                reason: 'Has explicit role'
            })];
        }
        return [];
    }
}


class SemanticClassStrategy {
    static generate(el, features) {
        if (!features.className) return [];
        const classes = features.className.trim().split(/\s+/).filter(c => {
            if (/^[a-z0-9]{5,8}$/i.test(c)) return false; 
            if (/^(p|m|w|h|text|bg|flex|items|justify|hover|focus|active)-/.test(c)) return false; 
            if (c.includes(':')) return false; 
            return true;
        });
        if (classes.length > 0) {
            const selector = features.tagName + '.' + classes.map(c => CSS.escape(c)).join('.');
            return [new LocatorCandidate({
                strategy: 'SemanticClassStrategy',
                locator: selector,
                features,
                reason: 'Semantic class combination'
            })];
        }
        return [];
    }
}


class StructuralStrategy {
    static generate(el, features) {
        let current = el;
        let isBad = false;
        const adRegex = /(^|[\s_-])ad(s|v|vertisement|banner)?([\s_-]|$)/i;
        
        while (current && current !== document) {
            if (current.tagName === 'IFRAME') { isBad = true; break; }
            const className = (typeof current.className === 'string') ? current.className : '';
            const id = (typeof current.id === 'string') ? current.id : '';
            if (adRegex.test(className) || adRegex.test(id)) { isBad = true; break; }
            current = current.parentNode;
        }
        if (isBad) return [];
        
        let path = [];
        current = el;
        let depth = 0;
        while (current && current.nodeType === Node.ELEMENT_NODE && depth < 10) {
            let selector = current.nodeName.toLowerCase();
            if (current.id && !/\d+/.test(current.id)) {
                selector += '#' + CSS.escape(current.id);
                path.unshift(selector);
                break;
            } else {
                let sib = current, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            current = current.parentNode;
            depth++;
        }
        if (path.length === 0) return [];
        return [new LocatorCandidate({
            strategy: 'StructuralStrategy',
            locator: path.join(" > "),
            features,
            reason: 'Absolute structural path'
        })];
    }
}


class CandidateGenerator extends PipelineStep {
    constructor() {
        super('CandidateGenerator');
    }

    execute(context) {
        if (!context.features) return;
        
        let candidates = [];
        const strategies = [
            DataAttributeStrategy, TextStrategy, AriaStrategy, RoleStrategy, 
            SemanticClassStrategy, StructuralStrategy
        ];

        for (const strat of strategies) {
            try {
                candidates.push(...strat.generate(context.element, context.features));
            } catch (e) {
                console.warn(`[CandidateGenerator] Strategy ${strat.name} failed`, e);
            }
        }

        context.candidates = candidates;
    }
}


class CandidateDeduplicator extends PipelineStep {
    constructor() {
        super('CandidateDeduplicator');
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        const uniqueMap = new Map();
        
        for (let c of context.candidates) {
            let norm = c.locator.trim();
            if (!uniqueMap.has(norm)) {
                uniqueMap.set(norm, c);
            } else {
                let existing = uniqueMap.get(norm);
                // Merge generatedBy
                existing.generatedBy.push(c.strategy);
                // Merge reasons
                existing.reason += ' | Also matched by ' + c.strategy;
            }
        }
        
        context.candidates = Array.from(uniqueMap.values());
    }
}


class CandidateValidator extends PipelineStep {
    constructor() {
        super('CandidateValidator');
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        for (const candidate of context.candidates) {
            const valStart = Date.now();
            let method = 'CSS';
            let status = 'PENDING';
            let matchCount = 0;
            let errors = [];

            // Simple syntax check
            if (!candidate.locator || typeof candidate.locator !== 'string') {
                status = 'INVALID';
                errors.push('Empty or invalid locator string');
            } else if (candidate.locator.startsWith('text=')) {
                // Pseudo-selector unsupported by native querySelectorAll
                method = 'Unsupported';
                status = 'NOT_VERIFIABLE';
            } else {
                try {
                    const matches = document.querySelectorAll(candidate.locator);
                    matchCount = matches.length;
                    
                    if (matchCount === 1) {
                        status = 'UNIQUE';
                    } else if (matchCount > 1) {
                        status = 'AMBIGUOUS';
                    } else {
                        status = 'MISSING';
                    }
                } catch (e) {
                    method = 'Unsupported'; // fallback if querySelectorAll fails (e.g. xpath/pseudo)
                    status = 'NOT_VERIFIABLE';
                    errors.push(e.message);
                }
            }

            candidate.validation.status = status;
            candidate.validation.matchCount = matchCount;
            candidate.validation.errors = errors;
            candidate.validation.method = method;
            candidate.validation.duration = Date.now() - valStart;
            
            candidate.telemetry.validatedAt = Date.now();
        }
    }
}


class StructuralAnalyzer extends PipelineStep {
    constructor() {
        super('StructuralAnalyzer');
    }

    execute(context) {
        if (!context.candidates) return;

        for (const candidate of context.candidates) {
            let depth = 0;
            let nthCount = 0;
            let absoluteSegments = 0;
            let dynamicSegments = 0;
            let parentVolatility = 0; // heuristic based on nth-of-type depth
            
            const loc = candidate.locator;
            
            if (candidate.strategy === 'StructuralStrategy') {
                const parts = loc.split('>');
                depth = parts.length;
                
                parts.forEach((p, idx) => {
                    const segment = p.trim();
                    if (segment.includes(':nth-of-type') || segment.includes(':nth-child')) {
                        nthCount++;
                        if (idx < parts.length - 1) {
                            // High volatility if parent relies on indices
                            parentVolatility++;
                        }
                    }
                    if (segment.match(/^[a-z]+$/i)) {
                        absoluteSegments++; // tag only
                    }
                });
            } else if (candidate.strategy === 'SemanticClassStrategy') {
                const classes = loc.split('.');
                depth = 1;
                if (classes.some(c => /\d/.test(c))) {
                    dynamicSegments++; // classes with numbers might be dynamic
                }
            }

            let score = 'HIGH';
            if (depth > 5 || nthCount > 2 || parentVolatility > 0) {
                score = 'LOW';
            } else if (depth > 2 || nthCount > 0 || dynamicSegments > 0) {
                score = 'MEDIUM';
            }

            candidate.structural = {
                depth,
                nthCount,
                absoluteSegments,
                dynamicSegments,
                parentVolatility,
                score
            };
        }
    }
}


class BaseScoreRule {
    apply(candidate, context) {
        let base = 0;
        switch (candidate.strategy) {
            case 'DataAttributeStrategy': base = 100; break;
            case 'RoleStrategy': base = 80; break;
            case 'AriaStrategy': base = 70; break;
            case 'TextStrategy': base = 60; break;
            case 'SemanticClassStrategy': base = 50; break;
            case 'StructuralStrategy': base = 30; break;
            default: base = 10; break;
        }
        candidate.ranking.baseScore = base;
        candidate.ranking.finalScore = base;
        candidate.ranking.modifiers['BaseScore'] = 1.0;
    }
}


class UniquenessRule {
    apply(candidate, context) {
        let multiplier = 1.0;
        const status = candidate.validation.status;
        
        if (status === 'UNIQUE') multiplier = 1.0;
        else if (status === 'AMBIGUOUS') multiplier = 0.2;
        else if (status === 'MISSING') multiplier = 0.0;
        else if (status === 'NOT_VERIFIABLE') multiplier = 0.8;
        else if (status === 'INVALID') multiplier = 0.0;
        
        candidate.ranking.modifiers['Uniqueness'] = multiplier;
        candidate.ranking.finalScore *= multiplier;
    }
}


class StructuralRule {
    apply(candidate, context) {
        let multiplier = 1.0;
        const score = candidate.structural.score;
        
        if (score === 'HIGH') multiplier = 1.0;
        else if (score === 'MEDIUM') multiplier = 0.9;
        else if (score === 'LOW') multiplier = 0.5;
        
        candidate.ranking.modifiers['Structural'] = multiplier;
        candidate.ranking.finalScore *= multiplier;
    }
}


class VisibilityRule {
    apply(candidate, context) {
        let multiplier = 1.0;
        
        // Visibility heuristic: extracted from features.isIntersecting
        if (candidate.features && candidate.features.isIntersecting === false) {
            multiplier = 0.5; // Penalty for hidden elements
        }
        
        candidate.ranking.modifiers['Visibility'] = multiplier;
        candidate.ranking.finalScore *= multiplier;
    }
}


class CorroborationRule {
    apply(candidate, context) {
        let multiplier = 1.0;
        const count = candidate.generatedBy ? candidate.generatedBy.length : 1;
        
        if (count === 1) multiplier = 1.0;
        else if (count === 2) multiplier = 1.1;
        else if (count >= 3) multiplier = 1.15; // Diminishing returns
        
        candidate.ranking.modifiers['Corroboration'] = multiplier;
        candidate.ranking.finalScore *= multiplier;
    }
}


class RankingEngine extends PipelineStep {
    constructor() {
        super('RankingEngine');
        this.rules = [
            new BaseScoreRule(),
            new UniquenessRule(),
            new StructuralRule(),
            new VisibilityRule(),
            new CorroborationRule()
        ];
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        for (const candidate of context.candidates) {
            for (const rule of this.rules) {
                rule.apply(candidate, context);
            }
            candidate.telemetry.rankedAt = Date.now();
        }

        // Sort descending by finalScore
        context.candidates.sort((a, b) => b.ranking.finalScore - a.ranking.finalScore);

        // Assign ordinal rank
        context.candidates.forEach((c, index) => {
            c.rank = index;
        });
    }
}


class LocatorSerializer extends PipelineStep {
    constructor() {
        super('LocatorSerializer');
    }

    execute(context) {
        const candidates = context.candidates || [];
        
        context.output = {
            locators: candidates.map(c => ({
                id: c.id,
                strategy: c.strategy,
                generatedBy: c.generatedBy,
                locator: c.locator,
                reason: c.reason,
                rank: c.rank,
                validation: c.validation,
                structural: c.structural,
                ranking: c.ranking,
                telemetry: c.telemetry
            })),
            metadata: {
                ...context.metadata,
                generationMetrics: {
                    durationMs: context.telemetry.pipelineDurationMs,
                    candidateCount: candidates.length,
                    stages: context.telemetry.stages
                }
            }
        };
    }
}


class LocatorIntelligenceEngine {
    constructor() {
        this.pipeline = [
            new FeatureExtractor(),
            new CandidateGenerator(),
            new CandidateDeduplicator(),
            new CandidateValidator(),
            new StructuralAnalyzer(),
            new RankingEngine(),
            new LocatorSerializer()
        ];
    }

    process(el) {
        const context = new PipelineContext(el);
        
        for (const step of this.pipeline) {
            const stepStart = Date.now();
            
            try {
                step.execute(context);
            } catch (e) {
                console.warn(`[LocatorIntelligence] Pipeline step ${step.name} failed:`, e);
            }
            
            context.telemetry.stages[step.name] = Date.now() - stepStart;
        }
        
        context.telemetry.pipelineDurationMs = Date.now() - context.metadata.startTime;
        
        // Return the serialized output, which the Serializer places into context.output
        return context.output;
    }
}


