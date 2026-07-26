import { PipelineStep } from '../engine/PipelineStep.mjs';
import { ElementIdentityDocument, ValidationAnomalies } from '../models/ElementIdentityDocument.mjs';

export class FeatureExtractor extends PipelineStep {
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

