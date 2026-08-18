import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker, HealthMonitor } from '../../../coordination/HealthMonitor.mjs';
import { ExecutionScheduler } from '../../ExecutionScheduler.mjs';
import { RecoveryOrchestrator } from '../resolution/RecoveryOrchestrator.mjs';
import { Command } from '../../Command.mjs';

describe('Phase 6 — Resilience Enhancements (Circuit Breaker, Backpressure, L3.5 Fallback)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Circuit Breaker & HealthMonitor Integration', () => {
        it('should trip after threshold failures within windowMs', () => {
            const cb = new CircuitBreaker({ threshold: 3, windowMs: 1000 });
            expect(cb.isTripped()).toBe(false);
            cb.recordFailure(Date.now() - 500);
            cb.recordFailure(Date.now() - 400);
            expect(cb.isTripped()).toBe(false);
            cb.recordFailure(Date.now() - 100);
            expect(cb.isTripped()).toBe(true);
        });

        it('should ignore stale failures outside windowMs', () => {
            const cb = new CircuitBreaker({ threshold: 3, windowMs: 1000 });
            cb.recordFailure(Date.now() - 2000);
            cb.recordFailure(Date.now() - 1500);
            cb.recordFailure(Date.now() - 100);
            expect(cb.isTripped()).toBe(false);
        });

        it('HealthMonitor recordRecoveryFailure trips circuit breaker and emits HEAL_REQUESTED', () => {
            const hm = new HealthMonitor({ get: () => ({ id: 'br-1' }), updateState: vi.fn() });
            const spy = vi.fn();
            hm.on('Command', spy);

            hm.recordRecoveryFailure('br-1');
            hm.recordRecoveryFailure('br-1');
            expect(spy).not.toHaveBeenCalled();

            const tripped = hm.recordRecoveryFailure('br-1');
            expect(tripped).toBe(true);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0][0].type).toBe('HEAL_REQUESTED');
            expect(spy.mock.calls[0][0].payload.circuitBreakerTripped).toBe(true);
        });
    });

    describe('ExecutionScheduler Backpressure', () => {
        it('should drop Continuous and Aggregated commands when backpressure is active', () => {
            const scheduler = new ExecutionScheduler({ emit: vi.fn() }, null, null);
            scheduler._drain = vi.fn().mockResolvedValue();
            const browserObj = { id: 'br-1' };
            scheduler.setBackpressure('br-1', true);

            const continuousCmd = new Command({ type: 'SCROLL', category: 'Continuous', target: 'br-1' });
            const aggregatedCmd = new Command({ type: 'HOVER', category: 'Aggregated', target: 'br-1' });
            const discreteCmd = new Command({ type: 'CLICK', category: 'Discrete', target: 'br-1' });

            scheduler.enqueue(browserObj, continuousCmd);
            scheduler.enqueue(browserObj, aggregatedCmd);
            scheduler.enqueue(browserObj, discreteCmd);

            const qManager = scheduler.browserQueues.get('br-1');
            expect(qManager.buckets.Continuous.length).toBe(0);
            expect(qManager.buckets.Aggregated.length).toBe(0);
            expect(qManager.buckets.Discrete.length).toBe(1);
            scheduler.dispose();
        });
    });

    describe('RecoveryOrchestrator L3.5 Semantic Fallback & Backpressure Toggling', () => {
        it('should toggle backpressure on scheduler during L2 DOM settlement', async () => {
            const orchestrator = new RecoveryOrchestrator();
            orchestrator.pageStateMonitor.getStabilityState = vi.fn().mockResolvedValue('STABLE');
            const scheduler = {
                setBackpressure: vi.fn()
            };
            const mockPage = { reload: vi.fn().mockResolvedValue() };
            const resolveFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

            await orchestrator.orchestrate(resolveFn, 'click', mockPage, {
                scheduler,
                browserId: 'br-1',
                maxRecoveryMs: 600
            });

            expect(scheduler.setBackpressure).toHaveBeenCalledWith('br-1', true);
            expect(scheduler.setBackpressure).toHaveBeenCalledWith('br-1', false);
        });

        it('should resolve at L3.5 using semanticFallback option', async () => {
            const orchestrator = new RecoveryOrchestrator();
            orchestrator.pageStateMonitor.getStabilityState = vi.fn().mockResolvedValue('STABLE');
            const mockPage = { reload: vi.fn().mockResolvedValue() };
            const startTime = Date.now();
            const resolveFn = vi.fn().mockImplementation(async () => {
                if (Date.now() - startTime < 600) throw new Error('L1 failure');
                throw new Error('L2 failure');
            });

            const semanticFallback = vi.fn().mockResolvedValue({
                success: true,
                strategy: 'semantic-fallback'
            });

            const outcome = await orchestrator.orchestrate(resolveFn, 'click', mockPage, {
                maxRecoveryMs: 3000,
                semanticFallback,
                originalEID: { textContent: 'Submit Button' }
            });

            expect(outcome.status).toBe('RESOLVED');
            expect(outcome.level).toBe('L3.5');
            expect(outcome.result.strategy).toBe('semantic-fallback');
            expect(semanticFallback).toHaveBeenCalledWith('Submit Button', mockPage, expect.anything());
        });
    });
});
