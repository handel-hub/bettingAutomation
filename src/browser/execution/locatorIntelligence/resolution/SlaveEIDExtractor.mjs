import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class SlaveEIDExtractor {
    static async extract(page, locator, elementIndex = 0) {
        if (!page || typeof page.evaluate !== 'function') {
            return null;
        }
        try {
            const start = Date.now();
            const rawData = await page.evaluate(SlaveEIDExtractor._evaluationScript, { locator, elementIndex, maxCount: 1 });
            const duration = Date.now() - start;
            TelemetryCollector.recordEIDExtraction(duration);
            if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
                return null;
            }
            const data = Array.isArray(rawData) ? rawData[0] : rawData;
            return data ? new ElementIdentityDocument(data) : null;
        } catch (err) {
            return null;
        }
    }

    static async extractAll(page, locator, maxCount = 10) {
        if (!page || typeof page.evaluate !== 'function') {
            return [];
        }
        try {
            const start = Date.now();
            const rawDataList = await page.evaluate(SlaveEIDExtractor._evaluationScript, { locator, elementIndex: -1, maxCount });
            const duration = Date.now() - start;
            TelemetryCollector.recordEIDExtraction(duration);
            if (!rawDataList || !Array.isArray(rawDataList)) {
                return [];
            }
            return rawDataList.filter(d => !!d).map(d => new ElementIdentityDocument(d));
        } catch (err) {
            return [];
        }
    }

    static get _evaluationScript() {
        return (payload) => {
            const { locator, elementIndex, maxCount = 10 } = payload;

            const extractTextValue = (loc) => {
                const m = loc.match(/^text=(?:"([^"]*)"|'([^']*)'|(.*))/);
                return m ? (m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3])) : loc;
            };

            const findByText = (textVal) => {
                if (typeof document === 'undefined') return [];
                const matches = [];
                if (document.createTreeWalker) {
                    try {
                        const walker = document.createTreeWalker(
                            document.body || document.documentElement,
                            NodeFilter.SHOW_TEXT,
                            null
                        );
                        let node = walker.currentNode || walker.nextNode();
                        while (node && matches.length < maxCount) {
                            if (node.textContent && node.textContent.trim() === textVal) {
                                const target = node.nodeType === 3 ? node.parentElement : node;
                                if (target && !matches.includes(target)) {
                                    if (!target.children || target.children.length === 0 || !Array.from(target.children).some(c => c.textContent && c.textContent.trim() === textVal)) {
                                        matches.push(target);
                                    }
                                }
                            }
                            node = walker.nextNode();
                        }
                    } catch (e) {}
                }
                if (matches.length === 0 && document.querySelectorAll) {
                    try {
                        const all = Array.from(document.querySelectorAll('*'));
                        for (const el of all) {
                            if (el.textContent && el.textContent.trim() === textVal) {
                                if (!el.children || el.children.length === 0 || !Array.from(el.children).some(c => c.textContent && c.textContent.trim() === textVal)) {
                                    if (!matches.includes(el)) matches.push(el);
                                    if (matches.length >= maxCount) break;
                                }
                            }
                        }
                    } catch (e) {}
                }
                return matches;
            };

            const findByRole = (roleLoc) => {
                const roleMatch = roleLoc.match(/^role=([a-zA-Z0-9_-]+)(?:\[name=(?:"([^"]*)"|'([^']*)'|([^\]]*))\])?/);
                if (!roleMatch || typeof document === 'undefined') return [];
                const role = roleMatch[1];
                const name = roleMatch[2] || roleMatch[3] || roleMatch[4];

                const roleTagMap = {
                    button: ['button', 'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]', '[role="button"]'],
                    link: ['a[href]', '[role="link"]'],
                    textbox: ['input:not([type])', 'input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'textarea', '[role="textbox"]'],
                    checkbox: ['input[type="checkbox"]', '[role="checkbox"]'],
                    radio: ['input[type="radio"]', '[role="radio"]'],
                    heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]'],
                    img: ['img', '[role="img"]'],
                    listitem: ['li', '[role="listitem"]'],
                    list: ['ul', 'ol', '[role="list"]']
                };

                const selectors = roleTagMap[role.toLowerCase()] || [`[role="${role}"]`];
                let elements = [];
                for (const sel of selectors) {
                    try {
                        const found = Array.from(document.querySelectorAll(sel));
                        for (const el of found) {
                            if (!elements.includes(el)) elements.push(el);
                        }
                    } catch (e) {}
                }

                if (name) {
                    const unescapedName = name.replace(/\\"/g, '"').replace(/\\'/g, "'");
                    elements = elements.filter(el => {
                        const text = el.textContent ? el.textContent.trim() : '';
                        const ariaLabel = (el.getAttribute && el.getAttribute('aria-label')) ? el.getAttribute('aria-label') : '';
                        const title = (el.getAttribute && el.getAttribute('title')) ? el.getAttribute('title') : '';
                        const val = el.value || '';
                        return text.includes(unescapedName) || ariaLabel === unescapedName || title === unescapedName || val === unescapedName;
                    });
                }
                return elements.slice(0, maxCount);
            };

            let matches = [];
            try {
                if (locator.startsWith('text=') || locator.startsWith('text="') || locator.startsWith("text='")) {
                    matches = findByText(extractTextValue(locator));
                } else if (locator.startsWith('role=')) {
                    matches = findByRole(locator);
                } else if (typeof document !== 'undefined') {
                    matches = Array.from(document.querySelectorAll(locator));
                }
            } catch (err) {
                return elementIndex === -1 ? [] : null;
            }

            const targets = elementIndex === -1 ? matches.slice(0, maxCount) : (matches[elementIndex] ? [matches[elementIndex]] : []);
            if (targets.length === 0) {
                return elementIndex === -1 ? [] : null;
            }

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

            const results = targets.map(el => extractElementData(el));
            return elementIndex === -1 ? results : (results[0] || null);
        };
    }
}
export default SlaveEIDExtractor;
