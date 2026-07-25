import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResolutionMemory } from '../memory/ResolutionMemory.mjs';
import { StrategySuccessTracker } from '../memory/StrategySuccessTracker.mjs';

describe('Phase 11: ResolutionMemory and StrategySuccessTracker', () => {
    let memory;
    let tracker;

    beforeEach(() => {
        memory = new ResolutionMemory(2, 500); // Max 2 entries, 500ms TTL
        tracker = new StrategySuccessTracker();
    });

    afterEach(() => {
        memory.clear();
        tracker.clear();
        vi.restoreAllMocks();
    });

    describe('ResolutionMemory', () => {
        it('should remember and recall an entry', () => {
            memory.remember('/cart', 'hash123', 'css', '.cart-btn', 0.9);
            
            const hit = memory.recall('/cart', 'hash123');
            expect(hit).not.toBeNull();
            expect(hit.strategyName).toBe('css');
            expect(hit.locator).toBe('.cart-btn');
            expect(hit.confidence).toBe(0.9);
            expect(hit.successCount).toBe(1); // recalling increments successCount
        });

        it('should return null on cache miss', () => {
            const hit = memory.recall('/checkout', 'hash999');
            expect(hit).toBeNull();
        });

        it('should evict an entry explicitly', () => {
            memory.remember('/cart', 'hash123', 'css', '.cart-btn', 0.9);
            memory.evict('/cart', 'hash123');
            
            const hit = memory.recall('/cart', 'hash123');
            expect(hit).toBeNull();
        });

        it('should enforce maxSize (LRU eviction)', () => {
            memory.remember('/p1', 'hash1', 's1', '.l1', 1);
            memory.remember('/p2', 'hash2', 's2', '.l2', 1);
            memory.remember('/p3', 'hash3', 's3', '.l3', 1); // Evicts /p1::hash1 because max size is 2

            expect(memory.size()).toBe(2);
            expect(memory.recall('/p1', 'hash1')).toBeNull();
            expect(memory.recall('/p2', 'hash2')).not.toBeNull();
            expect(memory.recall('/p3', 'hash3')).not.toBeNull();
        });

        it('should update LRU order on recall', () => {
            memory.remember('/p1', 'hash1', 's1', '.l1', 1);
            memory.remember('/p2', 'hash2', 's2', '.l2', 1);
            
            // Recalling /p1 makes /p2 the oldest
            memory.recall('/p1', 'hash1');
            
            memory.remember('/p3', 'hash3', 's3', '.l3', 1); // Should evict /p2::hash2

            expect(memory.recall('/p2', 'hash2')).toBeNull();
            expect(memory.recall('/p1', 'hash1')).not.toBeNull();
            expect(memory.recall('/p3', 'hash3')).not.toBeNull();
        });

        it('should expire entries after TTL', async () => {
            memory.remember('/p1', 'hash1', 's1', '.l1', 1);
            
            // wait 550ms
            await new Promise(r => setTimeout(r, 550));
            
            const hit = memory.recall('/p1', 'hash1');
            expect(hit).toBeNull();
        });
    });

    describe('StrategySuccessTracker', () => {
        it('should correctly track successes and failures per domain', () => {
            tracker.recordOutcome('css', 'example.com', true);
            tracker.recordOutcome('css', 'example.com', false);
            tracker.recordOutcome('css', 'example.com', true);

            const rate = tracker.getSuccessRate('css', 'example.com');
            expect(rate.success).toBe(2);
            expect(rate.total).toBe(3);
            expect(rate.rate).toBeCloseTo(0.6666, 3);
        });

        it('should isolate stats per domain and strategy', () => {
            tracker.recordOutcome('css', 'a.com', true);
            tracker.recordOutcome('xpath', 'a.com', false);
            tracker.recordOutcome('css', 'b.com', false);

            expect(tracker.getSuccessRate('css', 'a.com').rate).toBe(1);
            expect(tracker.getSuccessRate('xpath', 'a.com').rate).toBe(0);
            expect(tracker.getSuccessRate('css', 'b.com').rate).toBe(0);
        });
    });
});
