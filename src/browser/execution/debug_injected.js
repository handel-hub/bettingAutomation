
            (() => {
            if (window.__locatorIntelligenceInjected) return;
            window.__locatorIntelligenceInjected = true;

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
            class FeatureFlagsRegistry {
    constructor() {
        this._flags = new Map();
        this._initialized = false;
        this.definitions = {
            LI_EXTENDED_FEATURES: { default: false, dependsOn: [], description: 'Enable extended feature extraction' },
            LI_IDENTITY_DOCUMENT: { default: false, dependsOn: ['LI_EXTENDED_FEATURES'], description: 'Enable EID generation and transmission' },
            LI_REMOVE_VALIDATOR: { default: false, dependsOn: [], description: 'Bypass CandidateValidator in pipeline' },
            LI_ADDITIVE_SCORING: { default: false, dependsOn: ['LI_REMOVE_VALIDATOR'], description: 'Use additive vector scoring model' },
            LI_SERIALIZE_FEATURES: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Include features/EID in serialized output' },
            LI_EPOCH_GATING: { default: false, dependsOn: [], description: 'Enable navigation epoch checks' },
            LI_BATCH_RESOLVER: { default: false, dependsOn: ['LI_SERIALIZE_FEATURES'], description: 'Use batch resolution via page.evaluate' },
            LI_DISAMBIGUATION: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable disambiguation engine for count>1' },
            LI_VERIFICATION: { default: false, dependsOn: ['LI_IDENTITY_DOCUMENT'], description: 'Enable post-resolution EID verification' },
            LI_CONFIDENCE_GATE: { default: false, dependsOn: ['LI_VERIFICATION', 'LI_DISAMBIGUATION'], description: 'Enable threshold-based execution gating' },
            LI_RECOVERY_HIERARCHY: { default: false, dependsOn: ['LI_CONFIDENCE_GATE'], description: 'Use tiered recovery instead of flat retry' },
            LI_RESOLUTION_MEMORY: { default: false, dependsOn: ['LI_VERIFICATION'], description: 'Enable resolution caching' },
            LI_SHADOW_MODE: { default: false, dependsOn: [], description: 'Run new pipeline in parallel with legacy for comparison' }
        };
        this.init();
    }

    init(overrides = {}) {
        const newFlags = new Map();
        
        // Load raw values from overrides, then process.env, then defaults
        for (const [name, def] of Object.entries(this.definitions)) {
            let val = def.default;
            if (name in overrides) {
                val = Boolean(overrides[name]);
            } else if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
                val = process.env[name] === 'true' || process.env[name] === '1';
            }
            newFlags.set(name, val);
        }

        // Validate dependencies iteratively
        let changed = true;
        while (changed) {
            changed = false;
            for (const [name, def] of Object.entries(this.definitions)) {
                if (newFlags.get(name)) {
                    for (const dep of def.dependsOn) {
                        if (!newFlags.get(dep)) {
                            if (typeof console !== 'undefined' && console.warn) {
                                console.warn(`[FeatureFlags] Disabling ${name} because dependency ${dep} is disabled.`);
                            }
                            newFlags.set(name, false);
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }

        this._flags = newFlags;
        this._initialized = true;
    }

    isEnabled(flagName) {
        if (!this._flags.has(flagName)) {
            return false;
        }
        return this._flags.get(flagName);
    }

    getAll() {
        return new Map(this._flags);
    }

    resetForTesting(overrides = {}) {
        this.init(overrides);
    }
}
const featureFlags = new FeatureFlagsRegistry();



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
        this.scoringVector = null; // Forward compatibility for Phase 4+ ScoringVector
        this.identityDocument = null; // Forward compatibility for Phase 1+ EID
        
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


function deepFreeze(obj) {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
        Object.freeze(obj);
        for (const key of Object.getOwnPropertyNames(obj)) {
            if (obj[key] && typeof obj[key] === 'object') {
                deepFreeze(obj[key]);
            }
        }
    }
    return obj;
}
class ElementIdentityDocument {
    constructor(data = {}) {
        this.version = data.version || '1.0.0';
        this.captureEpoch = data.captureEpoch !== undefined ? data.captureEpoch : Date.now();
        this.url = data.url || '';
        this.frameUrl = data.frameUrl || null;

        this.element = {
            tagName: data.element?.tagName || '',
            role: data.element?.role || null,
            type: data.element?.type || null,
            id: data.element?.id || null,
            name: data.element?.name || null,
            value: data.element?.value || null,
            href: data.element?.href || null,
            classes: Array.isArray(data.element?.classes) ? [...data.element.classes] : [],
            dataAttributes: { ...(data.element?.dataAttributes || {}) },
            ariaAttributes: { ...(data.element?.ariaAttributes || {}) }
        };

        this.text = {
            exact: data.text?.exact || '',
            normalized: data.text?.normalized || '',
            wordCount: data.text?.wordCount !== undefined ? data.text.wordCount : (data.text?.normalized ? data.text.normalized.split(/\s+/).filter(Boolean).length : 0),
            isNumeric: data.text?.isNumeric !== undefined ? data.text.isNumeric : /^\d+$/.test(data.text?.normalized || ''),
            isDynamic: data.text?.isDynamic !== undefined ? data.text.isDynamic : false
        };

        this.hierarchy = {
            depth: data.hierarchy?.depth !== undefined ? data.hierarchy.depth : 0,
            childCount: data.hierarchy?.childCount !== undefined ? data.hierarchy.childCount : 0,
            siblingIndex: data.hierarchy?.siblingIndex !== undefined ? data.hierarchy.siblingIndex : 0,
            siblingCount: data.hierarchy?.siblingCount !== undefined ? data.hierarchy.siblingCount : 0,
            ancestors: Array.isArray(data.hierarchy?.ancestors) ? data.hierarchy.ancestors.map(a => ({ ...a })) : [],
            siblings: Array.isArray(data.hierarchy?.siblings) ? data.hierarchy.siblings.map(s => ({ ...s })) : []
        };

        this.semantics = {
            landmark: data.semantics?.landmark || null,
            sectionHeading: data.semantics?.sectionHeading || null,
            componentRoot: data.semantics?.componentRoot || null
        };

        this.position = {
            viewportQuadrant: data.position?.viewportQuadrant || null,
            isSticky: data.position?.isSticky !== undefined ? data.position.isSticky : false,
            isFixed: data.position?.isFixed !== undefined ? data.position.isFixed : false,
            zIndex: data.position?.zIndex !== undefined ? data.position.zIndex : 0
        };

        this.state = {
            visible: data.state?.visible !== undefined ? data.state.visible : true,
            enabled: data.state?.enabled !== undefined ? data.state.enabled : true,
            editable: data.state?.editable !== undefined ? data.state.editable : false,
            checked: data.state?.checked !== undefined ? data.state.checked : null,
            expanded: data.state?.expanded !== undefined ? data.state.expanded : null
        };

        // Compute fingerprint hashes if not already provided
        const structuralHash = data.fingerprint?.structuralHash || ElementIdentityDocument.computeStructuralHash(this.hierarchy);
        const semanticHash = data.fingerprint?.semanticHash || ElementIdentityDocument.computeSemanticHash(this.element, this.semantics);
        const contentHash = data.fingerprint?.contentHash || ElementIdentityDocument.computeContentHash(this.text);

        this.fingerprint = {
            structuralHash,
            semanticHash,
            contentHash
        };

        this.identityHash = data.identityHash || ElementIdentityDocument.computeIdentityHash(structuralHash, semanticHash, contentHash);

        deepFreeze(this);
    }

    static computeFNV1a(str) {
        let hash = 0x811c9dc5;
        const len = str ? str.length : 0;
        for (let i = 0; i < len; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    static computeStructuralHash(hierarchy) {
        const ancestorsStr = (hierarchy.ancestors || [])
            .map(a => `${a.tagName || ''}#${a.id || ''}:${a.role || ''}`)
            .join('>');
        return ElementIdentityDocument.computeFNV1a(`${hierarchy.depth}|${hierarchy.siblingIndex}|${ancestorsStr}`);
    }

    static computeSemanticHash(element, semantics) {
        const str = `${element.role || ''}|${element.id || ''}|${element.name || ''}|${semantics.landmark || ''}|${semantics.componentRoot || ''}`;
        return ElementIdentityDocument.computeFNV1a(str);
    }

    static computeContentHash(text) {
        return ElementIdentityDocument.computeFNV1a(text.normalized || '');
    }

    static computeIdentityHash(structuralHash, semanticHash, contentHash) {
        return ElementIdentityDocument.computeFNV1a(`${structuralHash}:${semanticHash}:${contentHash}`);
    }

    serialize() {
        return {
            version: this.version,
            identityHash: this.identityHash,
            captureEpoch: this.captureEpoch,
            url: this.url,
            frameUrl: this.frameUrl,
            element: {
                ...this.element,
                classes: [...this.element.classes],
                dataAttributes: { ...this.element.dataAttributes },
                ariaAttributes: { ...this.element.ariaAttributes }
            },
            text: { ...this.text },
            hierarchy: {
                ...this.hierarchy,
                ancestors: this.hierarchy.ancestors.map(a => ({ ...a })),
                siblings: this.hierarchy.siblings.map(s => ({ ...s }))
            },
            semantics: { ...this.semantics },
            position: { ...this.position },
            state: { ...this.state },
            fingerprint: { ...this.fingerprint }
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data for ElementIdentityDocument deserialization');
        }
        return new ElementIdentityDocument(data);
    }
}



class ScoringVector {
    constructor(dimensions = {}, weights = null, breakdown = {}) {
        this.weights = weights ? { ...weights } : ScoringVector.getDefaultWeights();
        this.dimensions = {};
        for (const key of Object.keys(this.weights)) {
            this.dimensions[key] = this._clamp(dimensions[key] || 0);
        }
        for (const [key, val] of Object.entries(dimensions || {})) {
            if (!(key in this.dimensions)) {
                this.dimensions[key] = this._clamp(val);
            }
        }
        this.activeDimensions = new Set(Object.keys(dimensions || {}));

        this.breakdown = { ...breakdown };
        this.aggregateScore = 0.0;
        this.recalculate();
    }

    static getDefaultWeights() {
        return {
            uniqueness: 0.35,
            stability: 0.25,
            resilience: 0.20,
            performance: 0.10,
            specificity: 0.10
        };
    }

    _clamp(val) {
        const n = Number(val);
        if (isNaN(n)) return 0;
        return Math.max(0.0, Math.min(1.0, n));
    }

    setDimension(name, score, ruleName = '', explanation = '') {
        if (!(name in this.dimensions)) {
            return;
        }
        this.dimensions[name] = this._clamp(score);
        this.activeDimensions.add(name);
        if (ruleName) {
            this.breakdown[`${name}:${ruleName}`] = {
                action: 'SET',
                value: this.dimensions[name],
                explanation: explanation || `Set ${name} to ${this.dimensions[name]}`
            };
        }
        this.recalculate();
    }

    addBonus(dimension, amount, ruleName = '', explanation = '') {
        if (!(dimension in this.dimensions)) {
            return;
        }
        const prev = this.dimensions[dimension];
        this.dimensions[dimension] = this._clamp(prev + amount);
        this.activeDimensions.add(dimension);
        if (ruleName) {
            this.breakdown[`${dimension}:${ruleName}`] = {
                action: 'BONUS',
                amount,
                previous: prev,
                current: this.dimensions[dimension],
                explanation: explanation || `Added bonus +${amount} to ${dimension}`
            };
        }
        this.recalculate();
    }

    applyPenalty(dimension, amount, ruleName = '', explanation = '') {
        if (!(dimension in this.dimensions)) {
            return;
        }
        const prev = this.dimensions[dimension];
        this.dimensions[dimension] = this._clamp(prev - amount);
        this.activeDimensions.add(dimension);
        if (ruleName) {
            this.breakdown[`${dimension}:${ruleName}`] = {
                action: 'PENALTY',
                amount,
                previous: prev,
                current: this.dimensions[dimension],
                explanation: explanation || `Applied penalty -${amount} to ${dimension}`
            };
        }
        this.recalculate();
    }

    recalculate() {
        let total = 0.0;
        let weightSum = 0.0;
        for (const [dim, weight] of Object.entries(this.weights)) {
            if (this.activeDimensions && this.activeDimensions.size > 0 && !this.activeDimensions.has(dim)) {
                continue;
            }
            const val = this.dimensions[dim] || 0.0;
            total += val * weight;
            weightSum += weight;
        }
        // Normalize if weights don't sum to exactly 1.0
        const rawScore = weightSum > 0 ? total / weightSum : 0.0;
        this.aggregateScore = Number(this._clamp(rawScore).toFixed(4));
        return this.aggregateScore;
    }

    serialize() {
        return {
            dimensions: { ...this.dimensions },
            weights: { ...this.weights },
            aggregateScore: this.aggregateScore,
            breakdown: { ...this.breakdown }
        };
    }

    toBreakdown() {
        return { ...this.dimensions };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            return new ScoringVector();
        }
        const vec = new ScoringVector(data.dimensions, data.weights, data.breakdown);
        if (data.aggregateScore !== undefined) {
            vec.aggregateScore = Number(data.aggregateScore);
        }
        return vec;
    }
}



class PipelineContext {
    constructor(element, composedPath = [], config = {}) {
        this.element = element;
        this.composedPath = composedPath;
        this.config = config;
        this.features = null;
        this.identityDocument = null; // Forward compatibility for Phase 2+ EID
        this.candidates = []; // Array of LocatorCandidate
        this.metadata = {
            locatorVersion: 'v2',
            rankingVersion: 'v2',
            strategyVersion: 'v2',
            startTime: Date.now(),
            captureEpoch: Date.now() // Forward compatibility for Phase 5+ EpochGate
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
        const isElement = el && typeof el === 'object' && (
            (typeof Element !== 'undefined' && el instanceof Element) || 
            el.nodeType === 1 || 
            typeof el.getAttribute === 'function'
        );
        if (!isElement) {
            context.features = null;
            return;
        }
        
        const features = {
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : (Array.isArray(el.classList) ? el.classList.join(' ') : ''),
            tagName: (el.nodeName || el.tagName || '').toLowerCase(),
            text: '',
            dataOps: {},
            ariaLabel: (el.getAttribute && el.getAttribute('aria-label')) || '',
            role: (el.getAttribute && el.getAttribute('role')) || '',
            href: (el.getAttribute && el.getAttribute('href')) || '',
            src: (el.getAttribute && el.getAttribute('src')) || '',
            alt: (el.getAttribute && el.getAttribute('alt')) || '',
            placeholder: (el.getAttribute && el.getAttribute('placeholder')) || '',
            name: (el.getAttribute && el.getAttribute('name')) || '',
            type: (el.getAttribute && el.getAttribute('type')) || '',
            value: (el.value !== undefined ? String(el.value) : ((el.getAttribute && el.getAttribute('value')) || '')),
            rect: null,
            isIntersecting: true,
            isIframe: (el.nodeName || '').toLowerCase() === 'iframe',
            
            // Extended features for Phase 2+ EID Builder
            dataAttributes: {},
            ariaAttributes: {},
            ancestry: [],
            siblings: { siblingIndex: 0, siblingCount: 0, list: [] },
            landmark: null,
            sectionHeading: null,
            componentRoot: null,
            position: { viewportQuadrant: null, isSticky: false, isFixed: false, zIndex: 0 }
        };

        // Extract text carefully excluding scripts/styles
        let textContent = '';
        if (el.childNodes && el.childNodes.length > 0) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 || node.nodeName === '#text') { // TEXT_NODE
                    textContent += node.textContent || '';
                } else if (node.nodeType === 1 || (node.nodeName && !node.nodeName.startsWith('#'))) { // ELEMENT_NODE
                    const tag = (node.nodeName || '').toLowerCase();
                    if (tag !== 'script' && tag !== 'style') {
                        textContent += node.innerText || node.textContent || '';
                    }
                }
            }
        } else if (el.textContent || el.innerText) {
            textContent = el.innerText || el.textContent || '';
        }
        features.text = textContent.trim().replace(/\s+/g, ' ');

        // Extract attributes (both data-op legacy and all data-*/aria-*)
        if (el.attributes || el._attributes || typeof el.getAttribute === 'function') {
            const legacyDataAttrs = ['data-op', 'data-testid', 'data-id', 'data-action'];
            for (const attr of legacyDataAttrs) {
                const val = el.getAttribute ? el.getAttribute(attr) : null;
                if (val) features.dataOps[attr] = val;
            }

            if (el.attributes && (Array.isArray(el.attributes) || typeof el.attributes[Symbol.iterator] === 'function' || el.attributes.length !== undefined)) {
                const attrs = Array.isArray(el.attributes) ? el.attributes : Array.from(el.attributes);
                for (const attr of attrs) {
                    const name = (attr.name || attr.nodeName || '').toLowerCase();
                    const val = attr.value !== undefined ? attr.value : (attr.nodeValue || '');
                    if (name.startsWith('data-')) {
                        features.dataAttributes[name] = String(val);
                    } else if (name.startsWith('aria-')) {
                        features.ariaAttributes[name] = String(val);
                    }
                }
            } else if (el._attributes || el.attributesMap) {
                const mockAttrs = el._attributes || el.attributesMap || {};
                const entries = typeof mockAttrs.entries === 'function' ? mockAttrs.entries() : Object.entries(mockAttrs);
                for (const [name, val] of entries) {
                    const lowerName = String(name).toLowerCase();
                    if (lowerName.startsWith('data-')) {
                        features.dataAttributes[lowerName] = String(val);
                    } else if (lowerName.startsWith('aria-')) {
                        features.ariaAttributes[lowerName] = String(val);
                    }
                }
            }
        }

        try {
            if (typeof el.getBoundingClientRect === 'function') {
                features.rect = el.getBoundingClientRect();
                features.isIntersecting = (features.rect.width > 0 && features.rect.height > 0);
            }
        } catch (e) {}

        // Populate extended features
        features.ancestry = this._extractAncestry(el, context.composedPath);
        features.siblings = this._extractSiblings(el);
        features.landmark = this._extractLandmark(el, features.ancestry);
        features.sectionHeading = this._extractSectionHeading(el, features.ancestry);
        features.componentRoot = this._extractComponentRoot(el, features.ancestry);
        features.position = this._extractPosition(el, features.rect);

        context.features = features;
    }

    _extractAncestry(el, composedPath) {
        const ancestry = [];
        let current = null;

        if (Array.isArray(composedPath) && composedPath.length > 1) {
            // composedPath[0] is typically el itself
            for (let i = 1; i < composedPath.length && ancestry.length < 10; i++) {
                const node = composedPath[i];
                if (!node || (node.nodeType !== 1 && node !== el.parentElement && node !== el.parentNode && !node.tagName && !node.nodeName)) continue;
                if ((typeof window !== 'undefined' && node === window) || (typeof document !== 'undefined' && node === document)) break;
                
                const tag = (node.nodeName || node.tagName || '').toLowerCase();
                if (!tag || tag.startsWith('#')) continue;

                ancestry.push({
                    tagName: tag.toUpperCase(),
                    id: node.id || null,
                    classes: typeof node.className === 'string' && node.className ? node.className.split(/\s+/).filter(Boolean) : (Array.isArray(node.classList) ? [...node.classList] : []),
                    role: (node.getAttribute && node.getAttribute('role')) || null,
                    testId: (node.getAttribute && node.getAttribute('data-testid')) || null
                });
            }
        } else {
            current = el.parentElement || el.parentNode;
            while (current && ancestry.length < 10) {
                const tag = (current.nodeName || current.tagName || '').toLowerCase();
                if (!tag || tag.startsWith('#') || tag === 'document' || tag === 'window') break;

                ancestry.push({
                    tagName: tag.toUpperCase(),
                    id: current.id || null,
                    classes: typeof current.className === 'string' && current.className ? current.className.split(/\s+/).filter(Boolean) : (Array.isArray(current.classList) ? [...current.classList] : []),
                    role: (current.getAttribute && current.getAttribute('role')) || null,
                    testId: (current.getAttribute && current.getAttribute('data-testid')) || null
                });
                current = current.parentElement || current.parentNode;
            }
        }
        return ancestry;
    }

    _extractSiblings(el) {
        const parent = el.parentElement || el.parentNode;
        if (!parent) {
            return { siblingIndex: 0, siblingCount: 1, list: [] };
        }

        const rawChildren = parent.children ? Array.from(parent.children) : (parent.childNodes ? Array.from(parent.childNodes) : []);
        const children = rawChildren.filter(n => {
            if (n === el || n.nodeType === 1) return true;
            const tag = (n.nodeName || n.tagName || '').toLowerCase();
            return tag && !tag.startsWith('#');
        });
        
        let index = children.indexOf(el);
        if (index === -1) index = 0;

        const list = [];
        for (let i = 0; i < children.length; i++) {
            if (i === index) continue;
            const c = children[i];
            const tag = (c.nodeName || c.tagName || '').toLowerCase();
            if (!tag || tag.startsWith('#')) continue;

            list.push({
                tagName: tag.toUpperCase(),
                text: ((c.innerText || c.textContent || '').trim()).substring(0, 50),
                role: (c.getAttribute && c.getAttribute('role')) || null,
                id: c.id || null,
                classes: typeof c.className === 'string' && c.className ? c.className.split(/\s+/).filter(Boolean) : (Array.isArray(c.classList) ? [...c.classList] : [])
            });
            if (list.length >= 10) break;
        }

        return {
            siblingIndex: index,
            siblingCount: children.length,
            list
        };
    }

    _extractLandmark(el, ancestry) {
        const landmarkRoles = ['main', 'nav', 'header', 'footer', 'aside', 'section', 'region', 'form', 'search', 'banner', 'contentinfo'];
        const landmarkTags = ['main', 'nav', 'header', 'footer', 'aside', 'section', 'form'];

        const elRole = (el.getAttribute && el.getAttribute('role')) || '';
        const elTag = (el.nodeName || el.tagName || '').toLowerCase();
        if (landmarkRoles.includes(elRole)) return elRole;
        if (landmarkTags.includes(elTag)) return elTag;

        for (const a of ancestry) {
            if (a.role && landmarkRoles.includes(a.role.toLowerCase())) return a.role.toLowerCase();
            if (a.tagName && landmarkTags.includes(a.tagName.toLowerCase())) return a.tagName.toLowerCase();
        }
        return null;
    }

    _extractSectionHeading(el, ancestry) {
        // Simple heuristic: check parent/ancestor siblings or previous elements for H1-H6
        let current = el;
        while (current) {
            let prev = current.previousElementSibling || current.previousSibling;
            while (prev) {
                const tag = (prev.nodeName || prev.tagName || '').toUpperCase();
                if (/^H[1-6]$/.test(tag)) {
                    const text = (prev.innerText || prev.textContent || '').trim();
                    if (text) return text.substring(0, 60);
                }
                prev = prev.previousElementSibling || prev.previousSibling;
            }
            current = current.parentElement || current.parentNode;
            if (!current || (current.nodeName || '').toLowerCase() === 'body') break;
        }
        return null;
    }

    _extractComponentRoot(el, ancestry) {
        const checkNode = (node) => {
            if (!node) return null;
            if (node.getAttribute && typeof node.getAttribute === 'function') {
                const comp = node.getAttribute('data-component') || node.getAttribute('data-root');
                if (comp) return comp;
            }
            const tag = (node.tagName || node.nodeName || '').toLowerCase();
            if (tag.includes('-')) return tag;

            // React/Vue internal root detection on DOM node
            for (const key of Object.keys(node)) {
                if (key.startsWith('__reactFiber$') || key.startsWith('__vue__') || key.startsWith('_reactRootContainer')) {
                    if (node.id) return `${tag}#${node.id}`;
                    if (node.getAttribute && node.getAttribute('data-testid')) return node.getAttribute('data-testid');
                    return tag || 'ReactRoot';
                }
            }
            return null;
        };

        const resEl = checkNode(el);
        if (resEl) return resEl;

        for (const a of ancestry) {
            if (a.testId && a.testId.toLowerCase().includes('root')) return a.testId;
            if (a.tagName && a.tagName.toLowerCase().includes('-')) return a.tagName.toLowerCase();
        }
        return null;
    }

    _extractPosition(el, rect) {
        const pos = { viewportQuadrant: 'TOP_LEFT', isSticky: false, isFixed: false, zIndex: 0 };
        
        const width = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1920;
        const height = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 1080;

        if (rect && typeof rect === 'object') {
            const midX = (rect.left || 0) + (rect.width || 0) / 2;
            const midY = (rect.top || 0) + (rect.height || 0) / 2;
            const isTop = midY < height / 2;
            const isLeft = midX < width / 2;
            pos.viewportQuadrant = `${isTop ? 'TOP' : 'BOTTOM'}_${isLeft ? 'LEFT' : 'RIGHT'}`;
        }

        try {
            if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
                const style = window.getComputedStyle(el);
                if (style) {
                    pos.isSticky = style.position === 'sticky';
                    pos.isFixed = style.position === 'fixed';
                    const z = parseInt(style.zIndex, 10);
                    if (!isNaN(z)) pos.zIndex = z;
                }
            } else if (el.style) {
                pos.isSticky = el.style.position === 'sticky';
                pos.isFixed = el.style.position === 'fixed';
                const z = parseInt(el.style.zIndex, 10);
                if (!isNaN(z)) pos.zIndex = z;
            }
        } catch (e) {}

        return pos;
    }
}





class IdentityDocumentBuilder extends PipelineStep {
    constructor() {
        super('IdentityDocumentBuilder');
    }

    execute(context) {
        const f = context.features;
        if (!f) {
            context.identityDocument = null;
            return;
        }

        const rawData = {
            version: '1.0.0',
            captureEpoch: context.metadata ? (context.metadata.captureEpoch || context.metadata.startTime || Date.now()) : Date.now(),
            url: typeof window !== 'undefined' && window.location ? window.location.href : (context.metadata?.url || ''),
            frameUrl: f.isIframe ? (f.src || null) : null,
            element: {
                tagName: (f.tagName || '').toUpperCase(),
                role: f.role || null,
                type: f.type || null,
                id: f.id || null,
                name: f.name || null,
                value: f.value || null,
                href: f.href || null,
                classes: typeof f.className === 'string' && f.className ? f.className.split(/\s+/).filter(Boolean) : [],
                dataAttributes: { ...(f.dataAttributes || {}) },
                ariaAttributes: { ...(f.ariaAttributes || {}) }
            },
            text: {
                exact: f.text || '',
                normalized: (f.text || '').toLowerCase().trim(),
                wordCount: (f.text || '').split(/\s+/).filter(Boolean).length,
                isNumeric: /^\d+$/.test((f.text || '').trim()),
                isDynamic: false
            },
            hierarchy: {
                depth: f.ancestry ? f.ancestry.length : 0,
                childCount: f.siblings ? Math.max(0, f.siblings.siblingCount - 1) : 0,
                siblingIndex: f.siblings ? f.siblings.siblingIndex : 0,
                siblingCount: f.siblings ? f.siblings.siblingCount : 0,
                ancestors: f.ancestry ? f.ancestry.map(a => ({ ...a })) : [],
                siblings: f.siblings && f.siblings.list ? f.siblings.list.map(s => ({ ...s })) : []
            },
            semantics: {
                landmark: f.landmark || null,
                sectionHeading: f.sectionHeading || null,
                componentRoot: f.componentRoot || null
            },
            position: {
                viewportQuadrant: f.position?.viewportQuadrant || null,
                isSticky: Boolean(f.position?.isSticky),
                isFixed: Boolean(f.position?.isFixed),
                zIndex: Number(f.position?.zIndex) || 0
            },
            state: {
                visible: f.rect ? (f.rect.width > 0 && f.rect.height > 0) : Boolean(f.isIntersecting),
                enabled: !context.element || !context.element.disabled,
                editable: Boolean(context.element && (context.element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes((f.tagName || '').toUpperCase()))),
                checked: context.element && context.element.checked !== undefined ? Boolean(context.element.checked) : null,
                expanded: f.ariaAttributes && f.ariaAttributes['aria-expanded'] !== undefined ? f.ariaAttributes['aria-expanded'] === 'true' : null
            }
        };

        // Merge legacy dataOps into dataAttributes if not already present
        if (f.dataOps) {
            for (const [k, v] of Object.entries(f.dataOps)) {
                if (!rawData.element.dataAttributes[k]) {
                    rawData.element.dataAttributes[k] = v;
                }
            }
        }

        const doc = new ElementIdentityDocument(rawData);
        context.identityDocument = doc;
    }
}




class DataAttributeStrategy {
    static generate(el, features) {
        let candidates = [];
        for (const [attr, val] of Object.entries(features.dataOps)) {
            const escapedVal = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(val) : val;
            candidates.push(new LocatorCandidate({
                strategy: 'DataAttributeStrategy',
                locator: '[' + attr + '="' + escapedVal + '"]',
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
            const escapedVal = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(features.ariaLabel) : features.ariaLabel;
            return [new LocatorCandidate({
                strategy: 'AriaStrategy',
                locator: '[aria-label="' + escapedVal + '"]',
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
            const escapedRole = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(features.role) : features.role;
            let loc = 'role=' + escapedRole;
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
            const escapeFn = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape : (str => str);
            const selector = features.tagName + '.' + classes.map(c => escapeFn(c)).join('.');
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
        const docRef = typeof document !== 'undefined' ? document : null;
        
        while (current && current !== docRef) {
            const className = (typeof current.className === 'string') ? current.className : '';
            const id = (typeof current.id === 'string') ? current.id : '';
            if (adRegex.test(className) || adRegex.test(id)) { isBad = true; break; }
            current = current.parentNode;
        }
        if (isBad) return [];
        
        let path = [];
        current = el;
        let depth = 0;
        const elemNodeType = typeof Node !== 'undefined' && Node.ELEMENT_NODE ? Node.ELEMENT_NODE : 1;
        const escapeFn = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape : (str => str);

        while (current && (current.nodeType === elemNodeType || current.tagName) && depth < 10) {
            let selector = (current.nodeName || current.tagName || '').toLowerCase();
            if (!selector) break;
            if (current.id && !/\d+/.test(current.id)) {
                selector += '#' + escapeFn(current.id);
                path.unshift(selector);
                break;
            } else {
                let sib = current, nth = 1;
                while (sib = (sib.previousElementSibling || null)) {
                    if ((sib.nodeName || sib.tagName || '').toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            current = current.parentNode || current.parentElement;
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
        if (featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) {
            if (context.candidates) {
                for (const candidate of context.candidates) {
                    candidate.validation = { status: 'SKIPPED', matchCount: -1 };
                }
            }
            return;
        }
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
                    const matches = typeof document !== 'undefined' ? document.querySelectorAll(candidate.locator) : [];
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



class NormalizedBaseScoreRule extends RankingRule {
    constructor() {
        super('NormalizedBaseScoreRule');
    }

    evaluate(candidate, context) {
        let score = 0.10;
        switch (candidate.strategy) {
            case 'DataAttributeStrategy': score = 1.0; break;
            case 'RoleStrategy': score = 0.80; break;
            case 'AriaStrategy': score = 0.70; break;
            case 'TextStrategy': score = 0.60; break;
            case 'SemanticClassStrategy': score = 0.50; break;
            case 'StructuralStrategy': score = 0.30; break;
            default: score = 0.10; break;
        }
        return {
            dimension: 'strategyReliability',
            score,
            reason: `Strategy ${candidate.strategy} has reliability ${score}`
        };
    }
}




class NormalizedStructuralRule extends RankingRule {
    constructor() {
        super('NormalizedStructuralRule');
    }

    evaluate(candidate, context) {
        let score = 1.0;
        const structScore = candidate.structural?.score;
        
        if (structScore === 'HIGH') score = 1.0;
        else if (structScore === 'MEDIUM') score = 0.9;
        else if (structScore === 'LOW') score = 0.5;
        
        return {
            dimension: 'structuralStability',
            score,
            reason: `Structural stability is ${structScore || 'default'} (${score})`
        };
    }
}





class NormalizedUUIDDetector {
    static detect(str) {
        return /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(str) ? 30 : 0;
    }
}

class NormalizedTimestampDetector {
    static detect(str) {
        return (/\d{1,2}:\d{2}/.test(str) || /\d{4}-\d{2}-\d{2}/.test(str)) ? 20 : 0;
    }
}

class NormalizedFrameworkHashDetector {
    static detect(str) {
        return (/-[0-9]{3,}$|_[0-9]{3,}$/.test(str)) ? 20 : 0;
    }
}

class NormalizedHexBase64Detector {
    static detect(str) {
        return (/[0-9a-zA-Z\-_]{16,}/.test(str) && !str.includes(' ')) ? 15 : 0;
    }
}

class NormalizedCurrencyDetector {
    static detect(str) {
        return (/^\$?\d+\.\d{2}$/.test(str.trim())) ? 5 : 0;
    }
}
class NormalizedDynamicContentRule extends RankingRule {
    constructor() {
        super('NormalizedDynamicContentRule');
        this.detectors = [
            NormalizedUUIDDetector,
            NormalizedTimestampDetector,
            NormalizedFrameworkHashDetector,
            NormalizedHexBase64Detector,
            NormalizedCurrencyDetector
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
        
        let score = 1.0;
        if (penaltyScore >= 30) score = 0.2;
        else if (penaltyScore >= 20) score = 0.4;
        else if (penaltyScore >= 15) score = 0.6;
        else if (penaltyScore >= 10) score = 0.8;
        else if (penaltyScore >= 5) score = 0.9;
        
        return {
            dimension: 'dynamicContentRisk',
            score,
            reason: `Dynamic content penalty score ${penaltyScore} mapped to inverted risk ${score}`
        };
    }
}




class NormalizedSpecificityRule extends RankingRule {
    constructor() {
        super('NormalizedSpecificityRule');
    }

    evaluate(candidate, context) {
        let specificityScore = 0;
        const loc = candidate.locator || '';
        
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        const ids = (strippedLoc.match(/#/g) || []).length;
        specificityScore += ids * 100;
        
        const classes = (strippedLoc.match(/\./g) || []).length;
        const attrs = (strippedLoc.match(/\[/g) || []).length;
        const pseudos = (strippedLoc.match(/:[a-zA-Z-]/g) || []).length;
        specificityScore += (classes + attrs + pseudos) * 10;
        
        const tags = (strippedLoc.match(/(^|[\s>+~])([a-zA-Z0-9_-]+)(?=[#\.\[:]|\s|$)/g) || [])
                     .filter(t => !['text', 'role', 'css', 'xpath'].includes(t.trim())).length;
        specificityScore += tags * 1;
        
        if (loc.startsWith('role=')) specificityScore += 15;
        if (loc.startsWith('text=') || loc.startsWith('internal:text=')) specificityScore += 5;
        
        let score = 0.3;
        if (specificityScore >= 100) score = 1.0;
        else if (specificityScore >= 30) score = 0.8;
        else if (specificityScore >= 20) score = 0.7;
        else if (specificityScore >= 10) score = 0.6;
        else if (specificityScore > 0) score = 0.5;
        
        return {
            dimension: 'specificity',
            score,
            reason: `Specificity score ${specificityScore} mapped to normalized score ${score}`
        };
    }
}




class NormalizedCorroborationRule extends RankingRule {
    constructor() {
        super('NormalizedCorroborationRule');
    }

    evaluate(candidate, context) {
        const count = candidate.generatedBy ? candidate.generatedBy.length : 1;
        let score = 0.5;
        
        if (count >= 3) score = 1.0;
        else if (count === 2) score = 0.8;
        else score = 0.5;
        
        return {
            dimension: 'corroboration',
            score,
            reason: `Corroborated by ${count} strategy/strategies (${score})`
        };
    }
}




class NormalizedVisibilityRule extends RankingRule {
    constructor() {
        super('NormalizedVisibilityRule');
    }

    evaluate(candidate, context) {
        let score = 1.0;
        if (candidate.features && candidate.features.isIntersecting === false) {
            score = 0.5;
        }
        
        return {
            dimension: 'visibility',
            score,
            reason: `Element visibility is ${score === 1.0 ? 'visible' : 'hidden'} (${score})`
        };
    }
}












class RankingConfig {
    static getRules() {
        const removeValidator = featureFlags.isEnabled('LI_REMOVE_VALIDATOR');
        return [
            { rule: new BaseScoreRule(), enabled: true, priority: 100 },
            { rule: new DynamicContentRule(), enabled: true, priority: 90 },
            { rule: new ValidationConfidenceRule(), enabled: !removeValidator, priority: 80 },
            { rule: new SpecificityRule(), enabled: true, priority: 70 },
            { rule: new ComplexityRule(), enabled: true, priority: 60 },
            { rule: new StructuralRule(), enabled: true, priority: 50 },
            { rule: new VisibilityRule(), enabled: true, priority: 40 },
            { rule: new CorroborationRule(), enabled: true, priority: 30 }
        ];
    }
}


class ScoringWeights {
    constructor(overrides = {}) {
        const defaults = {
            strategyReliability: 0.30,
            structuralStability: 0.15,
            dynamicContentRisk: 0.15,
            specificity: 0.10,
            corroboration: 0.15,
            visibility: 0.05,
            contextSimilarity: 0.10
        };

        this._weights = { ...defaults, ...overrides };

        let sum = 0;
        for (const val of Object.values(this._weights)) {
            sum += Number(val) || 0;
        }

        if (Math.abs(sum - 1.0) > 0.001) {
            throw new Error(`[ScoringWeights] Dimension weights must sum to 1.0 (got ${sum.toFixed(4)})`);
        }
    }

    get(dimension) {
        return this._weights[dimension] !== undefined ? this._weights[dimension] : 0.0;
    }

    toMap() {
        return { ...this._weights };
    }
}







class RankingEngine extends PipelineStep {
    constructor() {
        super('RankingEngine');
        this.configRules = RankingConfig.getRules();
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        const removeValidator = featureFlags.isEnabled('LI_REMOVE_VALIDATOR');
        const activeRules = RankingConfig.getRules()
            .filter(r => r.enabled && (!removeValidator || r.rule.name !== 'ValidationConfidenceRule'))
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












class AdditiveRankingEngine extends PipelineStep {
    constructor(weights = null) {
        super('AdditiveRankingEngine');
        this.weights = weights || new ScoringWeights();
        this.rules = [
            new NormalizedBaseScoreRule(),
            new NormalizedStructuralRule(),
            new NormalizedDynamicContentRule(),
            new NormalizedSpecificityRule(),
            new NormalizedCorroborationRule(),
            new NormalizedVisibilityRule()
        ];
    }

    execute(context) {
        if (!context.candidates || context.candidates.length === 0) return;

        for (const candidate of context.candidates) {
            const vector = this._evaluateRules(candidate, context);
            candidate.ranking = candidate.ranking || {};
            candidate.ranking.scoringVector = vector;
            candidate.ranking.finalScore = vector.aggregateScore;
            candidate.ranking.scoreBreakdown = vector.breakdown;
            candidate.telemetry = candidate.telemetry || {};
            candidate.telemetry.rankedAt = Date.now();
        }

        context.candidates.sort((a, b) => this._resolveTies(a, b));

        context.candidates.forEach((c, index) => {
            c.rank = index + 1;
        });

        TelemetryCollector.recordRanking({ candidates: context.candidates });
    }

    _evaluateRules(candidate, context) {
        const dimensions = {};
        const breakdown = {};

        for (const rule of this.rules) {
            try {
                const result = rule.evaluate(candidate, context);
                if (result && result.dimension) {
                    dimensions[result.dimension] = result.score;
                    breakdown[rule.name] = result.score;
                    const legacyName = rule.name.replace('Normalized', '');
                    breakdown[legacyName] = result.score;
                }
            } catch (e) {
                console.warn(`[AdditiveRankingEngine] Rule ${rule.name} failed:`, e);
            }
        }

        return new ScoringVector(dimensions, this.weights.toMap(), breakdown);
    }

    _resolveTies(a, b) {
        if (Math.abs(b.ranking.finalScore - a.ranking.finalScore) > 0.0001) {
            return b.ranking.finalScore - a.ranking.finalScore;
        }

        const stratA = a.ranking.scoringVector?.dimensions.strategyReliability || 0;
        const stratB = b.ranking.scoringVector?.dimensions.strategyReliability || 0;
        if (Math.abs(stratB - stratA) > 0.0001) {
            return stratB - stratA;
        }

        const structA = a.ranking.scoringVector?.dimensions.structuralStability || 0;
        const structB = b.ranking.scoringVector?.dimensions.structuralStability || 0;
        if (Math.abs(structB - structA) > 0.0001) {
            return structB - structA;
        }

        const corrA = a.ranking.scoringVector?.dimensions.corroboration || 0;
        const corrB = b.ranking.scoringVector?.dimensions.corroboration || 0;
        if (Math.abs(corrB - corrA) > 0.0001) {
            return corrB - corrA;
        }

        const priorityMap = {
            'DataAttributeStrategy': 6,
            'RoleStrategy': 5,
            'AriaStrategy': 4,
            'TextStrategy': 3,
            'SemanticClassStrategy': 2,
            'StructuralStrategy': 1
        };
        const prioA = priorityMap[a.strategy] || 0;
        const prioB = priorityMap[b.strategy] || 0;
        if (prioB !== prioA) {
            return prioB - prioA;
        }

        const lenA = (a.locator || '').length;
        const lenB = (b.locator || '').length;
        if (lenA !== lenB) {
            return lenA - lenB;
        }

        const locA = a.locator || '';
        const locB = b.locator || '';
        if (locA < locB) return -1;
        if (locA > locB) return 1;
        return 0;
    }
}





class LocatorSerializer extends PipelineStep {
    constructor() {
        super('LocatorSerializer');
    }

    execute(context) {
        const candidates = context.candidates || [];
        const serializeFeatures = featureFlags.isEnabled('LI_SERIALIZE_FEATURES');
        
        let shadowPath = [];
        if (context.composedPath && Array.isArray(context.composedPath)) {
            for (let i = 0; i < context.composedPath.length; i++) {
                const node = context.composedPath[i];
                if (node && node.nodeType === 11) { // ShadowRoot
                    const host = node.host || context.composedPath[i + 1];
                    if (host && host.nodeType === 1) {
                        let selector = host.nodeName.toLowerCase();
                        if (host.id && !/\d+/.test(host.id)) {
                            selector += '#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(host.id) : host.id);
                        }
                        shadowPath.unshift(selector);
                    }
                }
            }
        }
        
        context.output = {
            shadowPath,
            identityDocument: context.identityDocument ? (typeof context.identityDocument.serialize === 'function' ? context.identityDocument.serialize() : context.identityDocument) : null,
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
                    scoringVector: (serializeFeatures && c.ranking.scoringVector) ? (typeof c.ranking.scoringVector.toBreakdown === 'function' ? c.ranking.scoringVector.toBreakdown() : c.ranking.scoringVector.dimensions) : undefined,
                    scoreBreakdown: context.config?.debug ? c.ranking.scoreBreakdown : undefined
                },
                telemetry: context.config?.debug ? c.telemetry : undefined
            })),
            metadata: {
                ...context.metadata,
                captureEpoch: context.navigationEpoch ?? context.metadata?.captureEpoch ?? 0,
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

        // Phase 2: EID Metrics
        this.extraction = {
            eidTime: new RollingWindow(128)
        };

        // Phase 6: Batch Resolution Metrics
        this.batch = {
            evaluationTime: new RollingWindow(128),
            candidateCount: new RollingWindow(128),
            roundTrips: new RollingWindow(128)
        };

        // Phase 7: Disambiguation & Verification
        this.disambiguation = {
            triggered: 0,
            failed: 0
        };
        this.verification = {
            passed: 0,
            failed: 0,
            similarityScore: new RollingWindow(128)
        };

        // Phase 8: Confidence Gate Metrics
        this.confidence = {
            ACCEPT: 0,
            REJECT: 0,
            TENTATIVE: 0
        };

        // Phase 9: Recovery Hierarchy
        this.recovery = {
            L1_RETRY: 0,
            L2_WAIT: 0,
            L3_SKIP: 0,
            L4_RELOAD: 0
        };

        // Phase 11: Resolution Memory
        this.memory = {
            hits: 0,
            misses: 0
        };

        // Failure Metrics (Map of LF Code -> Count)
        this.failures = new Map();

        // Execution Metrics (Hooks for ActionSimulator)
        this.execution = {
            total: 0,
            retries: new RollingWindow(128),
            resolverCycles: new RollingWindow(128),
            candidateExhaustion: new RollingWindow(128),
            confidenceDecay: new RollingWindow(128),
            epochSkips: 0
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
            extraction: {
                averageEidTime: this.extraction.eidTime.average
            },
            batch: {
                averageEvaluationTime: this.batch.evaluationTime.average,
                averageCandidateCount: this.batch.candidateCount.average,
                averageRoundTrips: this.batch.roundTrips.average
            },
            disambiguation: { ...this.disambiguation },
            verification: {
                passed: this.verification.passed,
                failed: this.verification.failed,
                averageSimilarityScore: this.verification.similarityScore.average
            },
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
            confidence: { ...this.confidence },
            recovery: { ...this.recovery },
            memory: { ...this.memory },
            failures: Object.fromEntries(this.failures),
            execution: {
                total: this.execution.total,
                averageRetries: this.execution.retries.average,
                averageResolverCycles: this.execution.resolverCycles.average,
                averageCandidateExhaustion: this.execution.candidateExhaustion.average,
                averageConfidenceDecay: this.execution.confidenceDecay.average,
                epochSkips: this.execution.epochSkips
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
            if (featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) return;
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

    /**
     * Records telemetry from EID Extraction.
     */
    recordEIDExtraction(durationMs) {
        try {
            if (typeof durationMs === 'number') {
                this.registry.extraction.eidTime.push(durationMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from BatchResolver.
     */
    recordBatchResolution(durationMs, candidateCount, roundTrips = 1) {
        try {
            if (typeof durationMs === 'number') this.registry.batch.evaluationTime.push(durationMs);
            if (typeof candidateCount === 'number') this.registry.batch.candidateCount.push(candidateCount);
            if (typeof roundTrips === 'number') this.registry.batch.roundTrips.push(roundTrips);
        } catch (e) {}
    }

    /**
     * Records telemetry from DisambiguationEngine.
     */
    recordDisambiguation(success) {
        try {
            if (success) {
                this.registry.disambiguation.triggered++;
            } else {
                this.registry.disambiguation.failed++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from VerificationEngine.
     */
    recordVerification(success, similarityScore = 0) {
        try {
            if (success) {
                this.registry.verification.passed++;
            } else {
                this.registry.verification.failed++;
            }
            if (typeof similarityScore === 'number') {
                this.registry.verification.similarityScore.push(similarityScore);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from RecoveryOrchestrator.
     */
    recordRecovery(level) {
        try {
            const levelKey = `L${level}`;
            const keyMap = { 'L1': 'L1_RETRY', 'L2': 'L2_WAIT', 'L3': 'L3_SKIP', 'L4': 'L4_RELOAD' };
            const mapped = keyMap[levelKey];
            if (mapped && this.registry.recovery[mapped] !== undefined) {
                this.registry.recovery[mapped]++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from ResolutionMemory.
     */
    recordMemory(hit) {
        try {
            if (hit) {
                this.registry.memory.hits++;
            } else {
                this.registry.memory.misses++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from StaleEpoch aborts.
     */
    recordEpochSkip() {
        try {
            this.registry.execution.epochSkips++;
        } catch (e) {}
    }

    /**
     * Records telemetry from the ConfidenceGate.
     * @param {object} decision - ConfidenceDecision object
     */
    recordConfidenceGateDecision(decision) {
        try {
            if (!decision || !decision.decision) return;
            if (this.registry.confidence && this.registry.confidence[decision.decision] !== undefined) {
                this.registry.confidence[decision.decision]++;
            }
        } catch (e) {
            // Passive
        }
    }
}
const TelemetryCollector = new TelemetryCollectorImpl();













class LocatorIntelligenceEngine {
    constructor(config = {}) {
        this.config = config;
        this.rankingEngine = new RankingEngine();
        this.additiveRankingEngine = new AdditiveRankingEngine();
        this.pipeline = [
            new FeatureExtractor(),
            new IdentityDocumentBuilder(),
            new CandidateGenerator(),
            new CandidateDeduplicator(),
            new CandidateValidator(),
            new StructuralAnalyzer(),
            this.rankingEngine,
            new LocatorSerializer()
        ];
    }

    process(el, composedPath, config = {}) {
        const mergedConfig = { ...this.config, ...config };
        const context = new PipelineContext(el, composedPath, mergedConfig);
        if (context.metadata) {
            context.metadata.flags = featureFlags.getAll();
        }
        
        for (const step of this.pipeline) {
            const stepStart = Date.now();
            if (step.name === 'CandidateValidator' && featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) {
                if (context.candidates) {
                    for (const candidate of context.candidates) {
                        candidate.validation = { status: 'SKIPPED', matchCount: -1 };
                    }
                }
                continue;
            }

            let currentStep = step;
            if (step.name === 'RankingEngine' && featureFlags.isEnabled('LI_ADDITIVE_SCORING')) {
                currentStep = this.additiveRankingEngine;
            }
            
            try {
                currentStep.execute(context);
            } catch (e) {
                console.warn(`[LocatorIntelligence] Pipeline step ${currentStep.name} failed:`, e);
            }
            
            context.telemetry.stages[currentStep.name] = Date.now() - stepStart;
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
                    this.pointerData = { path: [], startTarget: null, composedPath: [], clickTimeout: null, consumed: [], startTime: 0 };
                    
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
                        const resolution = engine.process(data.target, data.composedPath || []);
                        if (resolution) {
                            payload.locators = resolution.locators;
                            payload.locatorMetadata = resolution.metadata;
                            payload.shadowPath = resolution.shadowPath;
                            payload.identityDocument = resolution.identityDocument || null;
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
                    this.pointerData = { path: [], startTarget: null, composedPath: [], clickTimeout: null, consumed: [], startTime: 0 };
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
                        this.pointerData.startTarget = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                        this.pointerData.composedPath = e.composedPath ? e.composedPath() : [];
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
                                composedPath: this.pointerData.composedPath,
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
                                    composedPath: this.pointerData.composedPath,
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
                            if (!this.pointerData.startTarget) {
                                this.pointerData.startTarget = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                                this.pointerData.composedPath = e.composedPath ? e.composedPath() : [];
                            }
                            if (this.pointerData.path.length === 0) this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            if (!this.pointerData.startTime) this.pointerData.startTime = now;

                            // IMMEDIATE EMIT - Zero Latency Click
                            this.emit('CLICK', {
                                originEvent: 'click',
                                consumed: this.pointerData.consumed,
                                context: 'Pointer Context',
                                target: this.pointerData.startTarget,
                                composedPath: this.pointerData.composedPath,
                                coordinates: this.pointerData.path[0],
                                startTime: this.pointerData.startTime
                            });
                            this.flushPointer();
                        }
                    }
                    else if (type === 'dblclick') {
                        this.pointerData.consumed.push(type);
                        if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                        
                        this.emit('DOUBLE_CLICK', {
                            originEvent: 'dblclick',
                            consumed: this.pointerData.consumed,
                            context: 'Pointer Context',
                            target: this.pointerData.startTarget || ((e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target),
                            composedPath: this.pointerData.composedPath || (e.composedPath ? e.composedPath() : []),
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
                        this.inputData.target = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                        this.inputData.composedPath = e.composedPath ? e.composedPath() : [];
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
                            composedPath: this.inputData.composedPath,
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
        