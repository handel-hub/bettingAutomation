import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionScheduler } from '../../src/browser/execution/ExecutionScheduler.mjs';
import { Command } from '../../src/browser/execution/Command.mjs';
import featureFlags from '../../src/browser/execution/locatorIntelligence/FeatureFlags.mjs';

describe('Scroll Determinism Test', () => {
    let scheduler;

    beforeEach(() => {
        scheduler = new ExecutionScheduler();
        // Enable spatial scroll feature flag for deterministic latest-wins coalescing
        featureFlags.init({ V4_SPATIAL_SCROLL: true });
    });

    it('should result in identical queued state when identical master scroll sequences are played', () => {
        const slaveBrowserObj = { id: 'browser-01', queueManager: null };
        const baseSequence = [
            { id: 1, type: 'SCROLL', rhoY: 0.1, delta: 10 },
            { id: 2, type: 'SCROLL', rhoY: 0.3, delta: 20 },
            { id: 3, type: 'SCROLL', rhoY: 0.5, delta: 20 },
            { id: 4, type: 'SCROLL', rhoY: 0.6, delta: 10 },
            { id: 5, type: 'SCROLL', rhoY: 1.0, delta: 40 }
        ];

        // Simulate 10 identical runs
        const results = [];

        for (let run = 0; run < 10; run++) {
            // New scheduler for each run to test determinism
            const dummyRegistry = { 
                get: () => ({}),
                on: () => {},
                emit: () => {},
                removeListener: () => {}
            };
            const runScheduler = new ExecutionScheduler(null, dummyRegistry);
            const browserObj = { id: `browser-run-${run}` };
            runScheduler.drainLocks.add(browserObj.id);

            for (const step of baseSequence) {
                const command = new Command({
                    type: step.type,
                    priority: 'AGGREGATED',
                    payload: { deltas: { deltaX: 0, deltaY: step.delta }, type: 'wheel' },
                    metadata: {
                        scroll: { rhoY: step.rhoY, scrollBoundsY: 1000 }
                    }
                });
                runScheduler.enqueue(browserObj, command);
                const qManager = runScheduler.browserQueues.get(browserObj.id);
                console.log(`Step ${step.id}, Aggregated length: ${qManager.buckets.Aggregated.length}`);
            }

            // Extract the aggregated queue (latest-wins should leave only the last command)
            const qManager = runScheduler.browserQueues.get(browserObj.id);
            console.log('Buckets:', qManager ? qManager.buckets : 'No qManager');
            const aggregatedQueue = qManager ? qManager.buckets.Aggregated : [];
            results.push(aggregatedQueue.length > 0 ? aggregatedQueue[aggregatedQueue.length - 1].command.metadata.scroll.rhoY : null);
        }

        // Verify all 10 runs produced identical results
        const firstResult = results[0];
        expect(firstResult).toBe(1.0); // The last target wins
        
        for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(firstResult);
        }
    });
});
