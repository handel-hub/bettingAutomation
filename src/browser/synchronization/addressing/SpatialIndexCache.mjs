/**
 * @file SpatialIndexCache.mjs
 * @description Zero-allocation LRU spatial index cache for SANRA Topological Spatial Addresser (Section 4.2.2).
 * Pre-allocates a fixed pool of 128 cache entries per document to prevent heap garbage creation
 * during high-frequency runtime hit-testing and structural resolution.
 */

const createRef = typeof WeakRef !== 'undefined' ? (el => new WeakRef(el)) : (el => ({ deref: () => el }));

export class SpatialIndexCache {
    /**
     * @param {number} [maxEntries=128] - Maximum number of pre-allocated entries in the pool (default 128)
     */
    constructor(maxEntries = 128) {
        this.maxEntries = maxEntries;
        this.pool = new Array(maxEntries);
        this.activeCount = 0;
        this._initPool();
    }

    /**
     * Pre-allocates entry slots to enforce zero heap allocation during runtime operations.
     * @private
     */
    _initPool() {
        for (let i = 0; i < this.maxEntries; i++) {
            this.pool[i] = {
                nodeHash: 0,
                elementRef: null,
                lastBoundingRect: null,
                lastScrollHeight: 0,
                lastClientHeight: 0,
                lastSeenTimestamp: 0,
                active: false
            };
        }
    }

    /**
     * Acquires or updates a cache entry in place for the given nodeHash and element.
     * Enforces LRU eviction if all slots are active.
     * 
     * @param {number} nodeHash - 32-bit FNV-1a Hash of Node Signature (unsigned integer)
     * @param {Object} element - DOM Element or MockElement reference
     * @param {Object} [rect=null] - Bounding rectangle
     * @param {number} [scrollHeight=0] - Element scroll height
     * @param {number} [clientHeight=0] - Element client height
     * @returns {Object} The updated cache entry slot
     */
    put(nodeHash, element, rect = null, scrollHeight = 0, clientHeight = 0) {
        const now = Date.now();
        const hashU32 = nodeHash >>> 0;

        // 1. Check if we already have an active entry for this nodeHash or element
        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (slot.active) {
                const el = slot.elementRef ? slot.elementRef.deref() : null;
                if (!el || el === undefined) {
                    // Expired WeakRef: reclaim this slot immediately
                    slot.active = false;
                    this.activeCount--;
                    continue;
                }
                if (slot.nodeHash === hashU32 || el === element) {
                    slot.nodeHash = hashU32;
                    slot.elementRef = createRef(element);
                    slot.lastBoundingRect = rect;
                    slot.lastScrollHeight = scrollHeight;
                    slot.lastClientHeight = clientHeight;
                    slot.lastSeenTimestamp = now;
                    return slot;
                }
            }
        }

        // 2. Find an inactive slot
        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (!slot.active) {
                slot.active = true;
                slot.nodeHash = hashU32;
                slot.elementRef = createRef(element);
                slot.lastBoundingRect = rect;
                slot.lastScrollHeight = scrollHeight;
                slot.lastClientHeight = clientHeight;
                slot.lastSeenTimestamp = now;
                this.activeCount++;
                return slot;
            }
        }

        // 3. LRU Eviction: Evict the slot with the oldest lastSeenTimestamp
        let oldestIndex = 0;
        let oldestTime = Infinity;
        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (slot.lastSeenTimestamp < oldestTime) {
                oldestTime = slot.lastSeenTimestamp;
                oldestIndex = i;
            }
        }

        const evictSlot = this.pool[oldestIndex];
        evictSlot.nodeHash = hashU32;
        evictSlot.elementRef = createRef(element);
        evictSlot.lastBoundingRect = rect;
        evictSlot.lastScrollHeight = scrollHeight;
        evictSlot.lastClientHeight = clientHeight;
        evictSlot.lastSeenTimestamp = now;
        evictSlot.active = true;

        return evictSlot;
    }

    /**
     * Looks up an active cached element by its 32-bit FNV-1a hash.
     * Updates lastSeenTimestamp on hit. Reclaims slot if WeakRef is expired.
     * 
     * @param {number} nodeHash - 32-bit FNV-1a unsigned integer
     * @returns {Object|null} Cached DOM Element or null if not found/expired
     */
    lookupByHash(nodeHash) {
        const hashU32 = nodeHash >>> 0;
        const now = Date.now();

        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (slot.active && slot.nodeHash === hashU32) {
                const el = slot.elementRef ? slot.elementRef.deref() : null;
                if (!el || el === undefined) {
                    slot.active = false;
                    this.activeCount--;
                    return null;
                }
                slot.lastSeenTimestamp = now;
                return el;
            }
        }
        return null;
    }

    /**
     * Returns an array of all active, non-expired elements in the cache.
     * Useful for fast structural similarity fallback scanning without querying DOM.
     * 
     * @returns {Array<{ element: Object, entry: Object }>}
     */
    getAllActiveEntries() {
        const results = [];
        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (slot.active) {
                const el = slot.elementRef ? slot.elementRef.deref() : null;
                if (!el || el === undefined) {
                    slot.active = false;
                    this.activeCount--;
                    continue;
                }
                results.push({ element: el, entry: slot });
            }
        }
        return results;
    }

    /**
     * Invalidates and clears all active cache entries (e.g. on DOM mutation or layout shift).
     */
    clear() {
        for (let i = 0; i < this.maxEntries; i++) {
            const slot = this.pool[i];
            if (slot.active) {
                slot.active = false;
                slot.elementRef = null;
                slot.lastBoundingRect = null;
            }
        }
        this.activeCount = 0;
    }
}
