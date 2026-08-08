(() => {
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
    constructor({ strategy, locator, generatedBy = [], reason = '', features = {}, metadata = {}, rank = 0, identityDocument = null, probabilisticEID = null }) {
        this.id = 'lc-' + Math.random().toString(16).substring(2, 10);
        this.strategy = strategy;
        this.locator = locator;
        this.generatedBy = generatedBy.length > 0 ? generatedBy : [strategy];
        this.reason = reason;
        this.features = features; // Dropped during serialization
        this.metadata = metadata;
        this.rank = rank;
        this.scoringVector = null; // Forward compatibility for Phase 4+ ScoringVector
        this.identityDocument = identityDocument || probabilisticEID || null; // Forward compatibility for Phase 1+ EID / P-EID
        
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

    get probabilisticEID() {
        return this.identityDocument;
    }

    set probabilisticEID(val) {
        this.identityDocument = val;
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
const ValidationAnomalies = {
    NONE: 0,
    SPARSE_SEMANTICS: 1 << 0,       // (1) Vector 1 score == 0 (no testid, accname, or role)
    VOLATILE_ID_DETECTED: 1 << 1,   // (2) HTML id matched ephemeral framework regex (React/Vue/Tailwind)
    SHADOW_DOM_ENCAPSULATED: 1 << 2,// (4) Element resides within one or more ShadowRoot boundaries
    IFRAME_CROSS_ORIGIN: 1 << 3,    // (8) Element is encapsulated in a cross-origin or sandboxed frame
    DYNAMIC_TEXT_TRUNCATED: 1 << 4, // (16) Text content exceeded 64 chars and was truncated
    BOUNDING_BOX_ZERO: 1 << 5       // (32) Element has 0 width or height (hidden or display:none)
};
class ElementIdentityDocument {
    constructor(data = {}) {
        this.version = data.version || '1.0.0';
        this.captureEpoch = data.captureEpoch !== undefined ? data.captureEpoch : Date.now();
        this.captureTimestamp = data.captureTimestamp !== undefined ? data.captureTimestamp : (typeof data.captureEpoch === 'number' && data.captureEpoch > 100000000000 ? data.captureEpoch : Date.now());
        this.sourceEpoch = data.sourceEpoch !== undefined ? data.sourceEpoch : (typeof data.captureEpoch === 'number' && data.captureEpoch < 100000000000 ? data.captureEpoch : 0);
        this.anchor = data.anchor ? {
            textContent: data.anchor.textContent || '',
            tagName: (data.anchor.tagName || '').toUpperCase(),
            ariaRole: data.anchor.ariaRole || null,
            edgeDistance: data.anchor.edgeDistance !== undefined ? data.anchor.edgeDistance : 0,
            spatialVector: data.anchor.spatialVector ? { dx: data.anchor.spatialVector.dx || 0, dy: data.anchor.spatialVector.dy || 0 } : null
        } : null;
        this.cssSelector = data.cssSelector || null;
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
        const structuralHash = data.fingerprint?.structuralHash || data.structural?.structuralHash || ElementIdentityDocument.computeStructuralHash(this.hierarchy);
        const semanticHash = data.fingerprint?.semanticHash || ElementIdentityDocument.computeSemanticHash(this.element, this.semantics);
        const contentHash = data.fingerprint?.contentHash || ElementIdentityDocument.computeContentHash(this.text);

        this.fingerprint = {
            structuralHash,
            semanticHash,
            contentHash
        };

        this.identityHash = data.identityHash || ElementIdentityDocument.computeIdentityHash(structuralHash, semanticHash, contentHash);

        this.anomalyFlags = data.anomalyFlags !== undefined ? data.anomalyFlags : 0;

        // Vector 1: Semantic Synthesis
        this.semantic = {
            dataTestId: data.semantic?.dataTestId || data.element?.dataAttributes?.['data-testid'] || data.element?.dataAttributes?.['data-qa'] || data.element?.dataAttributes?.['data-cy'] || null,
            accessibleName: data.semantic?.accessibleName !== undefined ? data.semantic.accessibleName : (data.element?.ariaAttributes?.['aria-label'] || data.element?.value || (data.text?.exact ? data.text.exact.substring(0, 64) : null)),
            ariaRole: data.semantic?.ariaRole !== undefined ? data.semantic.ariaRole : (data.element?.role || data.element?.tagName?.toLowerCase() || ''),
            nameAttribute: data.semantic?.nameAttribute !== undefined ? data.semantic.nameAttribute : (data.element?.name || null),
            htmlId: data.semantic?.htmlId !== undefined ? data.semantic.htmlId : (data.element?.id || null)
        };

        // Vector 2: Structural Synthesis
        const ancestryList = data.structural?.componentAncestry || (data.hierarchy?.ancestors ? data.hierarchy.ancestors.map(a => a.tagName?.toLowerCase()).filter(t => t && t.includes('-')) : []);
        const parentTag = data.structural?.parentContainerTag !== undefined ? data.structural.parentContainerTag : (data.hierarchy?.ancestors ? (data.hierarchy.ancestors.find(a => ['form', 'nav', 'header', 'footer', 'main', 'article'].includes(a.tagName?.toLowerCase()))?.tagName?.toLowerCase() || null) : null);
        const neighborhood = data.structural?.localNeighborhood || `${data.hierarchy?.ancestors?.[0]?.tagName?.toLowerCase() || 'root'}>${data.element?.tagName?.toLowerCase() || 'element'}`;
        const siblingIndex = data.structural?.siblingIndex !== undefined ? data.structural.siblingIndex : (data.hierarchy?.siblingIndex || 0);
        const domDepth = data.structural?.domDepth !== undefined ? data.structural.domDepth : (data.hierarchy?.depth || 0);

        this.structural = {
            componentAncestry: Array.isArray(ancestryList) ? [...ancestryList] : [],
            parentContainerTag: parentTag,
            localNeighborhood: neighborhood,
            siblingIndex,
            domDepth,
            structuralHash
        };

        // Vector 3: Lexical Synthesis
        const normText = data.lexical?.normalizedText !== undefined ? data.lexical.normalizedText : (data.text?.normalized ? data.text.normalized.substring(0, 64) : null);
        const placeholder = data.lexical?.placeholder !== undefined ? data.lexical.placeholder : (data.element?.dataAttributes?.['placeholder'] || null);
        const labelText = data.lexical?.associatedLabelText !== undefined ? data.lexical.associatedLabelText : null;

        this.lexical = {
            normalizedText: normText || null,
            placeholder: placeholder || null,
            associatedLabelText: labelText || null
        };

        // Vector 4: Spatial Synthesis
        const viewportQuadrant = data.spatial?.viewportQuadrant || data.position?.viewportQuadrant || 'CENTER';
        const aspectRatio = data.spatial?.aspectRatio !== undefined ? data.spatial.aspectRatio : 1.0;
        const visibility = data.spatial?.visibility || (data.state?.visible ? 'VISIBLE' : 'HIDDEN');

        this.spatial = {
            viewportQuadrant,
            aspectRatio,
            visibility
        };

        if (typeof data.confidenceScore === 'number' && !isNaN(data.confidenceScore)) {
            this.confidenceScore = data.confidenceScore;
        } else if (typeof data.confidence === 'number' && !isNaN(data.confidence)) {
            this.confidenceScore = data.confidence;
        } else {
            let s1 = 0.0;
            if (this.semantic.dataTestId) s1 = 1.0;
            else if (this.semantic.accessibleName && this.semantic.ariaRole) s1 = 0.85;
            else if (this.semantic.htmlId) s1 = 0.50;
            else if (this.semantic.nameAttribute) s1 = 0.40;

            let s2 = (this.structural.componentAncestry.length > 0 ? 0.40 : 0.0) + (this.structural.parentContainerTag ? 0.35 : 0.0) + 0.25;
            let s3 = (this.lexical.normalizedText ? 0.65 : 0.0) + (this.lexical.associatedLabelText ? 0.35 : 0.0);
            let s4 = (this.spatial.visibility === 'VISIBLE' ? 1.0 : this.spatial.visibility === 'OCCLUDED' ? 0.5 : 0.0);

            this.confidenceScore = Math.round(((0.45 * s1) + (0.25 * s2) + (0.20 * s3) + (0.10 * s4)) * 1000) / 1000;
        }

        deepFreeze(this);
    }

    get elementId() {
        return this.semantic?.htmlId || this.element?.id || null;
    }

    get tagPath() {
        return this.structural?.localNeighborhood || (this.hierarchy?.ancestors ? this.hierarchy.ancestors.map(a => a.tagName).reverse().join('>') : '') || '';
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
            tagName: this.element?.tagName || '',
            captureEpoch: this.captureEpoch,
            captureTimestamp: this.captureTimestamp,
            sourceEpoch: this.sourceEpoch,
            anchor: this.anchor ? {
                textContent: this.anchor.textContent,
                tagName: this.anchor.tagName,
                ariaRole: this.anchor.ariaRole,
                edgeDistance: this.anchor.edgeDistance,
                spatialVector: this.anchor.spatialVector ? { ...this.anchor.spatialVector } : null
            } : null,
            cssSelector: this.cssSelector,
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
            fingerprint: { ...this.fingerprint },
            confidenceScore: this.confidenceScore,
            anomalyFlags: this.anomalyFlags,
            semantic: { ...this.semantic },
            structural: { ...this.structural, componentAncestry: [...this.structural.componentAncestry] },
            lexical: { ...this.lexical },
            spatial: { ...this.spatial }
        };
    }

    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data for ElementIdentityDocument deserialization');
        }
        return new ElementIdentityDocument(data);
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




class FeatureExtractor extends PipelineStep {
    constructor() {
        super('FeatureExtractor');
    }

    execute(context) {
        const el = context?.element;
        const isElement = el && typeof el === 'object' && (
            (typeof Element !== 'undefined' && el instanceof Element) || 
            el.nodeType === 1 || 
            typeof el.getAttribute === 'function'
        );
        if (!isElement) {
            context.features = FeatureExtractor.getEmptyProbabilisticIdentity();
            return;
        }
        
        const features = {
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : (Array.isArray(el.classList) ? el.classList.join(' ') : ''),
            tagName: (el.nodeName || el.tagName || '').toLowerCase(),
            text: '',
            dataOps: {},
            ariaLabel: (el.getAttribute && el.getAttribute('aria-label')) || '',
            role: (el.role !== undefined && el.role !== null ? el.role : ((el.getAttribute && el.getAttribute('role')) || '')),
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
            position: { viewportQuadrant: null, isSticky: false, isFixed: false, zIndex: 0 },
            anchor: null,
            cssSelector: null
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
        features.anchor = this.extractAnchor(el, context);
        features.cssSelector = this._extractCssSelector(el, context);

        const probId = FeatureExtractor.extractProbabilisticIdentity(el, context.composedPath, context);
        features.semantic = probId.semantic;
        features.structural = probId.structural;
        features.lexical = probId.lexical;
        features.spatial = probId.spatial;
        features.confidenceScore = probId.confidenceScore;
        features.anomalyFlags = probId.anomalyFlags;
        features.identityHash = probId.identityHash;

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
                    role: (node.role !== undefined && node.role !== null ? node.role : ((node.getAttribute && node.getAttribute('role')) || null)),
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
                    role: (current.role !== undefined && current.role !== null ? current.role : ((current.getAttribute && current.getAttribute('role')) || null)),
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
                role: (c.role !== undefined && c.role !== null ? c.role : ((c.getAttribute && c.getAttribute('role')) || null)),
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

        const elRole = (el.role !== undefined && el.role !== null ? el.role : ((el.getAttribute && el.getAttribute('role')) || ''));
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

    static normalizeText(str) {
        if (!str || typeof str !== 'string') return '';
        return str.substring(0, 256).replace(/\s+/g, ' ').trim().toLowerCase();
    }

    extractAnchor(target, context = null) {
        if (!target || typeof target !== 'object' || ((typeof Element === 'undefined' || !(target instanceof Element)) && target.nodeType !== 1 && typeof target.getAttribute !== 'function')) {
            return null;
        }

        const candidates = [];
        const maxDepth = 5;
        let curr = target.parentElement || target.parentNode;
        let depth = 1;
        const targetText = FeatureExtractor._extractCleanText(target);
        let targetRect = { left: 0, top: 0 };
        try {
            if (typeof target.getBoundingClientRect === 'function') {
                const r = target.getBoundingClientRect();
                targetRect = { left: r.left || 0, top: r.top || 0 };
            }
        } catch (e) {}

        const getAttr = (n, attr) => {
            try {
                if (!n) return null;
                if (typeof n.getAttribute === 'function') {
                    const res = n.getAttribute(attr);
                    if (res !== null && res !== undefined) return String(res);
                }
                if (n.attributes && n.attributes[attr]) return String(n.attributes[attr].value || n.attributes[attr]);
            } catch (e) {}
            return null;
        };

        while (curr && depth <= maxDepth) {
            const tag = (curr.nodeName || curr.tagName || '').toLowerCase();
            if (!tag || tag.startsWith('#') || tag === 'document' || tag === 'window' || tag === 'body' || tag === 'html') break;

            const txt = FeatureExtractor._extractCleanText(curr);
            const ariaLabel = getAttr(curr, 'aria-label') || getAttr(curr, 'aria-labelledby') || null;
            const testId = getAttr(curr, 'data-testid') || getAttr(curr, 'data-qa') || getAttr(curr, 'data-cy') || getAttr(curr, 'data-id') || null;

            const hasUniqueText = txt && txt.length > 3 && txt !== targetText;
            if (hasUniqueText || ariaLabel || testId) {
                const normTxt = FeatureExtractor.normalizeText(txt || ariaLabel || testId || tag);
                let ancRect = { left: 0, top: 0 };
                try {
                    if (typeof curr.getBoundingClientRect === 'function') {
                        const r = curr.getBoundingClientRect();
                        ancRect = { left: r.left || 0, top: r.top || 0 };
                    }
                } catch (e) {}

                candidates.push({
                    textContent: normTxt,
                    tagName: (curr.nodeName || curr.tagName || '').toUpperCase(),
                    ariaRole: (curr.role !== undefined && curr.role !== null ? curr.role : (getAttr(curr, 'role') || null)),
                    edgeDistance: depth,
                    textLen: normTxt.length,
                    spatialVector: {
                        dx: Math.round(ancRect.left - targetRect.left),
                        dy: Math.round(ancRect.top - targetRect.top)
                    }
                });
            }

            curr = curr.parentElement || curr.parentNode;
            depth++;
        }

        if (candidates.length === 0 && (target.parentElement || target.parentNode)) {
            const parent = target.parentElement || target.parentNode;
            try {
                const rawChildren = parent.children ? Array.from(parent.children) : (parent.childNodes ? Array.from(parent.childNodes) : []);
                const siblings = rawChildren.filter(n => n !== target && (n.nodeType === 1 || (n.nodeName && !n.nodeName.startsWith('#'))));
                let checked = 0;
                for (const sib of siblings) {
                    if (checked >= 3) break;
                    checked++;
                    const tag = (sib.nodeName || sib.tagName || '').toLowerCase();
                    if (!tag || tag.startsWith('#')) continue;

                    const txt = FeatureExtractor._extractCleanText(sib);
                    const ariaLabel = getAttr(sib, 'aria-label') || getAttr(sib, 'aria-labelledby') || null;
                    const testId = getAttr(sib, 'data-testid') || getAttr(sib, 'data-qa') || getAttr(sib, 'data-cy') || getAttr(sib, 'data-id') || null;

                    const hasUniqueText = txt && txt.length > 3 && txt !== targetText;
                    if (hasUniqueText || ariaLabel || testId) {
                        const normTxt = FeatureExtractor.normalizeText(txt || ariaLabel || testId || tag);
                        let ancRect = { left: 0, top: 0 };
                        try {
                            if (typeof sib.getBoundingClientRect === 'function') {
                                const r = sib.getBoundingClientRect();
                                ancRect = { left: r.left || 0, top: r.top || 0 };
                            }
                        } catch (e) {}

                        candidates.push({
                            textContent: normTxt,
                            tagName: (sib.nodeName || sib.tagName || '').toUpperCase(),
                            ariaRole: (sib.role !== undefined && sib.role !== null ? sib.role : (getAttr(sib, 'role') || null)),
                            edgeDistance: 2,
                            textLen: normTxt.length,
                            spatialVector: {
                                dx: Math.round(ancRect.left - targetRect.left),
                                dy: Math.round(ancRect.top - targetRect.top)
                            }
                        });
                    }
                }
            } catch (e) {}
        }

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            if (b.textLen !== a.textLen) return b.textLen - a.textLen;
            return a.edgeDistance - b.edgeDistance;
        });

        const best = candidates[0];
        return {
            textContent: best.textContent,
            tagName: best.tagName,
            ariaRole: best.ariaRole,
            edgeDistance: best.edgeDistance,
            spatialVector: best.spatialVector
        };
    }

    _extractCssSelector(el) {
        if (!el || typeof el !== 'object' || ((typeof Element === 'undefined' || !(el instanceof Element)) && el.nodeType !== 1 && typeof el.getAttribute !== 'function')) {
            return null;
        }
        try {
            if (el.id && !/^(:?r[0-9a-z]+|uuid-|headlessui|el-[0-9]+|ember[0-9]+|ng-[0-9]+|vue-[0-9]+)/i.test(el.id)) {
                return `#${el.id}`;
            }
            const testId = el.getAttribute ? (el.getAttribute('data-testid') || el.getAttribute('data-qa') || el.getAttribute('data-cy')) : null;
            if (testId) {
                return `[data-testid="${testId}"]`;
            }
            const tag = (el.nodeName || el.tagName || '').toLowerCase();
            if (!tag || tag.startsWith('#')) return null;
            if (typeof el.className === 'string' && el.className.trim()) {
                const cls = el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
                if (cls) return `${tag}.${cls}`;
            }
            return tag;
        } catch (e) {
            return null;
        }
    }

    static getEmptyProbabilisticIdentity() {
        return {
            id: '',
            className: '',
            tagName: '',
            text: '',
            dataOps: {},
            ariaLabel: '',
            role: '',
            href: '',
            src: '',
            alt: '',
            placeholder: '',
            name: '',
            type: '',
            value: '',
            rect: { left: 0, top: 0, width: 0, height: 0 },
            isIntersecting: false,
            isIframe: false,
            dataAttributes: {},
            ariaAttributes: {},
            ancestry: [],
            siblings: { siblingIndex: 0, siblingCount: 0, list: [] },
            landmark: null,
            sectionHeading: null,
            componentRoot: null,
            position: { viewportQuadrant: 'CENTER', isSticky: false, isFixed: false, zIndex: 0 },
            anchor: null,
            cssSelector: null,
            semantic: { dataTestId: null, accessibleName: null, ariaRole: '', nameAttribute: null, htmlId: null },
            structural: { componentAncestry: [], parentContainerTag: null, localNeighborhood: 'root>unknown', siblingIndex: 0, domDepth: 0, structuralHash: '00000000' },
            lexical: { normalizedText: null, placeholder: null, associatedLabelText: null },
            spatial: { viewportQuadrant: 'CENTER', aspectRatio: 1.0, visibility: 'HIDDEN' },
            confidenceScore: 0.0,
            anomalyFlags: (ValidationAnomalies.SPARSE_SEMANTICS | ValidationAnomalies.BOUNDING_BOX_ZERO),
            identityHash: '00000000'
        };
    }

    static _getImplicitRole(node) {
        if (!node || !node.tagName) return '';
        const tag = (node.tagName || node.nodeName || '').toLowerCase();
        const type = (node.getAttribute && node.getAttribute('type')) ? String(node.getAttribute('type')).toLowerCase() : '';
        if (tag === 'a' || tag === 'area') return 'link';
        if (tag === 'button') return 'button';
        if (tag === 'input') {
            if (['button', 'submit', 'reset'].includes(type)) return 'button';
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'range') return 'slider';
            if (type === 'search') return 'searchbox';
            return 'textbox';
        }
        if (tag === 'select') return 'combobox';
        if (tag === 'textarea') return 'textbox';
        if (tag === 'form') return 'form';
        if (tag === 'nav') return 'navigation';
        if (tag === 'header') return 'banner';
        if (tag === 'footer') return 'contentinfo';
        if (tag === 'main') return 'main';
        if (tag === 'aside') return 'complementary';
        if (tag === 'section') return 'region';
        if (tag === 'img') return 'img';
        if (/^h[1-6]$/.test(tag)) return 'heading';
        return '';
    }

    static _extractCleanText(el) {
        if (!el) return '';
        let textContent = '';
        try {
            if (el.childNodes && el.childNodes.length > 0) {
                for (const node of el.childNodes) {
                    if (node.nodeType === 3 || node.nodeName === '#text') {
                        textContent += node.textContent || '';
                    } else if (node.nodeType === 1 || (node.nodeName && !node.nodeName.startsWith('#'))) {
                        const tag = (node.nodeName || '').toLowerCase();
                        if (tag !== 'script' && tag !== 'style') {
                            textContent += node.innerText || node.textContent || '';
                        }
                    }
                }
            } else if (el.textContent || el.innerText) {
                textContent = el.innerText || el.textContent || '';
            }
        } catch (e) {}
        return textContent.trim().replace(/\s+/g, ' ');
    }

    static extractProbabilisticIdentity(node, composedPath = [], context = null) {
        if (!node || typeof node !== 'object' || ((typeof Element === 'undefined' || !(node instanceof Element)) && node.nodeType !== 1 && typeof node.getAttribute !== 'function')) {
            return FeatureExtractor.getEmptyProbabilisticIdentity();
        }

        let flags = 0;
        const getAttr = (n, attr) => {
            try {
                if (!n) return null;
                if (attr === 'role' && n.role !== undefined && n.role !== null && n.role !== '') return String(n.role);
                if (typeof n.getAttribute === 'function') {
                    const res = n.getAttribute(attr);
                    if (res !== null && res !== undefined) return String(res);
                }
                if (n.attributes && n.attributes[attr]) return String(n.attributes[attr].value || n.attributes[attr]);
            } catch (e) {}
            return null;
        };

        // Vector 1: Semantic Synthesis
        const dataTestId = getAttr(node, 'data-testid') || getAttr(node, 'data-qa') || getAttr(node, 'data-cy') || getAttr(node, 'data-id') || null;
        let accessibleName = getAttr(node, 'aria-label') || getAttr(node, 'aria-labelledby') || node.title || getAttr(node, 'alt') || null;
        if (!accessibleName && (node.value !== undefined || getAttr(node, 'value'))) {
            accessibleName = String(node.value !== undefined ? node.value : getAttr(node, 'value'));
        }
        if (!accessibleName) {
            const txt = FeatureExtractor._extractCleanText(node);
            if (txt) accessibleName = txt;
        }
        if (accessibleName && accessibleName.length > 64) {
            accessibleName = accessibleName.substring(0, 64);
            flags |= ValidationAnomalies.DYNAMIC_TEXT_TRUNCATED;
        }
        const ariaRole = getAttr(node, 'role') || FeatureExtractor._getImplicitRole(node) || '';
        const nameAttribute = getAttr(node, 'name') || null;
        const rawId = node.id || getAttr(node, 'id') || null;
        let validId = null;
        if (rawId) {
            if (/^(:?r[0-9a-z]+|uuid-|headlessui|el-[0-9]+|ember[0-9]+|ng-[0-9]+|vue-[0-9]+)/i.test(rawId)) {
                flags |= ValidationAnomalies.VOLATILE_ID_DETECTED;
            } else {
                validId = rawId;
            }
        }

        let s1 = 0.0;
        if (dataTestId !== null) s1 = 1.0;
        else if (accessibleName !== null && ariaRole !== '') s1 = 0.85;
        else if (validId !== null) s1 = 0.50;
        else if (nameAttribute !== null) s1 = 0.40;
        if (s1 === 0.0) {
            flags |= ValidationAnomalies.SPARSE_SEMANTICS;
        }

        const semantic = { dataTestId, accessibleName, ariaRole, nameAttribute, htmlId: rawId };

        // Vector 2: Structural Synthesis
        const ancestryList = [];
        let curr = node.parentElement || node.parentNode;
        let depth = 0;
        let parentTag = null;
        while (curr && depth < 10) {
            const tag = (curr.nodeName || curr.tagName || '').toLowerCase();
            if (!tag || tag.startsWith('#') || tag === 'document' || tag === 'window') break;
            if (tag.includes('-')) {
                ancestryList.push(tag);
            }
            if (parentTag === null && ['form', 'nav', 'header', 'footer', 'main', 'article', 'section', 'aside', 'dialog'].includes(tag)) {
                parentTag = tag;
            }
            try {
                if ((typeof ShadowRoot !== 'undefined' && curr instanceof ShadowRoot) || curr.toString() === '[object ShadowRoot]' || curr.nodeType === 11 || curr.host) {
                    flags |= ValidationAnomalies.SHADOW_DOM_ENCAPSULATED;
                }
            } catch (e) {}
            curr = curr.parentElement || curr.parentNode;
            depth++;
        }

        if ((node.nodeName || '').toLowerCase() === 'iframe' || (typeof window !== 'undefined' && node.ownerDocument && node.ownerDocument !== window.document)) {
            flags |= ValidationAnomalies.IFRAME_CROSS_ORIGIN;
        }

        const parentTagStr = node.parentElement || node.parentNode ? ((node.parentElement || node.parentNode).nodeName || (node.parentElement || node.parentNode).tagName) : 'root';
        const neighborhood = `${(parentTagStr || 'root').toLowerCase()}>${(node.nodeName || node.tagName || '').toLowerCase()}`;

        let siblingIndex = 0;
        const parent = node.parentElement || node.parentNode;
        if (parent) {
            try {
                const list = parent.children ? Array.from(parent.children) : (parent.childNodes ? Array.from(parent.childNodes) : []);
                const myTag = (node.nodeName || node.tagName || '').toLowerCase();
                const myRole = getAttr(node, 'role') || '';
                for (const child of list) {
                    if (child === node) break;
                    if (child.nodeType !== 1 && child !== node) continue;
                    const cTag = (child.nodeName || child.tagName || '').toLowerCase();
                    const cRole = getAttr(child, 'role') || '';
                    if (cTag === myTag && cRole === myRole) {
                        siblingIndex++;
                    }
                }
            } catch (e) {}
        }

        const hashStr = ancestryList.join('/') + '|' + neighborhood + '|' + depth;
        const structuralHash = ElementIdentityDocument.computeFNV1a(hashStr);
        const s2 = (ancestryList.length > 0 ? 0.40 : 0.0) + (parentTag !== null ? 0.35 : 0.0) + 0.25;

        const structural = {
            componentAncestry: ancestryList,
            parentContainerTag: parentTag,
            localNeighborhood: neighborhood,
            siblingIndex,
            domDepth: depth,
            structuralHash
        };

        // Vector 3: Lexical Synthesis
        let rawText = FeatureExtractor._extractCleanText(node);
        if (rawText.length > 64) {
            rawText = rawText.substring(0, 64);
            flags |= ValidationAnomalies.DYNAMIC_TEXT_TRUNCATED;
        }
        const normText = rawText.length > 0 ? rawText.toLowerCase() : null;
        const placeholder = getAttr(node, 'placeholder') || null;
        let labelText = null;
        try {
            const targetId = validId || rawId;
            if (targetId && node.ownerDocument && typeof node.ownerDocument.querySelector === 'function') {
                const labelEl = node.ownerDocument.querySelector(`label[for="${targetId}"]`);
                if (labelEl) {
                    const lTxt = FeatureExtractor._extractCleanText(labelEl);
                    if (lTxt) labelText = lTxt;
                }
            }
            if (!labelText) {
                let closestLabel = null;
                if (typeof node.closest === 'function') closestLabel = node.closest('label');
                else if (node.parentElement && (node.parentElement.nodeName || '').toLowerCase() === 'label') closestLabel = node.parentElement;
                if (closestLabel && closestLabel !== node) {
                    const lTxt = FeatureExtractor._extractCleanText(closestLabel);
                    if (lTxt) labelText = lTxt;
                }
            }
            if (labelText && labelText.length > 64) {
                labelText = labelText.substring(0, 64);
                flags |= ValidationAnomalies.DYNAMIC_TEXT_TRUNCATED;
            }
        } catch (e) {}
        const s3 = (normText !== null ? 0.65 : 0.0) + (labelText !== null ? 0.35 : 0.0);
        const lexical = { normalizedText: normText, placeholder, associatedLabelText: labelText };

        // Vector 4: Spatial Synthesis
        let rect = { left: 0, top: 0, width: 0, height: 0 };
        try {
            if (typeof node.getBoundingClientRect === 'function') {
                const r = node.getBoundingClientRect();
                rect = { left: r.left || 0, top: r.top || 0, width: r.width || 0, height: r.height || 0 };
            }
        } catch (e) {}
        if (rect.width === 0 || rect.height === 0) {
            flags |= ValidationAnomalies.BOUNDING_BOX_ZERO;
        }
        const aspectRatio = Math.round((rect.width / (rect.height || 1)) * 100) / 100;
        let viewportQuadrant = 'CENTER';
        try {
            const winW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1920;
            const winH = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 1080;
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            const isTop = midY < winH / 2;
            const isLeft = midX < winW / 2;
            if (rect.width > 0 && rect.height > 0) {
                viewportQuadrant = `${isTop ? 'TOP' : 'BOTTOM'}_${isLeft ? 'LEFT' : 'RIGHT'}`;
            }
        } catch (e) {}
        let visibility = 'VISIBLE';
        if (rect.width === 0 || rect.height === 0) {
            visibility = 'HIDDEN';
        } else {
            try {
                const style = (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') ? window.getComputedStyle(node) : (node.style || {});
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || style.opacity === 0) {
                    visibility = 'HIDDEN';
                } else if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function' && typeof window !== 'undefined') {
                    const midX = rect.left + rect.width / 2;
                    const midY = rect.top + rect.height / 2;
                    if (midX >= 0 && midY >= 0 && midX <= window.innerWidth && midY <= window.innerHeight) {
                        const topEl = document.elementFromPoint(midX, midY);
                        if (topEl && topEl !== node && !node.contains(topEl) && !topEl.contains(node)) {
                            visibility = 'OCCLUDED';
                        }
                    }
                }
            } catch (e) {}
        }
        const s4 = (visibility === 'VISIBLE' ? 1.0 : visibility === 'OCCLUDED' ? 0.5 : 0.0);
        const spatial = { viewportQuadrant, aspectRatio, visibility };

        // Score & Hash Convergence
        const confidenceScore = Math.round(((0.45 * s1) + (0.25 * s2) + (0.20 * s3) + (0.10 * s4)) * 1000) / 1000;
        const idStr = [dataTestId || '', accessibleName || '', ariaRole || '', structuralHash || '', normText || ''].join('###');
        const identityHash = ElementIdentityDocument.computeFNV1a(idStr);

        return {
            semantic,
            structural,
            lexical,
            spatial,
            confidenceScore,
            anomalyFlags: flags,
            identityHash
        };
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

    executeFromSID(context, sid) {
        const candidates = [];
        let rank = 0;
        
        // DataAttribute strategy
        const testId = sid.semantic?.dataTestId;
        if (testId) {
            candidates.push(new LocatorCandidate({
                strategy: 'data-attribute',
                locator: `[data-testid="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(testId) : testId}"]`,
                rank: rank++,
                reason: 'data-testid from SID'
            }));
        }
        
        const dataAttrs = sid.element?.dataAttributes;
        if (dataAttrs) {
            for (const [key, val] of Object.entries(dataAttrs)) {
                if (key !== 'testid' && val) {
                    candidates.push(new LocatorCandidate({
                        strategy: 'data-attribute',
                        locator: `[data-${key}="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(val) : val}"]`,
                        rank: rank++,
                        reason: `data-${key} from SID`
                    }));
                }
            }
        }
        
        // Text strategy
        const textContent = sid.text?.exact;
        if (textContent && textContent.trim().length > 0 && textContent.trim().length < 100) {
            candidates.push(new LocatorCandidate({
                strategy: 'text',
                locator: `text="${textContent.trim()}"`,
                rank: rank++,
                reason: 'text from SID'
            }));
        }
        
        // Aria strategy
        const ariaLabel = sid.element?.ariaAttributes ? sid.element.ariaAttributes['aria-label'] : null;
        if (ariaLabel) {
            candidates.push(new LocatorCandidate({
                strategy: 'aria',
                locator: `[aria-label="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(ariaLabel) : ariaLabel}"]`,
                rank: rank++,
                reason: 'aria-label from SID'
            }));
        }
        
        // Role strategy
        const role = sid.element?.role || sid.semantic?.ariaRole;
        if (role) {
            let locStr = `role=${role}`;
            if (ariaLabel) {
                locStr = `${(sid.tagName || '').toLowerCase()}[role="${role}"][aria-label="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(ariaLabel) : ariaLabel}"]`;
            } else if (textContent && textContent.trim().length < 50) {
                locStr = `${(sid.tagName || '').toLowerCase()}[role="${role}"]`;
            }
            candidates.push(new LocatorCandidate({
                strategy: 'role',
                locator: locStr,
                rank: rank++,
                reason: 'role from SID'
            }));
        }
        
        // Structural fallback (cssSelector from SID)
        if (sid.cssSelector) {
            candidates.push(new LocatorCandidate({
                strategy: 'structural',
                locator: sid.cssSelector,
                rank: rank++,
                reason: 'cssSelector fallback from SID'
            }));
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

        if (typeof TelemetryCollector !== 'undefined') {
            TelemetryCollector.recordRanking({ candidates: context.candidates });
        }
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




    window.__liGenerateFromSID = function(sid) {
        if (!sid || !sid.identityHash || !sid.tagName) return [];
        
        const ctx = new PipelineContext(null, [], {});
        ctx.features = sid;
        ctx.identityDocument = sid;
        
        const generator = new CandidateGenerator();
        generator.executeFromSID(ctx, sid);
        
        const dedup = new CandidateDeduplicator();
        dedup.execute(ctx);
        
        const analyzer = new StructuralAnalyzer();
        analyzer.execute(ctx);
        
        const ranker = new AdditiveRankingEngine();
        ranker.execute(ctx);
        
        return (ctx.candidates || []).map(c => ({
            id: c.id,
            strategy: c.strategy,
            locator: c.locator,
            rank: c.rank,
            reason: c.reason,
            ranking: { finalScore: c.ranking ? c.ranking.finalScore : 0 }
        }));
    };
})();
