import { EIDComparator } from './EIDComparator.mjs';
import { SlaveEIDExtractor } from './SlaveEIDExtractor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class VerificationEngine {
    constructor(config = {}) {
        this.minConfidence = config.minThreshold !== undefined ? Number(config.minThreshold) : (config.minConfidence !== undefined ? Number(config.minConfidence) : 0.65);
        this.minThreshold = this.minConfidence;
        this.comparator = new EIDComparator(config.weights || null);
    }

    /**
     * Verifies that the resolved element on the slave matches the master's EID.
     * @param {import('playwright').Page} page Playwright Page
     * @param {string} locator The locator selector string
     * @param {ElementIdentityDocument} originalEID Master-side EID to match against
     * @returns {Promise<{ verified: boolean, similarity: object|null, reason: string|null }>}
     */
    async verify(page, locator, originalEID, options = {}) {
        if (!originalEID) {
            return {
                verified: true,
                similarity: null,
                reason: 'No master EID provided - unique match accepted without verification'
            };
        }

        let slaveEID;
        try {
            slaveEID = await SlaveEIDExtractor.extract(page, locator);
        } catch (e) {
            TelemetryCollector.recordVerification(false, 0);
            return {
                verified: false,
                similarity: null,
                reason: `LF-302: Extraction failed during verification: ${e.message}`
            };
        }

        if (!slaveEID) {
            TelemetryCollector.recordVerification(false, 0);
            return {
                verified: false,
                similarity: null,
                reason: 'LF-302: Element vanished before verification (extracted null EID)'
            };
        }

        const similarity = this.comparator.compare(originalEID, slaveEID);
        
        if (similarity.overallScore < this.minConfidence) {
            TelemetryCollector.recordVerification(false, similarity.overallScore);
            return {
                verified: false,
                similarity,
                reason: `LF-601: Verification failed - confidence (${similarity.overallScore.toFixed(2)}) below minThreshold (${this.minConfidence})`
            };
        }

        if (options && options.checkActionability !== false) {
            const actionability = await this.verifyActionability(page, locator, options);
            if (!actionability.actionable) {
                TelemetryCollector.recordVerification(false, similarity.overallScore);
                return {
                    verified: false,
                    similarity,
                    reason: `LF-602: Actionability verification failed (${actionability.code}): ${actionability.reason}`,
                    actionabilityCode: actionability.code
                };
            }
        }

        TelemetryCollector.recordVerification(true, similarity.overallScore);
        return { verified: true, similarity, reason: 'Verification successful' };
    }

    async verifyActionability(page, locator, options = {}) {
        if (!page || typeof page.evaluate !== 'function') {
            return { actionable: true, reason: 'No page.evaluate available in mock test environment', code: null };
        }

        const monitor = options.pageStateMonitor || options.monitor || null;
        if (monitor && typeof monitor.getMutationRate === 'function') {
            const rate = await monitor.getMutationRate(page);
            const threshold = options.stabilityThreshold !== undefined ? Number(options.stabilityThreshold) : 50;
            if (rate > threshold) {
                return { actionable: false, reason: `LF-602: DOM unstable (mutation rate ${rate.toFixed(1)}/sec exceeds threshold ${threshold})`, code: 'DOM_UNSTABLE' };
            }
        }

        try {
            const actionabilityResult = await page.evaluate(VerificationEngine._actionabilityScript, { locator });
            return actionabilityResult;
        } catch (e) {
            return { actionable: false, reason: `LF-302: Actionability evaluation failed: ${e.message}`, code: 'DETACHED_NODE' };
        }
    }

    static get _actionabilityScript() {
        return (payload) => {
            const { locator } = payload;
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
                        while (node && matches.length < 10) {
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
                                    if (matches.length >= 10) break;
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
                return elements.slice(0, 10);
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
                return { actionable: false, reason: `Invalid selector during actionability check: ${locator}`, code: 'DETACHED_NODE' };
            }

            const el = matches[0] || null;
            if (!el) {
                return { actionable: false, reason: `Element not found for selector: ${locator}`, code: 'DETACHED_NODE' };
            }
            if (el.isConnected === false) {
                return { actionable: false, reason: `Element is detached from DOM: ${locator}`, code: 'DETACHED_NODE' };
            }

            const getStyle = (node) => {
                if (typeof window !== 'undefined' && window.getComputedStyle) {
                    try { return window.getComputedStyle(node) || {}; } catch (e) { return {}; }
                }
                return node.style || {};
            };

            const style = getStyle(el);
            if (style.display === 'none') {
                return { actionable: false, reason: `Element has display: none: ${locator}`, code: 'DISPLAY_NONE' };
            }
            if (style.visibility === 'hidden') {
                return { actionable: false, reason: `Element has visibility: hidden: ${locator}`, code: 'VISIBILITY_HIDDEN' };
            }

            const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0 };
            if (rect.width === 0 && rect.height === 0) {
                return { actionable: false, reason: `Element has 0x0 bounding box: ${locator}`, code: 'ELEMENT_OFFSCREEN' };
            }

            if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
                const centerX = (rect.x !== undefined ? rect.x : rect.left) + (rect.width / 2);
                const centerY = (rect.y !== undefined ? rect.y : rect.top) + (rect.height / 2);
                
                const topElement = document.elementFromPoint(centerX, centerY);
                if (topElement === null) {
                    if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
                        if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
                            return { actionable: false, reason: `Element center point is outside viewport: ${locator}`, code: 'ELEMENT_OFFSCREEN' };
                        }
                    }
                } else if (topElement !== el && !el.contains(topElement) && typeof topElement.contains === 'function' && !topElement.contains(el)) {
                    const topTag = (topElement.nodeName || topElement.tagName || '').toUpperCase();
                    return { actionable: false, reason: `Element is occluded by <${topTag}> at center point (${centerX}, ${centerY}): ${locator}`, code: 'OCCLUDED' };
                }
            }

            return { actionable: true, reason: null, code: null };
        };
    }
}
export default VerificationEngine;
