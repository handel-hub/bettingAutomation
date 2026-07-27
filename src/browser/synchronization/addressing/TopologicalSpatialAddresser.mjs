/**
 * @file TopologicalSpatialAddresser.mjs
 * @description Stage 3 / Phase 5 Algorithm 1: Tri-Layer Topological Signature Generation & Resolution.
 * Uniquely and deterministically identifies target scroll containers across distributed DOM DAGs,
 * Shadow DOM roots, and Out-of-Process Iframes (OOPIFs) without layout thrashing or memory leaks.
 */

import { SpatialIndexCache } from './SpatialIndexCache.mjs';

export class TopologicalSpatialAddresser {
    /**
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.browserId='global'] - Browser session identifier
     * @param {import('../telemetry/SanraTelemetry.mjs').SanraTelemetryCollector} [options.telemetry=null] - Telemetry collector
     * @param {Object} [options.win=null] - Window or global context for DOM operations
     */
    constructor(options = {}) {
        this.browserId = options.browserId || 'global';
        this.telemetry = options.telemetry || null;
        this.win = options.win || (typeof window !== 'undefined' ? window : null);
        this.cache = new SpatialIndexCache(options.maxCacheEntries || 128);

        this.resolutionSuccessCount = 0;
        this.resolutionFailureCount = 0;
    }

    static ROLE_TABLE = [
        '', 'main', 'nav', 'header', 'footer', 'aside', 'section', 'region', 'form', 'search',
        'banner', 'contentinfo', 'list', 'listitem', 'feed', 'grid', 'table', 'row', 'cell',
        'article', 'complementary', 'dialog', 'document', 'application', 'body', 'div', 'span', 'ul', 'ol', 'li'
    ];

    /**
     * Maps an ARIA role or tag name string to a 16-bit unsigned integer via static lookup table (Section 5.1).
     * @param {string} roleStr
     * @returns {number} 16-bit unsigned integer [0 - 65535]
     */
    static encodeRole(roleStr) {
        if (!roleStr) return 0;
        const lower = String(roleStr).toLowerCase();
        const idx = TopologicalSpatialAddresser.ROLE_TABLE.indexOf(lower);
        if (idx !== -1) return idx;
        // For custom or unlisted roles, compute 15-bit FNV-1a hash with MSB set (0x8000 - 0xFFFF)
        return (TopologicalSpatialAddresser.computeFNV1a(lower) & 0x7FFF) | 0x8000;
    }

    /**
     * Decodes a 16-bit role ID back to its canonical string representation.
     * @param {number} roleId
     * @returns {string}
     */
    static decodeRole(roleId) {
        const id = roleId & 0xFFFF;
        if (id < TopologicalSpatialAddresser.ROLE_TABLE.length) {
            return TopologicalSpatialAddresser.ROLE_TABLE[id];
        }
        return `custom_${id.toString(16)}`;
    }

