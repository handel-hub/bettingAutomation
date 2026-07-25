import { logger } from '../../../../config.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class BatchResult {
    constructor({ results, timing, success = true, error = null }) {
        this.results = results || [];
        this.timing = timing || { evaluateMs: 0, roundTripMs: 0 };
        this.success = success;
        this.error = error;
    }
}

export class BatchResolver {
    /**
     * Resolves multiple candidate locators in a single browser round-trip.
     * @param {import('playwright').Page} page Playwright Page instance
     * @param {Array} candidates Array of LocatorCandidate objects or strings
     * @param {Object} profile Validation profile
     * @returns {Promise<BatchResult>}
     */
    static async resolve(page, candidates, profile = {}, options = {}) {
        const startTime = Date.now();
        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
            return new BatchResult({ results: [], timing: { evaluateMs: 0, roundTripMs: 0 }, success: false, error: 'No candidates provided' });
        }

        // Phase 14: Stale Candidate Pre-filtering
        let filteredCandidates = candidates;
        if (options.epochGate && options.browserId) {
            const record = options.epochGate.getEpochRecord(options.browserId);
            const isRecentNavigation = record && record.timestamp && (Date.now() - record.timestamp < 3000);
            if (isRecentNavigation) {
                // Discard structural candidates because they are likely stale immediately after navigation
                filteredCandidates = candidates.filter(c => {
                    const strategy = typeof c === 'string' ? 'unknown' : (c.strategy || 'unknown');
                    return strategy !== 'structural';
                });
                
                if (filteredCandidates.length === 0) {
                    return new BatchResult({ results: [], timing: { evaluateMs: 0, roundTripMs: 0 }, success: false, error: '[LF-606] All candidates filtered out due to recent navigation' });
                }
            }
        }

        const payload = {
            candidates: filteredCandidates.map((c, idx) => ({
                id: c && typeof c === 'object' && c.id ? c.id : `cand-${idx}`,
                locator: typeof c === 'string' ? c : (c ? c.locator : ''),
                strategy: typeof c === 'string' ? 'unknown' : (c && c.strategy ? c.strategy : 'unknown')
            })),
            profile,
            shadowPath: options.shadowPath || []
        };

