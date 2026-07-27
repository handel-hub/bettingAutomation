export class CandidateRecord {
    constructor(node, textIndex = null, spatialCache = null, accessibilityIndex = null) {
        this.node = node;
        this.tagName = (node && node.tagName) ? node.tagName.toUpperCase() : '';
        this.textContent = (node ? (node.textContent || node.value || '').trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 256) : null);
        
        if (accessibilityIndex && accessibilityIndex.elementRoles && accessibilityIndex.elementRoles.has(node)) {
            this.ariaRole = accessibilityIndex.elementRoles.get(node);
        } else {
            this.ariaRole = node ? (node.getAttribute?.('role') || node.role || null) : null;
        }
        
        if (accessibilityIndex && accessibilityIndex.elementLabels && accessibilityIndex.elementLabels.has(node)) {
            this.ariaLabel = accessibilityIndex.elementLabels.get(node);
        } else {
            this.ariaLabel = node ? (node.getAttribute?.('aria-label') || node.getAttribute?.('title') || null) : null;
        }

        this.dataTestId = node ? (node.getAttribute?.('data-testid') || node.getAttribute?.('data-qa') || node.getAttribute?.('data-cy') || null) : null;
        this.isDisabled = node ? Boolean(node.disabled || node.getAttribute?.('aria-disabled') === 'true' || node.classList?.contains?.('disabled')) : false;
        
        if (spatialCache && typeof spatialCache.getBounds === 'function') {
            this.isVisible = typeof spatialCache.isVisible === 'function' ? spatialCache.isVisible(node) : true;
            this.approximateBounds = spatialCache.getBounds(node) || { x: 0, y: 0, w: 0, h: 0 };
        } else if (spatialCache && typeof spatialCache.get === 'function') {
            const cached = spatialCache.get(node);
            this.isVisible = cached ? cached.isVisible : true;
            this.approximateBounds = cached ? cached.bounds : { x: 0, y: 0, w: 0, h: 0 };
        } else {
            this.isVisible = true;
            this.approximateBounds = (node && typeof node.getBoundingClientRect === 'function')
                ? (() => { const r = node.getBoundingClientRect(); return { x: r.x || 0, y: r.y || 0, w: r.width || 0, h: r.height || 0 }; })()
                : { x: 0, y: 0, w: 0, h: 0 };
        }

        this.locator = this._generateLocator(node);
        this.isMemoryHit = false;
        this.memoryConfidence = 0;
    }

    _generateLocator(node) {
        if (!node) return '';
        if (this.dataTestId) {
            return `[data-testid="${this.dataTestId}"]`;
        }
        if (node.id && !/^(mui-|react-|vue-|headlessui-|radix-|id-|\d)/.test(node.id)) {
            return `#${node.id}`;
        }
        if (this.textContent && this.textContent.length > 2 && this.textContent.length < 50 && !/"/.test(this.textContent)) {
            return `text="${node.textContent.trim()}"`;
        }
        return this._buildCssPath(node);
    }

    _buildCssPath(el) {
        if (!el || el.nodeType !== 1) return '';
        const path = [];
        let current = el;
        while (current && current.nodeType === 1 && current.tagName !== 'HTML' && current.tagName !== 'BODY') {
            let selector = current.tagName.toLowerCase();
            if (current.id && !/^(mui-|react-|vue-|headlessui-|radix-|id-|\d)/.test(current.id)) {
                path.unshift(`#${current.id}`);
                break;
            }
            let index = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
                if (sibling.tagName === current.tagName) index++;
                sibling = sibling.previousElementSibling;
            }
            if (index > 1 || (current.nextElementSibling && current.nextElementSibling.tagName === current.tagName)) {
                selector += `:nth-of-type(${index})`;
            }
            path.unshift(selector);
            current = current.parentElement || current.parentNode;
        }
        return path.join(' > ');
    }
}

