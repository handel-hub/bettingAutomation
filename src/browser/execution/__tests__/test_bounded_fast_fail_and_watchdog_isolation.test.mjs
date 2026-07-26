import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocatorResolver } from '../LocatorResolver.mjs';
import { RecoveryOrchestrator } from '../locatorIntelligence/resolution/RecoveryOrchestrator.mjs';
import { HealthMonitor } from '../../coordination/HealthMonitor.mjs';
import { BrowserStateRegistry } from '../../synchronization/BrowserStateRegistry.mjs';
import { ContractViolationError } from '../errors.mjs';
import { TimeConstants } from '../time/TimeConstants.mjs';
import featureFlags from '../locatorIntelligence/FeatureFlags.mjs';

describe('Milestone 5: Bounded Fast-Fail Resolution & Watchdog State Isolation', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({
            V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT',
            V3_DECOUPLE_HEALTH_MONITOR: true
        });
    });

    afterEach(() => {
        featureFlags.resetForTesting({
            V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW',
            V3_DECOUPLE_HEALTH_MONITOR: false
        });
        vi.restoreAllMocks();
    });

    it('test_missing_eid_fast_fails_under_15ms: throws ContractViolationError in under 15ms without invoking recovery', async () => {
        const mockPage = { url: () => 'http://example.com/test' };
        const candidates = [{ locator: '#btn', strategy: 'css' }];

        const start = Date.now();
        await expect(
            LocatorResolver.resolve(mockPage, candidates, 'click', undefined, { enforceEID: true })
        ).rejects.toThrow(ContractViolationError);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(TimeConstants.FAST_FAIL_BOUNDARY_MS); // Must abort in < 15ms
    });

    it('test_recovery_loop_hard_caps_at_1000ms: RecoveryOrchestrator aborts at T_MAX_RECOVERY_MS', async () => {
        const orchestrator = new RecoveryOrchestrator();
        const mockPage = {
            reload: vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 10)))
        };

        // Simulate a resolveFn that always fails and takes 200ms per attempt
        const slowFailResolve = async () => {
            await new Promise(r => setTimeout(r, 200));
            return { success: false };
        };

        const start = Date.now();
        const outcome = await orchestrator.orchestrate(slowFailResolve, 'click', mockPage, {
            maxRecoveryMs: TimeConstants.T_MAX_RECOVERY_MS // 1000ms
        });
        const duration = Date.now() - start;

        expect(outcome.status).toBe('ABORTED');
        expect(duration).toBeLessThanOrEqual(TimeConstants.T_MAX_RECOVERY_MS + 300); // 1000ms + margin for current async step
        expect(outcome.attempts).toBeGreaterThan(0);
    });

    it('test_logical_fault_does_not_trigger_watchdog_reboot: logical error state preserves physical health', () => {
        const registry = new BrowserStateRegistry();
        const monitor = new HealthMonitor(registry);
        const mockBrowser = { isConnected: () => true };
        registry.register('worker-1', 'slave', mockBrowser, {}, { isClosed: () => false });
        registry.updateState('worker-1', 'Ready');

        const stateObj = registry.get('worker-1');
        expect(stateObj.state).toBe('Ready');

        // Setting state to LOGICAL_FAULT in decoupled mode must NOT overwrite Ready state
        stateObj.state = 'LOGICAL_FAULT';
        expect(stateObj.state).toBe('Ready');
        expect(stateObj.lastLogicalFault).toBe('LOGICAL_FAULT');

        const evalResult = monitor.evaluateErrorState(stateObj);
        expect(evalResult.isPhysicalCrash).toBe(false);
    });

    it('test_heartbeat_silence_triggers_physical_reboot: heartbeat silence > 5000ms triggers watchdog', () => {
        const registry = new BrowserStateRegistry();
        const monitor = new HealthMonitor(registry);
        const mockBrowser = { isConnected: () => true };
        registry.register('worker-2', 'slave', mockBrowser, {}, { isClosed: () => false });
        registry.updateState('worker-2', 'Ready');

        const stateObj = registry.get('worker-2');
        stateObj.healthMetrics.lastHeartbeat = Date.now() - 6000; // 6 seconds silent

        const evalResult = monitor.evaluateErrorState(stateObj);
        expect(evalResult.isPhysicalCrash).toBe(true);
        expect(evalResult.reason).toContain('WebSocket heartbeat silence exceeded 5,000ms');
    });
});
