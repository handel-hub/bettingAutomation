import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class SlaveEIDExtractor {
    static async extract(page, locator, elementIndex = 0) {
        if (!page) return null;
        try {
            const start = Date.now();
            const loc = page.locator(locator);
            const count = await loc.count();
            if (count === 0 || elementIndex >= count) return null;

            const rawData = await loc.nth(elementIndex).evaluate(SlaveEIDExtractor._extractElementData);
            const duration = Date.now() - start;
            TelemetryCollector.recordEIDExtraction(duration);
            return rawData ? new ElementIdentityDocument(rawData) : null;
        } catch (err) {
            return null;
        }
    }

    static async extractAll(page, locator, maxCount = 10) {
        if (!page) return [];
        try {
            const start = Date.now();
            const loc = page.locator(locator);
            
            const rawDataList = await loc.evaluateAll((els, max) => {
                // The browser-side function is passed as a string and evaluated, or we can just call it if we pass it properly
                // But evaluateAll allows passing a function that takes the elements array
                return els.slice(0, max).map(el => window.__extractElementData ? window.__extractElementData(el) : null).filter(Boolean);
            }, maxCount);
            
            // Wait, we need to pass the extractElementData function into evaluateAll.
            // A better way is to do it like this:
            const dataList = await loc.evaluateAll(SlaveEIDExtractor._extractAllElementsData, maxCount);

            const duration = Date.now() - start;
            TelemetryCollector.recordEIDExtraction(duration);
            if (!dataList || !Array.isArray(dataList)) return [];
            return dataList.filter(d => !!d).map(d => new ElementIdentityDocument(d));
        } catch (err) {
            return [];
        }
    }

    static _extractAllElementsData(els, maxCount) {
        const getStyle = (el) => {
            if (typeof window !== 'undefined' && window.getComputedStyle) {
                try { return window.getComputedStyle(el) || {}; } catch (e) { return {}; }
            }
            return el.style || {};
        };

        const extractElementData = (el) => {
            const dataAttributes = {};
            const ariaAttributes = {};

            if (el.attributes || el._attributes || typeof el.getAttribute === 'function') {
                if (el.attributes && (Array.isArray(el.attributes) || typeof el.attributes[Symbol.iterator] === 'function' || el.attributes.length !== undefined)) {
                    const attrs = Array.isArray(el.attributes) ? el.attributes : Array.from(el.attributes);
                    for (const attr of attrs) {
                        const name = (attr.name || attr.nodeName || '').toLowerCase();
                        const val = attr.value !== undefined ? attr.value : (attr.nodeValue || '');
                        if (name.startsWith('data-')) {
                            dataAttributes[name] = String(val);
                        } else if (name.startsWith('aria-')) {
                            ariaAttributes[name] = String(val);
                        }
                    }
                } else if (el._attributes || el.attributesMap) {
                    const mockAttrs = el._attributes || el.attributesMap || {};
                    const entries = typeof mockAttrs.entries === 'function' ? mockAttrs.entries() : Object.entries(mockAttrs);
                    for (const [name, val] of entries) {
                        const lowerName = String(name).toLowerCase();
                        if (lowerName.startsWith('data-')) {
                            dataAttributes[lowerName] = String(val);
                        } else if (lowerName.startsWith('aria-')) {
                            ariaAttributes[lowerName] = String(val);
                        }
                    }
                }
            }

            let textContent = '';
            if (el.childNodes && el.childNodes.length > 0) {
                for (const node of Array.from(el.childNodes)) {
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
            const cleanText = textContent.trim().replace(/\s+/g, ' ');

            const ancestors = [];
            let current = el.parentElement || el.parentNode;
            while (current && ancestors.length < 10) {
                const tag = (current.nodeName || current.tagName || '').toLowerCase();
                if (!tag || tag.startsWith('#') || tag === 'document' || tag === 'window') break;

                ancestors.push({
                    tagName: tag.toUpperCase(),
                    id: current.id || null,
                    classes: typeof current.className === 'string' && current.className ? current.className.split(/\s+/).filter(Boolean) : (Array.isArray(current.classList) ? Array.from(current.classList) : []),
                    role: (current.getAttribute && current.getAttribute('role')) || null,
                    testId: (current.getAttribute && current.getAttribute('data-testid')) || null
                });
                current = current.parentElement || current.parentNode;
            }

            const parent = el.parentElement || el.parentNode;
            let siblingIndex = 0;
            let siblingCount = 1;
            const siblingsList = [];

            if (parent) {
                const rawChildren = parent.children ? Array.from(parent.children) : (parent.childNodes ? Array.from(parent.childNodes) : []);
                const children = rawChildren.filter(n => n === el || n.nodeType === 1);
                siblingCount = children.length;
                siblingIndex = children.indexOf(el);
                if (siblingIndex === -1) siblingIndex = 0;

                for (let i = 0; i < children.length; i++) {
                    if (i === siblingIndex) continue;
                    const c = children[i];
                    const tag = (c.nodeName || c.tagName || '').toLowerCase();
                    if (!tag || tag.startsWith('#')) continue;

                    siblingsList.push({
                        tagName: tag.toUpperCase(),
                        text: ((c.innerText || c.textContent || '').trim()).substring(0, 50),
                        role: (c.getAttribute && c.getAttribute('role')) || null,
                        id: c.id || null,
                        classes: typeof c.className === 'string' && c.className ? c.className.split(/\s+/).filter(Boolean) : (Array.isArray(c.classList) ? Array.from(c.classList) : [])
                    });
                    if (siblingsList.length >= 10) break;
                }
            }

            let landmark = null;
            const landmarkRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form', 'region'];
            const landmarkTags = { header: 'banner', nav: 'navigation', main: 'main', footer: 'contentinfo', aside: 'complementary', form: 'form', section: 'region' };
            
            let checkNode = el;
            while (checkNode && checkNode !== document) {
                const role = checkNode.getAttribute ? checkNode.getAttribute('role') : null;
                if (role && landmarkRoles.includes(role.toLowerCase())) {
                    landmark = role.toLowerCase();
                    break;
                }
                const tag = (checkNode.nodeName || checkNode.tagName || '').toLowerCase();
                if (landmarkTags[tag]) {
                    landmark = landmarkTags[tag];
                    break;
                }
                checkNode = checkNode.parentElement || checkNode.parentNode;
            }

            const rect = (typeof el.getBoundingClientRect === 'function') ? el.getBoundingClientRect() : { width: 0, height: 0, top: 0, left: 0 };
            const style = getStyle(el);
            const visible = (el._visible !== false) && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && (el.offsetParent !== null || style.position === 'fixed' || el.tagName === 'BODY' || el.tagName === 'HTML');

            let normalizedX = 0;
            let normalizedY = 0;
            let viewportQuadrant = 'center';
            if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
                normalizedX = Number(((rect.left + rect.width / 2) / window.innerWidth).toFixed(4));
                normalizedY = Number(((rect.top + rect.height / 2) / window.innerHeight).toFixed(4));
                const isTop = normalizedY < 0.5;
                const isLeft = normalizedX < 0.5;
                viewportQuadrant = isTop ? (isLeft ? 'top-left' : 'top-right') : (isLeft ? 'bottom-left' : 'bottom-right');
            }

            return {
                version: '1.0.0',
                captureEpoch: Date.now(),
                url: typeof window !== 'undefined' && window.location ? window.location.href : '',
                frameUrl: null,
                element: {
                    tagName: (el.nodeName || el.tagName || '').toUpperCase(),
                    role: (el.getAttribute && el.getAttribute('role')) || null,
                    type: (el.getAttribute && el.getAttribute('type')) || null,
                    id: el.id || null,
                    name: (el.getAttribute && el.getAttribute('name')) || null,
                    value: el.value !== undefined ? String(el.value) : ((el.getAttribute && el.getAttribute('value')) || null),
                    href: (el.getAttribute && el.getAttribute('href')) || null,
                    classes: typeof el.className === 'string' && el.className ? el.className.split(/\s+/).filter(Boolean) : (Array.isArray(el.classList) ? Array.from(el.classList) : []),
                    dataAttributes,
                    ariaAttributes
                },
                text: {
                    exact: cleanText,
                    normalized: cleanText.toLowerCase(),
                    wordCount: cleanText.split(/\s+/).filter(Boolean).length,
                    isNumeric: /^\d+$/.test(cleanText),
                    isDynamic: false
                },
                hierarchy: {
                    depth: ancestors.length,
                    childCount: Math.max(0, siblingCount - 1),
                    siblingIndex,
                    siblingCount,
                    ancestors,
                    siblings: siblingsList
                },
                semantics: {
                    landmark,
                    sectionHeading: null,
                    componentRoot: null
                },
                position: {
                    viewportQuadrant,
                    isSticky: style.position === 'sticky',
                    isFixed: style.position === 'fixed',
                    zIndex: Number(style.zIndex) || 0,
                    normalizedX,
                    normalizedY
                },
                state: {
                    visible,
                    enabled: !el.disabled,
                    editable: Boolean(el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes((el.nodeName || el.tagName || '').toUpperCase())),
                    checked: el.checked !== undefined ? Boolean(el.checked) : null,
                    expanded: ariaAttributes['aria-expanded'] !== undefined ? ariaAttributes['aria-expanded'] === 'true' : null
                }
            };
        };

        return els.slice(0, maxCount).map(extractElementData);
    }

    static _extractElementData(el) {
        // Playwright evaluate allows reusing the inner logic by calling evaluateAll array equivalent,
        // but for a single element we can just reuse _extractAllElementsData
        return el ? SlaveEIDExtractor._extractAllElementsData([el], 1)[0] : null;
    }
}
export default SlaveEIDExtractor;
