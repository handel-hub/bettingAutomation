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

export const ValidationAnomalies = {
    NONE: 0,
    SPARSE_SEMANTICS: 1 << 0,       // (1) Vector 1 score == 0 (no testid, accname, or role)
    VOLATILE_ID_DETECTED: 1 << 1,   // (2) HTML id matched ephemeral framework regex (React/Vue/Tailwind)
    SHADOW_DOM_ENCAPSULATED: 1 << 2,// (4) Element resides within one or more ShadowRoot boundaries
    IFRAME_CROSS_ORIGIN: 1 << 3,    // (8) Element is encapsulated in a cross-origin or sandboxed frame
    DYNAMIC_TEXT_TRUNCATED: 1 << 4, // (16) Text content exceeded 64 chars and was truncated
    BOUNDING_BOX_ZERO: 1 << 5       // (32) Element has 0 width or height (hidden or display:none)
};

export class ElementIdentityDocument {
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
export default ElementIdentityDocument;