        try {
            const evalResponse = await page.evaluate(this._evaluationScript, payload);
            const roundTripMs = Date.now() - startTime;
            TelemetryCollector.recordBatchResolution(roundTripMs, candidates.length, 1);
            return new BatchResult({
                results: evalResponse.results || [],
                timing: {
                    evaluateMs: evalResponse.evaluateMs || 0,
                    roundTripMs
                },
                success: true
            });
        } catch (err) {
            const roundTripMs = Date.now() - startTime;
            TelemetryCollector.recordBatchResolution(roundTripMs, candidates.length, 1);
            logger.warn(`[BatchResolver] Evaluation failed: ${err.message}`);
            return new BatchResult({
                results: payload.candidates.map(c => ({
                    candidateId: c.id,
                    locator: c.locator,
                    count: 0,
                    visible: null,
                    enabled: null,
                    error: err.message
                })),
                timing: { evaluateMs: 0, roundTripMs },
                success: false,
                error: err.message
            });
        }
    }

    /**
     * Categorizes batch evaluation results into unique, ambiguous, missing, and invalid buckets.
     * Preserves relative priority/rank from original candidates.
     * @param {BatchResult} batchResult 
     * @param {Array} candidates Optional original candidates array to preserve metadata
     * @returns {{ unique: Array, ambiguous: Array, missing: Array, invalid: Array }}
     */
    static categorize(batchResult, candidates = null) {
        const unique = [];
        const ambiguous = [];
        const missing = [];
        const invalid = [];

        const candMap = new Map();
        if (candidates && Array.isArray(candidates)) {
            for (const c of candidates) {
                if (c && typeof c === 'object') {
                    if (c.id) candMap.set(c.id, c);
                    if (c.locator) candMap.set(c.locator, c);
                }
            }
        }

        for (const res of (batchResult?.results || [])) {
            const originalCand = candMap.get(res.candidateId) || candMap.get(res.locator);
            const item = {
                candidateId: res.candidateId,
                locator: res.locator,
                count: res.count,
                visible: res.visible,
                enabled: res.enabled,
                error: res.error,
                candidate: originalCand || { id: res.candidateId, locator: res.locator, strategy: 'unknown', rank: 999 },
                rank: originalCand?.rank ?? 999,
                strategy: originalCand?.strategy ?? 'unknown'
            };

            if (res.error !== null && res.error !== undefined) {
                invalid.push(item);
            } else if (res.count === 0) {
                missing.push(item);
            } else if (res.count === 1) {
                unique.push(item);
            } else if (res.count > 1) {
                ambiguous.push(item);
            }
        }

        return { unique, ambiguous, missing, invalid };
    }

    /**
     * In-browser evaluation script to test all locators simultaneously.
     * @param {Object} payload 
     */
    static _evaluationScript(payload) {
        const nowFn = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') ? () => performance.now() : () => Date.now();
        const start = nowFn();
        const results = [];
        const { candidates, shadowPath } = payload || { candidates: [], shadowPath: [] };

        let rootNode = (typeof document !== 'undefined') ? document : null;
        let walkerRoot = (typeof document !== 'undefined') ? (document.body || document.documentElement || document) : null;

        if (shadowPath && shadowPath.length > 0 && typeof document !== 'undefined') {
            let current = document;
            for (const segment of shadowPath) {
                const host = current.querySelector(segment);
                if (host && host.shadowRoot) {
                    current = host.shadowRoot;
                } else {
                    current = null;
                    break;
                }
            }
            rootNode = current; // Will be null if shadow root closed or invalid
            walkerRoot = current;
        }

        const getStyle = (el) => {
            if (typeof window !== 'undefined' && window && window.getComputedStyle && typeof window.getComputedStyle === 'function') {
                return window.getComputedStyle(el) || {};
            }
            return el.style || {};
        };

        const isElementVisible = (el) => {
            if (!el) return false;
            if (el._visible === false) return false;
            const style = getStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rect = (el.getBoundingClientRect && typeof el.getBoundingClientRect === 'function') ? el.getBoundingClientRect() : { height: 0, width: 0 };
            return (el.offsetParent !== null || style.position === 'fixed' || el.tagName === 'BODY' || el.tagName === 'HTML') && rect.height > 0 && rect.width > 0;
        };

        const isElementEnabled = (el) => {
            if (!el) return false;
            if (el.disabled || (el.getAttribute && el.getAttribute('aria-disabled') === 'true') || (el.classList && el.classList.contains && el.classList.contains('disabled'))) {
                return false;
            }
            return true;
        };

        const extractTextValue = (loc) => {
            if (loc.startsWith('text="') && loc.endsWith('"')) {
                return loc.slice(6, -1).replace(/\\"/g, '"');
            }
            if (loc.startsWith("text='") && loc.endsWith("'")) {
                return loc.slice(6, -1).replace(/\\'/g, "'");
            }
            if (loc.startsWith('text=')) {
                return loc.slice(5);
            }
            return loc;
        };

        const findByText = (textVal) => {
            const matches = [];
            if (!walkerRoot || !document.createTreeWalker) return matches;
            const walker = document.createTreeWalker(walkerRoot, (typeof NodeFilter !== 'undefined' && NodeFilter.SHOW_ELEMENT) ? NodeFilter.SHOW_ELEMENT : 1);
            let node = walker.currentNode || walker.nextNode();
            while (node && matches.length < 10) {
                if (node.textContent && node.textContent.trim() === textVal) {
                    if (!node.children || node.children.length === 0 || !Array.from(node.children).some(c => c.textContent && c.textContent.trim() === textVal)) {
                        matches.push(node);
                    }
                }
                node = walker.nextNode();
            }
            return matches;
        };

        const findByRole = (roleLoc) => {
            if (!rootNode) return [];
            const roleMatch = roleLoc.match(/^role=([a-zA-Z0-9_-]+)(?:\[name=(?:"([^"]*)"|'([^']*)'|([^\]]*))\])?/);
            if (!roleMatch) return [];
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
                    const found = Array.from(rootNode.querySelectorAll(sel));
                    for (const el of found) {
                        if (!elements.includes(el)) elements.push(el);
                    }
                } catch (e) {
                    // ignore unsupported sub-selector
                }
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

        for (const cand of candidates) {
            const loc = cand.locator || '';
            let matches = [];
            let error = null;

            try {
                if (!rootNode) {
                    error = 'Error: Shadow DOM unreachable';
                } else if (loc.startsWith('text=') || loc.startsWith('text="') || loc.startsWith("text='")) {
                    const textVal = extractTextValue(loc);
                    matches = findByText(textVal);
                } else if (loc.startsWith('role=')) {
                    matches = findByRole(loc);
                } else {
                    matches = Array.from(rootNode.querySelectorAll(loc));
                }
            } catch (err) {
                error = err.message || 'SyntaxError: Invalid selector';
            }

            const count = error ? 0 : matches.length;
            let visible = null;
            let enabled = null;

            if (count > 0) {
                visible = matches.some(el => isElementVisible(el));
                enabled = matches.some(el => isElementEnabled(el));
            }

            results.push({
                candidateId: cand.id,
                locator: loc,
                count,
                visible,
                enabled,
                error
            });
        }

        const evaluateMs = performance.now() - start;
        return { results, evaluateMs };
    }
}
