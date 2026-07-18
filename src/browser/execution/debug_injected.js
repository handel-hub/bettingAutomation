
            (() => {
            const locatorIntelligencePipelineStart = Date.now();
            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            // --------------------------------------------------------
            // LOCATOR INTELLIGENCE ENGINE (STAGE 2.1 - PIPELINE)
            // --------------------------------------------------------
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
    constructor({ baseScore = 0, finalScore = 0, scoreBreakdown = {} } = {}) {
        this.baseScore = baseScore;
        this.finalScore = finalScore;
        this.scoreBreakdown = scoreBreakdown; // Key-value pairs of rule name -> multiplier/score applied
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
            TelemetryCollector.recordValidation(status);
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


class RankingRule {
    constructor(name) {
        this.name = name;
    }

    /**
     * Evaluates the candidate and returns ranking modifiers.
     * @param {Object} candidate - The locator candidate
     * @param {Object} context - The pipeline context containing interaction, url, allCandidates, etc.
     * @returns {Object} { scoreDelta: Number, multiplier: Number, metadata: Object, telemetry: Object }
     */
    evaluate(candidate, context) {
        throw new Error('RankingRule.evaluate() must be implemented by subclasses');
    }
}


class BaseScoreRule extends RankingRule {
    constructor() {
        super('BaseScoreRule');
    }

    evaluate(candidate, context) {
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
        return { baseScore: base };
    }
}


class UUIDDetector {
    static detect(str) {
        return /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(str) ? 30 : 0;
    }
}

class TimestampDetector {
    static detect(str) {
        return (/\d{1,2}:\d{2}/.test(str) || /\d{4}-\d{2}-\d{2}/.test(str)) ? 20 : 0;
    }
}

class FrameworkHashDetector {
    static detect(str) {
        return (/-[0-9]{3,}$|_[0-9]{3,}$/.test(str)) ? 20 : 0;
    }
}

class HexBase64Detector {
    static detect(str) {
        return (/[0-9a-zA-Z\-_]{16,}/.test(str) && !str.includes(' ')) ? 15 : 0;
    }
}

class CurrencyDetector {
    static detect(str) {
        return (/^\$?\d+\.\d{2}$/.test(str.trim())) ? 5 : 0;
    }
}

class DynamicContentRule extends RankingRule {
    constructor() {
        super('DynamicContentRule');
        this.detectors = [
            UUIDDetector,
            TimestampDetector,
            FrameworkHashDetector,
            HexBase64Detector,
            CurrencyDetector
        ];
    }

    evaluate(candidate, context) {
        let penaltyScore = 0;
        
        const loc = candidate.locator || '';
        const features = candidate.features || {};
        
        const stringsToTest = [
            loc,
            features.id || '',
            features.className || '',
            features.text || ''
        ];
        
        for (const str of stringsToTest) {
            if (!str) continue;
            for (const detector of this.detectors) {
                penaltyScore += detector.detect(str);
            }
        }
        
        // Cap penalty score and convert to multiplier
        let multiplier = 1.0;
        if (penaltyScore >= 30) multiplier = 0.2;
        else if (penaltyScore >= 20) multiplier = 0.4;
        else if (penaltyScore >= 15) multiplier = 0.6;
        else if (penaltyScore >= 10) multiplier = 0.8;
        else if (penaltyScore >= 5) multiplier = 0.9;
        
        return { multiplier };
    }
}


class ValidationConfidenceRule extends RankingRule {
    constructor() {
        super('ValidationConfidenceRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const status = candidate.validation?.status;
        
        if (status === 'UNIQUE') multiplier = 1.0;
        else if (status === 'AMBIGUOUS') multiplier = 0.2;
        else if (status === 'MISSING') multiplier = 0.0;
        else if (status === 'NOT_VERIFIABLE') multiplier = 0.8;
        else if (status === 'INVALID') multiplier = 0.0;
        
        return { multiplier };
    }
}


class SpecificityRule extends RankingRule {
    constructor() {
        super('SpecificityRule');
    }

    evaluate(candidate, context) {
        let specificityScore = 0;
        const loc = candidate.locator || '';
        
        // Very rough specificity heuristic for Playwright/CSS selectors
        // We strip out anything inside quotes to avoid false counting
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        // Count ID selectors (#id)
        const ids = (strippedLoc.match(/#/g) || []).length;
        specificityScore += ids * 100;
        
        // Count class selectors (.class), attributes ([attr]), and pseudo-classes (:hover)
        const classes = (strippedLoc.match(/\./g) || []).length;
        const attrs = (strippedLoc.match(/\[/g) || []).length;
        const pseudos = (strippedLoc.match(/:[a-zA-Z-]/g) || []).length; // avoiding counting "text="
        specificityScore += (classes + attrs + pseudos) * 10;
        
        // Count tag names (very rough: words at start or following space/combinator that aren't engine prefixes)
        const tags = (strippedLoc.match(/(^|[\s>+~])([a-zA-Z0-9_-]+)(?=[#\.\[:]|\s|$)/g) || [])
                     .filter(t => !['text', 'role', 'css', 'xpath'].includes(t.trim())).length;
        specificityScore += tags * 1;
        
        // Playwright specific engine boosts
        if (loc.startsWith('role=')) specificityScore += 15;
        if (loc.startsWith('text=') || loc.startsWith('internal:text=')) specificityScore += 5;
        
        // Convert to multiplier
        let multiplier = 1.0;
        if (specificityScore >= 100) multiplier = 1.3;
        else if (specificityScore >= 30) multiplier = 1.2;
        else if (specificityScore >= 20) multiplier = 1.15;
        else if (specificityScore >= 10) multiplier = 1.1;
        else if (specificityScore > 0) multiplier = 1.05;
        
        return { multiplier };
    }
}


class ComplexityRule extends RankingRule {
    constructor() {
        super('ComplexityRule');
    }

    evaluate(candidate, context) {
        let complexityScore = 0;
        const loc = candidate.locator || '';
        
        // Strip out anything inside quotes to avoid false counting
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        // Length penalty
        if (loc.length > 100) complexityScore += 20;
        else if (loc.length > 60) complexityScore += 10;
        else if (loc.length > 40) complexityScore += 5;
        
        // Descendant combinators (spaces or >)
        const combinators = (strippedLoc.match(/\s+>|\s+/g) || []).length;
        complexityScore += combinators * 5;
        
        // Wildcard selectors (*)
        const wildcards = (strippedLoc.match(/\*/g) || []).length;
        complexityScore += wildcards * 15;
        
        // Pseudo selectors heavily impacting layout search (e.g. :nth-child, :nth-of-type, :has)
        const structuralPseudos = (strippedLoc.match(/:nth|:has/g) || []).length;
        complexityScore += structuralPseudos * 15;
        
        // Convert to multiplier (Higher complexity = lower multiplier)
        let multiplier = 1.0;
        if (complexityScore >= 40) multiplier = 0.5;
        else if (complexityScore >= 25) multiplier = 0.7;
        else if (complexityScore >= 15) multiplier = 0.85;
        else if (complexityScore >= 5) multiplier = 0.95;
        
        return { multiplier };
    }
}


class StructuralRule extends RankingRule {
    constructor() {
        super('StructuralRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const score = candidate.structural?.score;
        
        if (score === 'HIGH') multiplier = 1.0;
        else if (score === 'MEDIUM') multiplier = 0.9;
        else if (score === 'LOW') multiplier = 0.5;
        
        return { multiplier };
    }
}


class VisibilityRule extends RankingRule {
    constructor() {
        super('VisibilityRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        
        // Visibility heuristic: extracted from features.isIntersecting
        if (candidate.features && candidate.features.isIntersecting === false) {
            multiplier = 0.5; // Penalty for hidden elements
        }
        
        return { multiplier };
    }
}


class CorroborationRule extends RankingRule {
    constructor() {
        super('CorroborationRule');
    }

    evaluate(candidate, context) {
        let multiplier = 1.0;
        const count = candidate.generatedBy ? candidate.generatedBy.length : 1;
        
        if (count === 1) multiplier = 1.0;
        else if (count === 2) multiplier = 1.1;
        else if (count >= 3) multiplier = 1.15; // Diminishing returns
        
        return { multiplier };
    }
}


class RankingConfig {
    static getRules() {
        return [
            { rule: new BaseScoreRule(), enabled: true, priority: 100 },
            { rule: new DynamicContentRule(), enabled: true, priority: 90 },
            { rule: new ValidationConfidenceRule(), enabled: true, priority: 80 },
            { rule: new SpecificityRule(), enabled: true, priority: 70 },
            { rule: new ComplexityRule(), enabled: true, priority: 60 },
            { rule: new StructuralRule(), enabled: true, priority: 50 },
            { rule: new VisibilityRule(), enabled: true, priority: 40 },
            { rule: new CorroborationRule(), enabled: true, priority: 30 }
        ];
    }
}




class RankingEngine extends PipelineStep {
    constructor() {
        super('RankingEngine');
        this.configRules = RankingConfig.getRules();
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        const activeRules = this.configRules
            .filter(r => r.enabled)
            .sort((a, b) => b.priority - a.priority)
            .map(r => r.rule);

        for (const candidate of context.candidates) {
            candidate.ranking.scoreBreakdown = {};
            
            for (const rule of activeRules) {
                const result = rule.evaluate(candidate, context);
                
                if (result.baseScore !== undefined) {
                    candidate.ranking.baseScore = result.baseScore;
                    candidate.ranking.finalScore = result.baseScore;
                    candidate.ranking.scoreBreakdown[rule.name] = result.baseScore;
                }
                if (result.scoreDelta !== undefined) {
                    candidate.ranking.baseScore = (candidate.ranking.baseScore || 0) + result.scoreDelta;
                    candidate.ranking.finalScore = (candidate.ranking.finalScore || 0) + result.scoreDelta;
                    candidate.ranking.scoreBreakdown[rule.name] = result.scoreDelta;
                }
                if (result.multiplier !== undefined) {
                    candidate.ranking.finalScore *= result.multiplier;
                    candidate.ranking.scoreBreakdown[rule.name] = result.multiplier;
                }
            }
            candidate.telemetry.rankedAt = Date.now();
        }

        // Deterministic sorting with Tie Breakers
        // Higher Final Score -> Higher Validation Status -> Higher Specificity -> Lower Complexity -> Higher Corroboration -> Strategy Stability -> Shorter Locator -> Generation Order
        
        const statusValue = { 'UNIQUE': 3, 'NOT_VERIFIABLE': 2, 'AMBIGUOUS': 1, 'MISSING': 0, 'INVALID': -1 };
        
        context.candidates.sort((a, b) => {
            if (b.ranking.finalScore !== a.ranking.finalScore) {
                return b.ranking.finalScore - a.ranking.finalScore;
            }
            
            const valA = statusValue[a.validation.status] ?? 0;
            const valB = statusValue[b.validation.status] ?? 0;
            if (valB !== valA) return valB - valA;
            
            const specA = a.ranking.scoreBreakdown['SpecificityRule'] ?? 1;
            const specB = b.ranking.scoreBreakdown['SpecificityRule'] ?? 1;
            if (specB !== specA) return specB - specA;
            
            const compA = a.ranking.scoreBreakdown['ComplexityRule'] ?? 1;
            const compB = b.ranking.scoreBreakdown['ComplexityRule'] ?? 1;
            if (compA !== compB) return compA - compB; // Lower multiplier means higher penalty, so lower complexity = higher multiplier
            
            const corrA = a.ranking.scoreBreakdown['CorroborationRule'] ?? 1;
            const corrB = b.ranking.scoreBreakdown['CorroborationRule'] ?? 1;
            if (corrB !== corrA) return corrB - corrA;
            
            const stratA = a.ranking.scoreBreakdown['BaseScoreRule'] ?? 0;
            const stratB = b.ranking.scoreBreakdown['BaseScoreRule'] ?? 0;
            if (stratA !== stratB) return stratB - stratA;
            
            const lenA = (a.locator || '').length;
            const lenB = (b.locator || '').length;
            if (lenA !== lenB) return lenA - lenB;
            
            return 0; // Generation order is preserved
        });

        // Assign ordinal rank
        context.candidates.forEach((c, index) => {
            c.rank = index + 1;
        });

        TelemetryCollector.recordRanking({ candidates: context.candidates });
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
                locator: c.locator,
                rank: c.rank,
                reason: c.reason,
                generatedBy: context.config?.debug ? c.generatedBy : undefined,
                validation: context.config?.debug ? c.validation : undefined,
                structural: context.config?.debug ? c.structural : undefined,
                ranking: {
                    baseScore: context.config?.debug ? c.ranking.baseScore : undefined,
                    finalScore: c.ranking.finalScore,
                    scoreBreakdown: context.config?.debug ? c.ranking.scoreBreakdown : undefined
                },
                telemetry: context.config?.debug ? c.telemetry : undefined
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


class RollingWindow {
    constructor(size = 128) {
        this.size = size;
        this.buffer = new Float64Array(size);
        this.head = 0;
        this.count = 0;
        this.sum = 0;
    }

    push(value) {
        if (typeof value !== 'number' || isNaN(value)) return;

        if (this.count === this.size) {
            // Subtract the oldest value from the sum
            this.sum -= this.buffer[this.head];
        } else {
            this.count++;
        }

        this.buffer[this.head] = value;
        this.sum += value;
        
        this.head = (this.head + 1) % this.size;
    }

    get average() {
        return this.count === 0 ? 0 : this.sum / this.count;
    }

    get currentCount() {
        return this.count;
    }

    snapshot() {
        return {
            average: this.average,
            count: this.count
        };
    }

    reset() {
        this.buffer.fill(0);
        this.head = 0;
        this.count = 0;
        this.sum = 0;
    }
}




class MetricsRegistry {
    constructor() {
        this.reset();
    }

    reset() {
        // Resolution Metrics
        this.resolution = {
            total: 0,
            success: 0,
            failed: 0,
            timeout: 0,
            latency: new RollingWindow(128),
            retries: new RollingWindow(128)
        };

        // Ranking Metrics
        this.ranking = {
            candidateCount: new RollingWindow(128),
            finalConfidence: new RollingWindow(128),
            ambiguityCount: new RollingWindow(128),
            corroborationCount: new RollingWindow(128)
        };

        // Strategy Metrics (Map of Strategy Name -> Counters)
        this.strategies = new Map();

        // Validation Metrics
        this.validation = {
            UNIQUE: 0,
            AMBIGUOUS: 0,
            NOT_VERIFIABLE: 0,
            MISSING: 0,
            INVALID: 0
        };

        // Failure Metrics (Map of LF Code -> Count)
        this.failures = new Map();

        // Execution Metrics (Hooks for ActionSimulator)
        this.execution = {
            total: 0,
            retries: new RollingWindow(128),
            resolverCycles: new RollingWindow(128),
            candidateExhaustion: new RollingWindow(128),
            confidenceDecay: new RollingWindow(128)
        };
    }

    _getOrCreateStrategyRecord(strategyName) {
        if (!this.strategies.has(strategyName)) {
            this.strategies.set(strategyName, { success: 0, failed: 0 });
        }
        return this.strategies.get(strategyName);
    }

    recordStrategyResult(strategyName, success) {
        if (!strategyName) return;
        const record = this._getOrCreateStrategyRecord(strategyName);
        if (success) {
            record.success++;
        } else {
            record.failed++;
        }
    }

    recordFailureCode(code) {
        if (!code) return;
        const count = this.failures.get(code) || 0;
        this.failures.set(code, count + 1);
    }

    snapshot() {
        return {
            timestamp: Date.now(),
            resolution: {
                total: this.resolution.total,
                success: this.resolution.success,
                failed: this.resolution.failed,
                timeout: this.resolution.timeout,
                averageLatency: this.resolution.latency.average,
                averageRetries: this.resolution.retries.average
            },
            ranking: {
                averageCandidateCount: this.ranking.candidateCount.average,
                averageFinalConfidence: this.ranking.finalConfidence.average,
                averageAmbiguityCount: this.ranking.ambiguityCount.average,
                averageCorroborationCount: this.ranking.corroborationCount.average
            },
            strategies: Object.fromEntries(this.strategies),
            validation: { ...this.validation },
            failures: Object.fromEntries(this.failures),
            execution: {
                total: this.execution.total,
                averageRetries: this.execution.retries.average,
                averageResolverCycles: this.execution.resolverCycles.average,
                averageCandidateExhaustion: this.execution.candidateExhaustion.average,
                averageConfidenceDecay: this.execution.confidenceDecay.average
            }
        };
    }
}




class TelemetryCollectorImpl {
    constructor() {
        this.registry = new MetricsRegistry();
    }

    /**
     * Resets all accumulated telemetry.
     */
    reset() {
        this.registry.reset();
    }

    /**
     * Returns an immutable snapshot of current metrics.
     */
    snapshot() {
        // Since snapshot returns a deeply cloned/mapped structure, it's safe to return directly.
        return this.registry.snapshot();
    }

    /**
     * Records telemetry from the RankingEngine.
     * @param {RankingResult} rankingResult
     */
    recordRanking(rankingResult) {
        try {
            if (!rankingResult) return;
            const candidates = rankingResult.candidates || [];
            this.registry.ranking.candidateCount.push(candidates.length);
            
            let totalConf = 0, ambiguityCount = 0, corroborationCount = 0;
            
            for (const c of candidates) {
                totalConf += c.ranking?.finalScore || 0;
                // These are heuristics, we assume the scores exist inside the candidate metadata
                if (c.ranking?.breakdown?.corroborationScore > 0) corroborationCount++;
            }
            
            if (candidates.length > 0) {
                this.registry.ranking.finalConfidence.push(totalConf / candidates.length);
            }
            this.registry.ranking.corroborationCount.push(corroborationCount);
        } catch (e) {
            // Passive - ignore errors
        }
    }

    /**
     * Records telemetry from the CandidateValidator.
     * @param {string} status e.g., UNIQUE, AMBIGUOUS, NOT_VERIFIABLE
     */
    recordValidation(status) {
        try {
            if (this.registry.validation[status] !== undefined) {
                this.registry.validation[status]++;
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the LocatorResolver.
     * @param {ResolutionResult} resolutionResult
     */
    recordResolution(resolutionResult) {
        try {
            if (!resolutionResult) return;
            
            this.registry.resolution.total++;
            this.registry.resolution.latency.push(resolutionResult.duration || 0);
            
            if (resolutionResult.success) {
                this.registry.resolution.success++;
                this.registry.recordStrategyResult(resolutionResult.winningStrategy, true);
                
                // Track execution attempts before finding success
                let resolutionAttempts = 0;
                if (resolutionResult.telemetry && resolutionResult.telemetry.length > 0) {
                     for (const t of resolutionResult.telemetry) {
                          resolutionAttempts += t.attempts || 0;
                     }
                }
                this.registry.resolution.retries.push(resolutionAttempts);
                
            } else {
                this.registry.resolution.failed++;
                if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-504')) {
                    this.registry.resolution.timeout++;
                    this.registry.recordFailureCode('LF-504');
                } else if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-505')) {
                    this.registry.recordFailureCode('LF-505');
                } else {
                    this.registry.recordFailureCode('UNKNOWN_FAILURE');
                }
            }
            
            // Record strategy failures
            if (resolutionResult.telemetry) {
                for (const ctx of resolutionResult.telemetry) {
                    // ctx is either a stripped object `{ rank, attempts, state }` or full `ResolutionContext`
                    // We only count strategies that were exhausted or had terminal failures as failed.
                    if (ctx.state === 'EXHAUSTED' || ctx.state === 'TERMINAL_FAILURE') {
                        // We need the strategy name, full context has candidate.strategy.
                        const strategyName = ctx.candidate?.strategy || ctx.strategy;
                        if (strategyName) {
                            this.registry.recordStrategyResult(strategyName, false);
                        }
                        
                        // Count LF codes from failures
                        if (ctx.lastFailure?.code) {
                            this.registry.recordFailureCode(ctx.lastFailure.code);
                        } else if (ctx.failureHistory && ctx.failureHistory.length > 0) {
                            const last = ctx.failureHistory[ctx.failureHistory.length - 1];
                            if (last.code) this.registry.recordFailureCode(last.code);
                        }
                    }
                }
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the ActionSimulator.
     */
    recordExecution() {
        // Placeholder for future auditing
        try {
            this.registry.execution.total++;
        } catch (e) {}
    }
}

const TelemetryCollector = new TelemetryCollectorImpl();


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



            // --------------------------------------------------------

            function sendExecution(type, payload) {
                if (window.dispatchExecutionEvent) {
                    payload.captureTime = Date.now();
                    window.dispatchExecutionEvent({ type, payload });
                }
            }

            const AggregationConfig = {
                clickWindow: 250,
                doubleClickWindow: 300,
                typingWindow: 500,
                scrollWindow: 200,
                dragThreshold: 10,
                hoverThrottle: 100,
                longPressWindow: 800
            };

            class InteractionRecognizer {
                constructor() {
                    this.pointerState = 'IDLE';
                    this.pointerData = { path: [], startTarget: null, clickTimeout: null, consumed: [], startTime: 0 };
                    
                    this.scrollState = 'IDLE';
                    this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null };
                    
                    this.inputState = 'IDLE';
                    this.inputData = { value: '', timeout: null, consumed: [], target: null };
                    
                    this.hoverTimeout = null;
                }

                emit(type, data) {
                    const start = Date.now();
                    const payload = {
                        interactionId: 'ia-' + generateUUID().split('-')[0],
                        interactionType: type,
                        originEvent: data.originEvent,
                        consumedEvents: data.consumed,
                        timestamp: start,
                        context: data.context
                    };

                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT'].includes(type)) {
                        const engine = new LocatorIntelligenceEngine();
                        const resolution = engine.process(data.target);
                        if (resolution) {
                            payload.locators = resolution.locators;
                            payload.locatorMetadata = resolution.metadata;
                        }
                    }

                    if (data.coordinates) payload.coordinates = data.coordinates;
                    if (data.path) payload.path = data.path;
                    if (data.deltas) payload.deltas = data.deltas;
                    if (data.value !== undefined) payload.value = data.value;
                    if (data.key) payload.key = data.key;

                    payload.metadata = { aggregationDuration: Date.now() - data.startTime };
                    sendExecution(type, payload);
                }

                flushPointer() {
                    if (this.pointerData.clickTimeout) {
                        clearTimeout(this.pointerData.clickTimeout);
                        this.pointerData.clickTimeout = null;
                    }
                    this.pointerState = 'IDLE';
                    this.pointerData = { path: [], startTarget: null, clickTimeout: null, consumed: [], startTime: 0 };
                }

                processPointerEvent(e) {
                    const type = e.type;
                    const now = Date.now();

                    if (type === 'mousedown' || type === 'pointerdown') {
                        if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                            return;
                        }
                        this.flushPointer();
                        this.pointerState = 'POINTER_DOWN';
                        this.pointerData.startTarget = e.target;
                        this.pointerData.path = [{x: e.clientX, y: e.clientY}];
                        this.pointerData.consumed.push(type);
                        this.pointerData.startTime = now;
                    } 
                    else if (type === 'mousemove' || type === 'pointermove') {
                        if (this.pointerState === 'POINTER_DOWN' || this.pointerState === 'CLICK_PENDING') {
                            const start = this.pointerData.path[0];
                            const dist = Math.sqrt(Math.pow(e.clientX - start.x, 2) + Math.pow(e.clientY - start.y, 2));
                            if (dist > AggregationConfig.dragThreshold) {
                                if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                                this.pointerState = 'DRAGGING';
                            } else if (this.pointerState === 'POINTER_DOWN') {
                                this.pointerData.consumed.push(type);
                            }
                        }

                        if (this.pointerState === 'DRAGGING') {
                            const last = this.pointerData.path[this.pointerData.path.length - 1];
                            const dist = Math.sqrt(Math.pow(e.clientX - last.x, 2) + Math.pow(e.clientY - last.y, 2));
                            if (dist > 5) {
                                this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            }
                            if (!this.pointerData.consumed.includes(type)) this.pointerData.consumed.push(type);
                        }

                        if (this.pointerState === 'IDLE') {
                            if (!this.hoverTimeout) {
                                this.hoverTimeout = setTimeout(() => {
                                    this.emit('HOVER', {
                                        originEvent: type,
                                        consumed: [type],
                                        context: 'Pointer Context',
                                        coordinates: { x: e.clientX, y: e.clientY },
                                        startTime: now
                                    });
                                    this.hoverTimeout = null;
                                }, AggregationConfig.hoverThrottle);
                            }
                        }
                    }
                    else if (type === 'mouseup' || type === 'pointerup') {
                        if (this.pointerState === 'DRAGGING') {
                            this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            this.pointerData.consumed.push(type);
                            this.emit('DRAG', {
                                originEvent: type,
                                consumed: this.pointerData.consumed,
                                context: 'Pointer Context',
                                target: this.pointerData.startTarget,
                                path: this.pointerData.path,
                                startTime: this.pointerData.startTime
                            });
                            this.flushPointer();
                        } else if (this.pointerState === 'POINTER_DOWN') {
                            this.pointerData.consumed.push(type);
                            if (e.button === 2) {
                                this.emit('CLICK', {
                                    originEvent: 'contextmenu',
                                    consumed: this.pointerData.consumed,
                                    context: 'Pointer Context',
                                    target: this.pointerData.startTarget,
                                    coordinates: { x: e.clientX, y: e.clientY },
                                    startTime: this.pointerData.startTime
                                });
                                this.flushPointer();
                            }
                        } else if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                        }
                    }
                    else if (type === 'click') {
                        if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                        } else {
                            this.pointerState = 'CLICK_PENDING';
                            this.pointerData.consumed.push(type);
                            if (!this.pointerData.startTarget) this.pointerData.startTarget = e.target;
                            if (this.pointerData.path.length === 0) this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            if (!this.pointerData.startTime) this.pointerData.startTime = now;

                            this.pointerData.clickTimeout = setTimeout(() => {
                                this.emit('CLICK', {
                                    originEvent: 'click',
                                    consumed: this.pointerData.consumed,
                                    context: 'Pointer Context',
                                    target: this.pointerData.startTarget,
                                    coordinates: this.pointerData.path[0],
                                    startTime: this.pointerData.startTime
                                });
                                this.flushPointer();
                            }, AggregationConfig.clickWindow);
                        }
                    }
                    else if (type === 'dblclick') {
                        this.pointerData.consumed.push(type);
                        if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                        
                        this.emit('DOUBLE_CLICK', {
                            originEvent: 'dblclick',
                            consumed: this.pointerData.consumed,
                            context: 'Pointer Context',
                            target: this.pointerData.startTarget || e.target,
                            coordinates: { x: e.clientX, y: e.clientY },
                            startTime: this.pointerData.startTime || now
                        });
                        this.flushPointer();
                    }
                }

                processScrollEvent(e) {
                    const now = Date.now();
                    if (this.scrollState === 'IDLE') {
                        this.scrollState = 'SCROLLING';
                        this.scrollData.startTime = now;
                        this.scrollData.target = e.target;
                    }
                    
                    if (e.type === 'wheel') {
                        this.scrollData.deltaX += e.deltaX;
                        this.scrollData.deltaY += e.deltaY;
                        if (!this.scrollData.consumed.includes('wheel')) this.scrollData.consumed.push('wheel');
                    } else if (e.type === 'scroll') {
                        if (!this.scrollData.consumed.includes('scroll')) this.scrollData.consumed.push('scroll');
                    }

                    if (this.scrollData.timeout) clearTimeout(this.scrollData.timeout);

                    this.scrollData.timeout = setTimeout(() => {
                        this.emit('SCROLL', {
                            originEvent: e.type,
                            consumed: this.scrollData.consumed,
                            context: 'Scroll Context',
                            target: this.scrollData.target,
                            deltas: { deltaX: this.scrollData.deltaX, deltaY: this.scrollData.deltaY },
                            startTime: this.scrollData.startTime
                        });
                        this.scrollState = 'IDLE';
                        this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null };
                    }, AggregationConfig.scrollWindow);
                }

                processInputEvent(e) {
                    const now = Date.now();
                    if (this.inputState === 'IDLE') {
                        this.inputState = 'TYPING';
                        this.inputData.startTime = now;
                        this.inputData.target = e.target;
                    }
                    
                    this.inputData.value = e.target.value;
                    if (!this.inputData.consumed.includes(e.type)) this.inputData.consumed.push(e.type);

                    if (this.inputData.timeout) clearTimeout(this.inputData.timeout);

                    this.inputData.timeout = setTimeout(() => {
                        this.emit('INPUT', {
                            originEvent: 'input',
                            consumed: this.inputData.consumed,
                            context: 'Input Context',
                            target: this.inputData.target,
                            value: this.inputData.value,
                            startTime: this.inputData.startTime
                        });
                        this.inputState = 'IDLE';
                        this.inputData = { value: '', timeout: null, consumed: [], target: null };
                    }, AggregationConfig.typingWindow);
                }

                processKeyboardEvent(e) {
                    const specialKeys = ['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'];
                    const isSpecial = specialKeys.includes(e.key);
                    const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
                    
                    if (isSpecial || hasModifier) {
                        let parts = [];
                        if (e.ctrlKey) parts.push('Control');
                        if (e.altKey) parts.push('Alt');
                        if (e.shiftKey && parts.length > 0) parts.push('Shift');
                        if (e.metaKey) parts.push('Meta');
                        
                        let key = e.key;
                        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
                        if (key && key.length === 1 && /^[a-z]$/i.test(key)) key = key.toLowerCase();
                        parts.push(key);
                        const combo = parts.join('+');
                        
                        this.emit('KEYBOARD', {
                            originEvent: 'keydown',
                            consumed: ['keydown'],
                            context: 'Keyboard Context',
                            target: e.target,
                            key: combo,
                            startTime: Date.now()
                        });
                    }
                }
            }

            class InteractionCollector {
                constructor() {
                    this.recognizer = new InteractionRecognizer();
                }

                handle(e) {
                    if (!e.isTrusted) return;
                    
                    if (['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick'].includes(e.type)) {
                        this.recognizer.processPointerEvent(e);
                    } else if (['wheel', 'scroll'].includes(e.type)) {
                        this.recognizer.processScrollEvent(e);
                    } else if (['input'].includes(e.type)) {
                        this.recognizer.processInputEvent(e);
                    } else if (['keydown'].includes(e.type)) {
                        this.recognizer.processKeyboardEvent(e);
                    }
                }
            }

            window.interactionCollector = new InteractionCollector();

            const eventsToIntercept = ['click', 'dblclick', 'input', 'keydown', 'mousemove', 'mousedown', 'mouseup', 'wheel', 'scroll'];
            eventsToIntercept.forEach(event => {
                document.addEventListener(event, (e) => window.interactionCollector.handle(e), { capture: true, passive: true });
            });
            })();
        