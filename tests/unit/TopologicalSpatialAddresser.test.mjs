import { describe, it, expect, beforeEach } from 'vitest';
import {
    TopologicalSpatialAddresser,
    SpatialIndexCache,
    SanraTelemetryCollector
} from '../../src/browser/synchronization/index.mjs';

class MockEl {
    constructor({
        tagName = 'DIV',
        id = '',
        className = '',
        role = null,
        scrollHeight = 500,
        clientHeight = 200,
        rect = { width: 400, height: 200, top: 50, left: 50 },
        parent = null,
        overflowY = 'auto'
    } = {}) {
        this.tagName = tagName.toUpperCase();
        this.nodeName = this.tagName;
        this.nodeType = 1;
        this.id = id;
        this.className = className;
        this.role = role;
        this.scrollHeight = scrollHeight;
        this.clientHeight = clientHeight;
        this._rect = rect;
        this.parentElement = parent;
        this.parentNode = parent;
        this.style = { overflowY };
    }
    getBoundingClientRect() {
        return this._rect;
    }
    getAttribute(attr) {
        if (attr === 'role') return this.role;
        return null;
    }
}

describe('Stage 3 / Phase 5 — Topological Spatial Addresser (Algorithm 1 Unit Tests)', () => {
    let telemetry;
    let addresser;

    beforeEach(() => {
        telemetry = new SanraTelemetryCollector({ browserId: 'slave-1' });
        addresser = new TopologicalSpatialAddresser({ browserId: 'slave-1', telemetry, maxCacheEntries: 10 });
    });

    describe('SpatialIndexCache (Section 4.2.2 Zero-Allocation LRU)', () => {
        it('pre-allocates fixed pool slots and updates entries without heap allocations', () => {
            const cache = new SpatialIndexCache(4);
            expect(cache.activeCount).toBe(0);
            expect(cache.pool).toHaveLength(4);

            const el1 = new MockEl({ id: 'c1' });
            const hash1 = TopologicalSpatialAddresser.computeNodeHash(el1);
            const slot1 = cache.put(hash1, el1, el1.getBoundingClientRect(), 500, 200);

            expect(cache.activeCount).toBe(1);
            expect(slot1.nodeHash).toBe(hash1);
            expect(cache.lookupByHash(hash1)).toBe(el1);

            // Update same element in place
            const slot1Updated = cache.put(hash1, el1, { width: 450, height: 250 }, 600, 250);
            expect(slot1Updated).toBe(slot1); // Same slot object reused in place
            expect(cache.activeCount).toBe(1);
        });

        it('evicts least recently used (LRU) entry when pool capacity is exceeded', async () => {
            const cache = new SpatialIndexCache(2);
            const el1 = new MockEl({ id: 'c1' });
            const el2 = new MockEl({ id: 'c2' });
            const el3 = new MockEl({ id: 'c3' });

            const h1 = TopologicalSpatialAddresser.computeNodeHash(el1);
            const h2 = TopologicalSpatialAddresser.computeNodeHash(el2);
            const h3 = TopologicalSpatialAddresser.computeNodeHash(el3);

            cache.put(h1, el1);
            // Artificial delay to separate timestamps
            await new Promise(r => setTimeout(r, 10));
            cache.put(h2, el2);

            expect(cache.activeCount).toBe(2);

            // Inserting 3rd element should evict el1 (oldest timestamp)
            await new Promise(r => setTimeout(r, 10));
            cache.put(h3, el3);

            expect(cache.activeCount).toBe(2);
            expect(cache.lookupByHash(h1)).toBeNull(); // Evicted!
            expect(cache.lookupByHash(h2)).toBe(el2);
            expect(cache.lookupByHash(h3)).toBe(el3);
        });

        it('clears all active slots on invalidate/clear', () => {
            const cache = new SpatialIndexCache(4);
            const el = new MockEl({ id: 'c1' });
            cache.put(12345, el);
            expect(cache.activeCount).toBe(1);

            cache.clear();
            expect(cache.activeCount).toBe(0);
            expect(cache.lookupByHash(12345)).toBeNull();
        });
    });

    describe('TopologicalSpatialAddresser (Algorithm 1 Tri-Layer Resolution)', () => {
        it('generates deterministic 32-bit unsigned FNV-1a signatures for target scroll containers', () => {
            const root = new MockEl({ tagName: 'BODY', scrollHeight: 2000, clientHeight: 1080 });
            const parent = new MockEl({ tagName: 'SECTION', parent: root, scrollHeight: 1080, clientHeight: 1080, overflowY: 'visible' });
            const target = new MockEl({
                tagName: 'DIV',
                id: 'feed-list',
                className: 'scroll-container active',
                role: 'feed',
                scrollHeight: 5000,
                clientHeight: 800,
                rect: { width: 960, height: 800, top: 100, left: 100 },
                parent: parent,
                overflowY: 'scroll'
            });

            const sig = addresser.generateSignature(target, 200, 300);

            expect(sig.depth).toBe(2); // body -> section -> div
            expect(sig.role).toBe('feed');
            expect(typeof sig.nodeHash).toBe('number');
            expect(sig.nodeHash).toBeGreaterThan(0); // 32-bit unsigned integer
            expect(sig.rx).toBeCloseTo(960 / 1920, 4);
            expect(sig.ry).toBeCloseTo(800 / 1080, 4);

            // Verify element was indexed in cache
            expect(addresser.cache.lookupByHash(sig.nodeHash)).toBe(target);
        });

        it('resolves target via Step 1 Fast Path Hit-Test when elementFromPoint hits exact hash', () => {
            const target = new MockEl({ id: 'grid-view', role: 'grid', scrollHeight: 3000, clientHeight: 600 });
            const sig = addresser.generateSignature(target, 500, 400);

            // Mock window with elementFromPoint returning target
            addresser.win = {
                innerWidth: 1920,
                innerHeight: 1080,
                document: {
                    elementFromPoint: (px, py) => target,
                    scrollingElement: new MockEl({ tagName: 'HTML' })
                },
                getComputedStyle: (el) => ({ overflowY: el.style.overflowY })
            };

            const resolved = addresser.resolveTarget(sig, 500 / 1920, 400 / 1080);
            expect(resolved).toBe(target);
            expect(addresser.resolutionSuccessCount).toBe(1);

            const events = telemetry.getEvents().filter(e => e.eventName === 'TargetResolvedFastPath');
            expect(events).toHaveLength(1);
        });

        it('resolves target via Step 2 Structural Similarity Fallback when class names shift or fast path misses', () => {
            const original = new MockEl({
                id: 'dynamic-feed',
                className: 'feed-v1 old-class',
                role: 'feed',
                scrollHeight: 4000,
                clientHeight: 900,
                rect: { width: 1000, height: 900 }
            });
            const sig = addresser.generateSignature(original, 100, 100);

            // Clear cache so it must scan candidates
            addresser.cache.clear();

            // On Slave, the class name changed dynamically to 'feed-v2 new-class', causing FNV-1a hash mismatch
            const slaveCandidate = new MockEl({
                id: 'dynamic-feed',
                className: 'feed-v2 new-class',
                role: 'feed',
                scrollHeight: 4200,
                clientHeight: 900,
                rect: { width: 1000, height: 900 }
            });

            // Fast path returns null
            addresser.win = {
                innerWidth: 1920,
                innerHeight: 1080,
                document: {
                    elementFromPoint: () => null,
                    scrollingElement: new MockEl({ tagName: 'HTML' })
                },
                getComputedStyle: (el) => ({ overflowY: el.style.overflowY })
            };

            const resolved = addresser.resolveTarget(sig, 0.1, 0.1, [slaveCandidate]);
            expect(resolved).toBe(slaveCandidate);
            expect(addresser.resolutionSuccessCount).toBe(1);

            const simEvents = telemetry.getEvents().filter(e => e.eventName === 'TargetResolvedSimilarityFallback');
            expect(simEvents).toHaveLength(1);
            expect(simEvents[0].payload.similarityScore).toBeGreaterThanOrEqual(0.85);
        });

        it('executes Step 3 Ultimate Fallback to root scrollingElement when similarity score < 0.85', () => {
            const original = new MockEl({ id: 'target-a', role: 'list', rect: { width: 500, height: 500 } });
            const sig = addresser.generateSignature(original, 50, 50);
            addresser.cache.clear();

            // Completely unrelated candidate on Slave
            const badCandidate = new MockEl({
                id: 'unrelated-sidebar',
                role: 'navigation', // Role mismatch!
                rect: { width: 200, height: 1000 }
            });

            const rootScroller = new MockEl({ tagName: 'HTML', scrollHeight: 5000, clientHeight: 1080 });
            addresser.win = {
                innerWidth: 1920,
                innerHeight: 1080,
                document: {
                    elementFromPoint: () => null,
                    scrollingElement: rootScroller
                },
                getComputedStyle: (el) => ({ overflowY: el.style.overflowY })
            };

            const resolved = addresser.resolveTarget(sig, 0.5, 0.5, [badCandidate]);
            expect(resolved).toBe(rootScroller); // Fallback to root!
            expect(addresser.resolutionFailureCount).toBe(1);

            const failEvents = telemetry.getEvents().filter(e => e.eventName === 'TargetResolutionFailure');
            expect(failEvents).toHaveLength(1);
            expect(failEvents[0].payload.errorCode).toBe('SS-005');
        });
    });
});