export class QueryPlanner {
    static query(identityDoc, sceneGraph, docRoot = null) {
        if (!identityDoc) return [];
        const doc = docRoot || (typeof document !== 'undefined' ? document : null);
        if (!doc) return [];

        const results = [];
        const seenNodes = new Set();
        const addNode = (node) => {
            if (node && !seenNodes.has(node)) {
                seenNodes.add(node);
                results.push(new CandidateRecord(
                    node,
                    sceneGraph ? sceneGraph.textIndex : null,
                    sceneGraph ? sceneGraph.spatialCache : null,
                    sceneGraph ? sceneGraph.accessibilityIndex : null
                ));
            }
        };

        const checkAndReturn = () => {
            if (results.length === 0) return false;
            if (sceneGraph && typeof sceneGraph.recallResolution === 'function') {
                const urlPath = identityDoc.urlPath || (typeof window !== 'undefined' && window.location ? window.location.pathname : '');
                const eidHash = identityDoc.eidHash || identityDoc.hash || identityDoc.id || identityDoc.dataTestId || identityDoc.textContent || identityDoc.cssSelector || '';
                if (urlPath && eidHash) {
                    const memoryHit = sceneGraph.recallResolution(urlPath, eidHash);
                    if (memoryHit && memoryHit.locator) {
                        let hitFound = false;
                        for (let i = 0; i < results.length; i++) {
                            if (results[i].locator === memoryHit.locator) {
                                results[i].isMemoryHit = true;
                                results[i].memoryConfidence = memoryHit.confidence || 1.0;
                                hitFound = true;
                            }
                        }
                        if (!hitFound && typeof doc.querySelector === 'function') {
                            try {
                                const el = doc.querySelector(memoryHit.locator);
                                if (el && !seenNodes.has(el)) {
                                    seenNodes.add(el);
                                    const rec = new CandidateRecord(
                                        el,
                                        sceneGraph ? sceneGraph.textIndex : null,
                                        sceneGraph ? sceneGraph.spatialCache : null,
                                        sceneGraph ? sceneGraph.accessibilityIndex : null
                                    );
                                    rec.isMemoryHit = true;
                                    rec.memoryConfidence = memoryHit.confidence || 1.0;
                                    results.unshift(rec);
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            return true;
        };

        // Step 1: Read identityDoc.dataTestId
        const testId = identityDoc.dataTestId || identityDoc.semantic?.dataTestId || identityDoc.element?.dataAttributes?.['data-testid'] || null;
        if (testId && typeof doc.querySelectorAll === 'function') {
            try {
                const matches = doc.querySelectorAll(`[data-testid="${testId}"]`);
                if (matches && matches.length > 0) {
                    for (let i = 0; i < matches.length; i++) {
                        addNode(matches[i]);
                    }
                    if (checkAndReturn()) return results;
                }
            } catch (e) {}
        }

        // Step 2: Read identityDoc.textContent (cardinality <= 3)
        const text = identityDoc.textContent || identityDoc.lexical?.normalizedText || identityDoc.text?.normalized || identityDoc.text?.exact || null;
        if (text && sceneGraph && sceneGraph.textIndex) {
            const matchSet = sceneGraph.textIndex.get(text);
            if (matchSet && matchSet.size > 0 && matchSet.size <= 5) {
                for (const node of matchSet) {
                    addNode(node);
                }
                if (checkAndReturn()) return results;
            }
        }

        // Step 3: Read ARIA label or role
        const ariaLabel = identityDoc.ariaLabel || identityDoc.semantic?.ariaLabel || null;
        if (ariaLabel && sceneGraph && sceneGraph.accessibilityIndex) {
            const matchSet = sceneGraph.accessibilityIndex.getByLabel(ariaLabel);
            if (matchSet && matchSet.size > 0 && matchSet.size <= 10) {
                for (const node of matchSet) {
                    addNode(node);
                }
                if (checkAndReturn()) return results;
            }
        }

        // Step 4: Fallback cssSelector
        const cssSelector = identityDoc.cssSelector || null;
        if (cssSelector && typeof doc.querySelectorAll === 'function') {
            try {
                const matches = doc.querySelectorAll(cssSelector);
                if (matches && matches.length > 0) {
                    for (let i = 0; i < Math.min(matches.length, 10); i++) {
                        addNode(matches[i]);
                    }
                    if (checkAndReturn()) return results;
                }
            } catch (e) {}
        }

        // Step 5: Final fallback tagName
        const tagName = identityDoc.tagName || identityDoc.element?.tagName || null;
        if (tagName && typeof doc.querySelectorAll === 'function') {
            try {
                const matches = doc.querySelectorAll(tagName);
                if (matches && matches.length > 0) {
                    for (let i = 0; i < Math.min(matches.length, 100); i++) {
                        addNode(matches[i]);
                    }
                }
            } catch (e) {}
        }

        checkAndReturn();
        return results;
    }
}
export default QueryPlanner;
