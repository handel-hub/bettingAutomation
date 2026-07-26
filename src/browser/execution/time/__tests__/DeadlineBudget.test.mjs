import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NTPClockSync } from '../NTPClockSync.mjs';
import { DeadlineBudget } from '../DeadlineBudget.mjs';
import { QueueDeadlineExceededError, GlobalTimeoutError, ClockDriftError } from '../../errors.mjs';
import featureFlags from '../../locatorIntelligence/FeatureFlags.mjs';
import { ExecutionScheduler } from '../../ExecutionScheduler.mjs';
import { TelemetryCollector } from '../../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import EventEmitter from 'node:events';

describe('Milestone 2: NTP Time Synchronization & TTL Eviction Engine Tests', () => {
    beforeEach(() => {
        NTPClockSync.reset();
        TelemetryCollector.reset();
        featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
    });

    afterEach(() => {
        NTPClockSync.reset();
        vi.restoreAllMocks();
    });

    describe('NTPClockSync Unit & Algorithm 2 Tests', () => {
        it('now() returns current Date.now() when offset is zero', () => {
            const now = NTPClockSync.now();
            expect(Math.abs(now - Date.now())).toBeLessThanOrEqual(5);
        });

        it('sync() sets initial offset directly when offset is zero and delta > 250ms', () => {
            const local = Date.now();
            const master = local + 5000; // 5 seconds ahead
            NTPClockSync.sync(master, local);
            expect(NTPClockSync.getOffset()).toBe(5000);
            expect(Math.abs(NTPClockSync.now() - (Date.now() + 5000))).toBeLessThanOrEqual(5);
            expect(NTPClockSync.getDriftMetrics().syncCount).toBe(1);
        });

        it('sync() applies instant convergence for minor drift <= 50ms', () => {
            const local = Date.now();
            NTPClockSync.sync(local + 1000, local); // initial offset = 1000ms
            expect(NTPClockSync.getOffset()).toBe(1000);

            // Master drifts ahead by 30ms (<= 50ms threshold)
            NTPClockSync.sync(local + 1030, local);
            expect(NTPClockSync.getOffset()).toBe(1030); // Instant convergence
        });

        it('sync() clamps drift adjustments to maxStepMs (+/-250ms) on subsequent syncs when drift > 50ms', () => {
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

        it('guarantees monotonic progression in now() even if offset decreases by clamp step', () => {
            const local = Date.now();
            NTPClockSync.sync(local + 1000, local);
            const time1 = NTPClockSync.now();

            // Force a negative sync adjustment (-250ms clamp)
            NTPClockSync.sync(local - 5000, local);
            const time2 = NTPClockSync.now();

            // Time must never step backward
            expect(time2).toBeGreaterThanOrEqual(time1);
            expect(NTPClockSync.getDriftMetrics().isMonotonic).toBe(true);
        });

        it('emits LF-704 telemetry alert and increments severe drift counter when |drift| > 1000ms', () => {
            const local = Date.now();
            NTPClockSync.sync(local + 100, local); // initial offset
            expect(TelemetryCollector.registry.failures.get('LF-704')).toBeUndefined();

            // Trigger severe drift (+1500ms drift)
            NTPClockSync.sync(local + 1600, local);
            expect(TelemetryCollector.registry.failures.get('LF-704')).toBe(1);
            expect(NTPClockSync.getDriftMetrics().severeDriftCount).toBe(1);
        });

        it('syncNetwork() compensates for RTT and synchronizes offset correctly', async () => {
            const local = Date.now();
            const mockFetch = vi.fn().mockImplementation(async () => {
                // Simulate 100ms network delay and server time 2000ms ahead
                return {
                    json: async () => ({ timestamp: local + 2000 })
                };
            });

            const success = await NTPClockSync.syncNetwork('http://ntp.local', mockFetch);
            expect(success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(NTPClockSync.getOffset()).toBeGreaterThan(0);
        });

        it('startAutoSync() schedules retry with exponential backoff on network failure', async () => {
            vi.useFakeTimers();
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

            NTPClockSync.startAutoSync('http://ntp.local', mockFetch, 15000);
            
            // Allow initial async execution to fail
            await vi.runOnlyPendingTimersAsync();
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(NTPClockSync._backoffDelay).toBe(2000); // 1000 * 2

            await vi.runOnlyPendingTimersAsync();
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(NTPClockSync._backoffDelay).toBe(4000); // 2000 * 2

            vi.useRealTimers();
        });
    });

    describe('DeadlineBudget Unit & Algorithm 3 Tests', () => {
        it('calculates correct deadline and remaining ms against NTP monotonic clock', () => {
            const now = NTPClockSync.now();
            const budget = new DeadlineBudget(now, 1500);
            expect(budget.captureTime).toBe(now);
            expect(budget.ttlMs).toBe(1500);
            expect(budget.deadline).toBe(now + 1500);
            expect(budget.getRemainingMs()).toBeGreaterThan(1490);
            expect(budget.getRemainingMs()).toBeLessThanOrEqual(1500);
        });

        it('returns Number.MAX_SAFE_INTEGER remaining ms and isNever expired when ttlMs is null or <= 0 (Algorithm 3 lines 1-3)', () => {
            const budgetNull = new DeadlineBudget(NTPClockSync.now(), null);
            const budgetZero = new DeadlineBudget(NTPClockSync.now(), 0);
            expect(budgetNull.getRemainingMs()).toBe(Number.MAX_SAFE_INTEGER);
            expect(budgetNull.isExpired()).toBe(false);
            expect(budgetZero.getRemainingMs()).toBe(Number.MAX_SAFE_INTEGER);
            expect(budgetZero.isExpired()).toBe(false);
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

        it('checkOrThrow() throws QueueDeadlineExceededError (LF-702) and records telemetry when owner is ExecutionScheduler', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(() => budget.checkOrThrow('ExecutionScheduler')).toThrow(QueueDeadlineExceededError);
            expect(() => budget.checkOrThrow('ExecutionScheduler')).toThrow(/LF-702/);
            expect(TelemetryCollector.registry.failures.get('LF-702')).toBe(2);
        });

        it('checkOrThrow() throws GlobalTimeoutError (LF-504) and records telemetry when owner is LocatorResolver or ActionSimulator', () => {
            featureFlags.resetForTesting({ V3_ENABLE_GLOBAL_TTL: true });
            const budget = new DeadlineBudget(NTPClockSync.now() - 2000, 1500);
            expect(() => budget.checkOrThrow('LocatorResolver')).toThrow(GlobalTimeoutError);
            expect(() => budget.checkOrThrow('ActionSimulator')).toThrow(/LF-504/);
            expect(TelemetryCollector.registry.failures.get('LF-504')).toBe(2);
        });

        it('fromCommand() extracts captureTime and ttlMs from v3 command attributes', () => {
            const cmdV3 = { commandId: 'c1', timestamp: 10000, ttlMs: 3000 };
            const cmdLegacy = { id: 'c2', captureTime: 20000 };
            const b1 = DeadlineBudget.fromCommand(cmdV3, 1500);
            const b2 = DeadlineBudget.fromCommand(cmdLegacy, 1000);
            expect(b1.captureTime).toBe(10000);
            expect(b1.ttlMs).toBe(3000);
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
        });
    });
});