    /**
     * Computes the 32-bit unsigned FNV-1a integer hash for a string (Section 5.1).
     * @param {string} str
     * @returns {number} 32-bit unsigned integer
     */
    static computeFNV1a(str) {
        let hash = 0x811c9dc5;
        const len = str ? str.length : 0;
        for (let i = 0; i < len; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash >>> 0;
    }

    /**
     * Computes the tree depth of a DOM element relative to document root.
     * @param {Object} el
     * @returns {number}
     */
    static computeDepth(el) {
        let depth = 0;
        let current = el;
        while (current && (current.parentElement || current.parentNode)) {
            const parent = current.parentElement || current.parentNode;
            if (parent.nodeType !== 1) break; // Stop at non-element boundaries like Document/DocumentFragment unless needed
            depth++;
            current = parent;
        }
        return depth;
    }

    /**
     * Extracts the canonical ARIA role or lowercase tag name of an element.
     * @param {Object} el
     * @returns {string}
     */
    static extractRole(el) {
        if (!el) return '';
        if (el.role !== undefined && el.role !== null && el.role !== '') return String(el.role).toLowerCase();
        if (el.getAttribute && typeof el.getAttribute === 'function') {
            const attrRole = el.getAttribute('role');
            if (attrRole) return String(attrRole).toLowerCase();
        }
        return (el.tagName || el.nodeName || '').toLowerCase();
    }

    /**
     * Computes the 32-bit FNV-1a node signature hash for an element.
     * @param {Object} el
     * @returns {number} 32-bit unsigned integer
     */
    static computeNodeHash(el) {
        if (!el) return 0;
        const depth = TopologicalSpatialAddresser.computeDepth(el);
        const role = TopologicalSpatialAddresser.extractRole(el);
        const id = el.id || '';
        const className = typeof el.className === 'string' ? el.className : '';
        const str = `${depth}:${role}:${id}:${className}`;
        return TopologicalSpatialAddresser.computeFNV1a(str);
    }

    /**
     * Helper to check if an element is an active scroll container.
     * @param {Object} el
     * @param {Object} [win=null]
     * @returns {boolean}
     */
    static isScrollContainer(el, win = null) {
        if (!el) return false;
        const doc = (win && win.document) || (typeof document !== 'undefined' ? document : null);
        if (doc && (el === doc.scrollingElement || el === doc.documentElement || el === doc.body)) {
            return true;
        }

        const scrollH = el.scrollHeight !== undefined ? el.scrollHeight : (el._rect ? el._rect.height * 2 : 0);
        const clientH = el.clientHeight !== undefined ? el.clientHeight : (el._rect ? el._rect.height : 0);
        if (scrollH <= clientH) return false;

        let overflowY = '';
        const targetWin = win || (typeof window !== 'undefined' ? window : null);
        if (targetWin && targetWin.getComputedStyle && typeof targetWin.getComputedStyle === 'function') {
            try {
                const style = targetWin.getComputedStyle(el);
                overflowY = style ? (style.overflowY || style.overflow || '') : '';
            } catch (e) {}
        }
        if (!overflowY && el.style) {
            overflowY = el.style.overflowY || el.style.overflow || '';
        }
        if (!overflowY && el._attributes && typeof el._attributes.get === 'function') {
            overflowY = el._attributes.get('overflow-y') || el._attributes.get('overflow') || '';
        }

        return overflowY === 'scroll' || overflowY === 'auto' || overflowY === 'overlay' || overflowY === 'mock-scroll';
    }

    /**
     * Generates an invariant topological signature tuple for a target element on the Master.
     * @param {Object} target - Target container element
     * @param {number} [x=0] - Pointer X coordinate in viewport px
     * @param {number} [y=0] - Pointer Y coordinate in viewport px
     * @returns {Object} TopologicalNodeSignature
     */
    generateSignature(target, x = 0, y = 0) {
        if (!target) {
            throw new Error('Cannot generate topological signature for null or undefined target');
        }

        const depth = TopologicalSpatialAddresser.computeDepth(target);
        const role = TopologicalSpatialAddresser.extractRole(target);
        const nodeHash = TopologicalSpatialAddresser.computeNodeHash(target);

        let rect = { width: 0, height: 0, top: 0, left: 0 };
        if (target.getBoundingClientRect && typeof target.getBoundingClientRect === 'function') {
            rect = target.getBoundingClientRect();
        } else if (target._rect) {
            rect = target._rect;
        }

        const winWidth = (this.win && (this.win.innerWidth || this.win.document?.documentElement?.clientWidth)) || 1920;
        const winHeight = (this.win && (this.win.innerHeight || this.win.document?.documentElement?.clientHeight)) || 1080;

        const rx = rect.width / (winWidth || 1);
        const ry = rect.height / (winHeight || 1);

        const scrollH = target.scrollHeight !== undefined ? target.scrollHeight : (rect.height * 2);
        const clientH = target.clientHeight !== undefined ? target.clientHeight : rect.height;

        // Cache in local LRU index
        this.cache.put(nodeHash, target, rect, scrollH, clientH);

        return {
            nodeHash,
            depth,
            role,
            roleId: TopologicalSpatialAddresser.encodeRole(role),
            rx,
            ry,
            tagName: (target.tagName || target.nodeName || '').toUpperCase(),
            id: target.id || '',
            className: typeof target.className === 'string' ? target.className : '',
            pointerX: x,
            pointerY: y
        };
    }

    /**
     * Resolves the target scroll container on the Slave using Tri-Layer resolution logic (Section 5.1).
     * @param {Object} sig - Incoming Master topological signature
     * @param {number} [nx=0] - Normalized pointer X [0.0 - 1.0]
     * @param {number} [ny=0] - Normalized pointer Y [0.0 - 1.0]
     * @param {Array<Object>} [candidateOverride=null] - Optional candidate array for unit testing offline
     * @returns {Object} Resolved DOM element (HTMLElement)
     */
    resolveTarget(sig, nx = 0, ny = 0, candidateOverride = null) {
        const startTime = Date.now();

        // --- Step 1: Fast Path Hit-Test ---
        if (this.win && this.win.document && typeof this.win.document.elementFromPoint === 'function') {
            const winWidth = this.win.innerWidth || this.win.document.documentElement?.clientWidth || 1920;
            const winHeight = this.win.innerHeight || this.win.document.documentElement?.clientHeight || 1080;
            const px = nx * winWidth;
            const py = ny * winHeight;

            let hitEl = null;
            try {
                hitEl = this.win.document.elementFromPoint(px, py);
            } catch (e) {}

            if (hitEl) {
                let current = hitEl;
                while (current) {
                    if (TopologicalSpatialAddresser.isScrollContainer(current, this.win)) {
                        const hash = TopologicalSpatialAddresser.computeNodeHash(current);
                        if (hash === sig.nodeHash) {
                            this.resolutionSuccessCount++;
                            this.cache.put(hash, current);
                            if (this.telemetry) {
                                this.telemetry.emitEvent('TargetResolvedFastPath', {
                                    browserId: this.browserId,
                                    payload: {
                                        nodeHash: hash,
                                        latencyMs: Date.now() - startTime
                                    }
                                });
                            }
                            return current;
                        }
                    }
                    current = current.parentElement || current.parentNode;
                    if (current && current.nodeType !== 1) break;
                }
            }
        }

        // --- Step 2: LRU Cache Lookup & Structural Similarity Fallback ---
        // 2a. Check if exact nodeHash exists in LRU cache and is still valid
        const cachedEl = this.cache.lookupByHash(sig.nodeHash);
        if (cachedEl && TopologicalSpatialAddresser.isScrollContainer(cachedEl, this.win)) {
            this.resolutionSuccessCount++;
            if (this.telemetry) {
                this.telemetry.emitEvent('TargetResolvedCacheHit', {
                    browserId: this.browserId,
                    payload: {
                        nodeHash: sig.nodeHash,
                        latencyMs: Date.now() - startTime
                    }
                });
            }
            return cachedEl;
        }

        // 2b. Structural Similarity Fallback across all active scroll containers
        let candidates = candidateOverride;
        if (!candidates) {
            candidates = [];
            // Retrieve from DOM or active cache
            if (this.win && this.win.document && typeof this.win.document.querySelectorAll === 'function') {
                const allNodes = this.win.document.querySelectorAll('*');
                for (let i = 0; i < allNodes.length; i++) {
                    const node = allNodes[i];
                    if (TopologicalSpatialAddresser.isScrollContainer(node, this.win)) {
                        candidates.push(node);
                    }
                }
            } else {
                // In offline mock environments without querySelectorAll, use active entries in cache
                const entries = this.cache.getAllActiveEntries();
                for (const item of entries) {
                    if (TopologicalSpatialAddresser.isScrollContainer(item.element, this.win)) {
                        candidates.push(item.element);
                    }
                }
            }
        }

        let bestCandidate = null;
        let maxSigma = -1;
        const winWidth = (this.win && (this.win.innerWidth || this.win.document?.documentElement?.clientWidth)) || 1920;
        const winHeight = (this.win && (this.win.innerHeight || this.win.document?.documentElement?.clientHeight)) || 1080;

        // Calculate D_max among candidates and Master
        let dMax = Math.max(1, sig.depth || 1);
        const candData = [];

        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            const d = TopologicalSpatialAddresser.computeDepth(cand);
            if (d > dMax) dMax = d;

            let rect = { width: 0, height: 0 };
            if (cand.getBoundingClientRect && typeof cand.getBoundingClientRect === 'function') {
                rect = cand.getBoundingClientRect();
            } else if (cand._rect) {
                rect = cand._rect;
            }
            const rx = rect.width / winWidth;
            const ry = rect.height / winHeight;
            const role = TopologicalSpatialAddresser.extractRole(cand);

            candData.push({ cand, d, rx, ry, role });
        }

        for (let i = 0; i < candData.length; i++) {
            const item = candData[i];
            // Enforce role/roleId/tagName match if specified
            const roleMatch = item.role === (sig.role || '') ||
                              (sig.roleId !== undefined && TopologicalSpatialAddresser.encodeRole(item.role) === sig.roleId) ||
                              (item.cand.tagName || item.cand.nodeName || '').toUpperCase() === (sig.tagName || '');
            if (!roleMatch) continue;

            const depthDiff = Math.abs(item.d - (sig.depth || 0)) / dMax;
            const rxDiff = Math.abs(item.rx - (sig.rx || 0));
            const ryDiff = Math.abs(item.ry - (sig.ry || 0));

            // Formula (Section 5.1): σ = 1.0 - (0.4 * depthDiff + 0.3 * rxDiff + 0.3 * ryDiff)
            const sigma = 1.0 - (0.4 * depthDiff + 0.3 * rxDiff + 0.3 * ryDiff);
            if (sigma > maxSigma) {
                maxSigma = sigma;
                bestCandidate = item.cand;
            }
        }

        if (bestCandidate && maxSigma >= 0.85) {
            this.resolutionSuccessCount++;
            const hash = TopologicalSpatialAddresser.computeNodeHash(bestCandidate);
            this.cache.put(hash, bestCandidate);

            if (this.telemetry) {
                this.telemetry.emitEvent('TargetResolvedSimilarityFallback', {
                    browserId: this.browserId,
                    payload: {
                        nodeHash: hash,
                        similarityScore: maxSigma,
                        latencyMs: Date.now() - startTime
                    }
                });
            }
            return bestCandidate;
        }

        // --- Step 3: Ultimate Fallback ---
        this.resolutionFailureCount++;
        const fallbackEl = (this.win && this.win.document && (this.win.document.scrollingElement || this.win.document.documentElement || this.win.document.body)) || null;

        if (this.telemetry) {
            this.telemetry.emitFailure('SS-005', {
                browserId: this.browserId,
                targetSignature: sig,
                maxSigmaAchieved: maxSigma,
                candidateCount: candidates.length,
                reason: 'No scroll container candidate achieved similarity score >= 0.85'
            });
            this.telemetry.emitEvent('TargetResolutionFailure', {
                browserId: this.browserId,
                payload: {
                    errorCode: 'SS-005',
                    targetSignature: sig,
                    maxSigmaAchieved: maxSigma,
                    candidateCount: candidates.length
                }
            });
        }

        return fallbackEl;
    }
}
