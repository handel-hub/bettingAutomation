import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NTPClockSync } from '../NTPClockSync.mjs';
import { DeadlineBudget } from '../DeadlineBudget.mjs';
import { QueueDeadlineExceededError, GlobalTimeoutError } from '../../errors.mjs';
import featureFlags from '../../locatorIntelligence/FeatureFlags.mjs';
import { ExecutionScheduler } from '../../ExecutionScheduler.mjs';
import { TelemetryCollector } from '../../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import EventEmitter from 'node:events';

describe('Milestone 2: Distributed Deadline Budgeting & Queue TTL Enforcement', () => {
    beforeEach(() => {
        NTPClockSync.reset();
        TelemetryCollector.reset();
        featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
    });

    afterEach(() => {
        NTPClockSync.reset();
    });

    describe('NTPClockSync Unit Tests', () => {
        it('now() returns current Date.now() when offset is zero', () => {
            const now = NTPClockSync.now();
            expect(Math.abs(now - Date.now())).toBeLessThanOrEqual(5);
        });

        it('sync() sets initial offset directly when offset is zero', () => {
            const local = Date.now();
            const master = local + 5000; // 5 seconds ahead
            NTPClockSync.sync(master, local);
            expect(NTPClockSync.getOffset()).toBe(5000);
            expect(Math.abs(NTPClockSync.now() - (Date.now() + 5000))).toBeLessThanOrEqual(5);
        });

        it('sync() clamps drift adjustments to maxStepMs (250ms) on subsequent syncs', () => {
            const local = Date.now();
            NTPClockSync.sync(local + 1000, local); // initial offset = 1000ms
            expect(NTPClockSync.getOffset()).toBe(1000);

            // Now master timestamp jumps ahead by another 2000ms (drift = +2000ms)
            NTPClockSync.sync(local + 3000, local);
            // Should be clamped by +250ms -> new offset 1250ms
            expect(NTPClockSync.getOffset()).toBe(1250);

            // Now master timestamp drops by -1000ms (drift = -1000ms)
            NTPClockSync.sync(local + 250, local);
            // Should be clamped by -250ms -> new offset 1000ms
            expect(NTPClockSync.getOffset()).toBe(1000);
        });

        it('reset() clears offset back to zero', () => {
            NTPClockSync.sync(Date.now() + 500, Date.now());
            expect(NTPClockSync.getOffset()).not.toBe(0);
            NTPClockSync.reset();
            expect(NTPClockSync.getOffset()).toBe(0);
        });
    });

    describe('DeadlineBudget Unit Tests', () => {
        it('calculates correct deadline and remaining ms', () => {
            const now = NTPClockSync.now();
            const budget = new DeadlineBudget(now, 1500);
            expect(budget.captureTime).toBe(now);
            expect(budget.ttlMs).toBe(1500);
            expect(budget.deadline).toBe(now + 1500);
            expect(budget.getRemainingMs()).toBeGreaterThan(1490);
            expect(budget.getRemainingMs()).toBeLessThanOrEqual(1500);
        });

        it('returns 0 remaining ms when expired', () => {
            const past = NTPClockSync.now() - 2000;
            const budget = new DeadlineBudget(past, 1500);
            expect(budget.getRemainingMs()).toBe(0);
        });

        it('isExpired() returns true when expired and V3_ENABLE_GLOBAL_TTL is enabled', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(budget.isExpired()).toBe(true);
        });

        it('isExpired() returns false when V3_ENABLE_GLOBAL_TTL is disabled, even if remaining ms is 0', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: false });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(budget.getRemainingMs()).toBe(0);
            expect(budget.isExpired()).toBe(false);
        });

        it('checkOrThrow() throws QueueDeadlineExceededError (LF-702) when owner is ExecutionScheduler', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(() => budget.checkOrThrow('ExecutionScheduler')).toThrow(QueueDeadlineExceededError);
            expect(() => budget.checkOrThrow('ExecutionScheduler')).toThrow(/LF-702/);
        });

        it('checkOrThrow() throws GlobalTimeoutError (LF-504) when owner is LocatorResolver or ActionSimulator', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(() => budget.checkOrThrow('LocatorResolver')).toThrow(GlobalTimeoutError);
            expect(() => budget.checkOrThrow('ActionSimulator')).toThrow(/LF-504/);
        });

        it('fromCommand() extracts captureTime from command attributes', () => {
            const cmd1 = { id: 'c1', captureTime: 10000 };
            const cmd2 = { id: 'c2', timestamp: 20000 };
            const b1 = DeadlineBudget.fromCommand(cmd1, 1500);
            const b2 = DeadlineBudget.fromCommand(cmd2, 1000);
            expect(b1.captureTime).toBe(10000);
            expect(b1.ttlMs).toBe(1500);
            expect(b2.captureTime).toBe(20000);
            expect(b2.ttlMs).toBe(1000);
        });
    });

    describe('ExecutionScheduler & ActionSimulator Integration Tests', () => {
        let simulator;
        let registry;
        let scheduler;

        beforeEach(() => {
            simulator = new EventEmitter();
            simulator.execute = vi.fn().mockResolvedValue(true);
            registry = {
                get: vi.fn().mockReturnValue({ page: {} }),
                on: vi.fn()
            };
            scheduler = new ExecutionScheduler(simulator, registry, {});
        });

        afterEach(() => {
            scheduler.dispose();
        });

        it('drops expired Discrete command in _drain() and emits ActionFailure with LF-702 when V3_ENABLE_GLOBAL_TTL is enabled', async () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const failureListener = vi.fn();
            simulator.on('ActionFailure', failureListener);

            const expiredCommand = {
                id: 'cmd-expired',
                type: 'CLICK',
                category: 'Execution',
                captureTime: Date.now() - 2000, // 2000ms ago (> 1500ms TTL)
                creationTime: Date.now() - 2000,
                payload: { locators: ['.btn'] }
            };

            scheduler.enqueue({ id: 'browser-1' }, expiredCommand);
            await scheduler.waitForIdle('browser-1');

            expect(simulator.execute).not.toHaveBeenCalled();
            expect(failureListener).toHaveBeenCalledTimes(1);
            expect(failureListener.mock.calls[0][0].error).toBeInstanceOf(QueueDeadlineExceededError);
            expect(failureListener.mock.calls[0][0].error.message).toContain('LF-702');
            expect(TelemetryCollector.registry.failures.get('LF-702')).toBe(1);
        });

        it('does NOT drop expired Discrete command when V3_ENABLE_GLOBAL_TTL is disabled', async () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: false });
            const failureListener = vi.fn();
            simulator.on('ActionFailure', failureListener);

            const expiredCommand = {
                id: 'cmd-legacy',
                type: 'CLICK',
                category: 'Execution',
                captureTime: Date.now() - 2000,
                creationTime: Date.now() - 2000,
                payload: { locators: ['.btn'] }
            };

            // Mock Barrier wait to pass immediately
            const { SynchronizationBarrier } = await import('../../../synchronization/SynchronizationBarrier.mjs');
            vi.spyOn(SynchronizationBarrier, 'wait').mockResolvedValue({ status: 'PASSED' });

            scheduler.enqueue({ id: 'browser-2' }, expiredCommand);
            await scheduler.waitForIdle('browser-2');

            expect(failureListener).not.toHaveBeenCalled();
            expect(simulator.execute).toHaveBeenCalledTimes(1);
            expect(TelemetryCollector.registry.failures.get('LF-702')).toBeUndefined();
            vi.restoreAllMocks();
        });
    });
});
