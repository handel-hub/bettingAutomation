import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeatureFlagManager } from '../FeatureFlagManager.mjs';
import { CommandRouter } from '../../CommandRouter.mjs';
import featureFlags from '../../execution/locatorIntelligence/FeatureFlags.mjs';

describe('Milestone 6: Feature Flag Governance & Production Cutover', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({
            V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW',
            V3_DECOUPLE_HEALTH_MONITOR: false,
            V3_ENABLE_STANDBY_POOL: false,
            LI_EPOCH_GATING: false
        });
    });

    afterEach(() => {
        featureFlags.resetForTesting({});
        vi.restoreAllMocks();
    });

    it('test_flag_evaluation_caching: evaluates flags in under 0.01ms via in-memory caching', () => {
        const manager = new FeatureFlagManager({
            V3_DECOUPLE_HEALTH_MONITOR: true,
            V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT'
        });

        expect(manager.isFlagEnabled('V3_DECOUPLE_HEALTH_MONITOR')).toBe(true);
        expect(manager.getSchemaMode()).toBe('STRICT');
        expect(manager.getVersionHash()).not.toBe('');

        // Measure evaluation latency over 10,000 iterations to verify < 0.01ms per lookup
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
            manager.isFlagEnabled('V3_DECOUPLE_HEALTH_MONITOR');
            manager.getSchemaMode();
        }
        const totalDurationMs = performance.now() - start;
        const avgDurationMs = totalDurationMs / 10000;

        expect(avgDurationMs).toBeLessThan(0.01);
    });

    it('test_dynamic_config_update: atomically updates runtime configuration and recalculates version hash', () => {
        const manager = new FeatureFlagManager({
            V3_ENABLE_STANDBY_POOL: false
        });
        const initialHash = manager.getVersionHash();

        manager.updateConfiguration({
            V3_ENABLE_STANDBY_POOL: true,
            V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT'
        });

        expect(manager.isFlagEnabled('V3_ENABLE_STANDBY_POOL')).toBe(true);
        expect(manager.getSchemaMode()).toBe('STRICT');
        expect(featureFlags.isEnabled('V3_ENABLE_STANDBY_POOL')).toBe(true);
        expect(manager.getVersionHash()).not.toBe(initialHash);
    });

    it('test_emergency_rollback_reverts_to_v2_paths: reverts all v3 resilient flags in under 50ms', () => {
        const manager = new FeatureFlagManager({
            V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT',
            V3_DECOUPLE_HEALTH_MONITOR: true,
            V3_ENABLE_STANDBY_POOL: true,
            V3_ENABLE_GLOBAL_TTL: true,
            LI_EPOCH_GATING: true
        });

        expect(manager.isFlagEnabled('V3_ENABLE_STANDBY_POOL')).toBe(true);
        expect(manager.isFlagEnabled('LI_EPOCH_GATING')).toBe(true);
        expect(manager.getSchemaMode()).toBe('STRICT');

        const start = performance.now();
        manager.broadcastRollback();
        const durationMs = performance.now() - start;

        expect(durationMs).toBeLessThan(50);
        expect(manager.isFlagEnabled('V3_ENABLE_STANDBY_POOL')).toBe(false);
        expect(manager.isFlagEnabled('V3_DECOUPLE_HEALTH_MONITOR')).toBe(false);
        expect(manager.isFlagEnabled('V3_ENABLE_GLOBAL_TTL')).toBe(false);
        expect(manager.isFlagEnabled('LI_EPOCH_GATING')).toBe(false);
        expect(manager.getSchemaMode()).toBe('DISABLED');
        expect(featureFlags.isEnabled('V3_ENABLE_STANDBY_POOL')).toBe(false);
    });

    it('test_command_router_integration: CommandRouter processes UPDATE_CONFIG and BROADCAST_ROLLBACK commands', async () => {
        const manager = new FeatureFlagManager({
            V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW'
        });
        const router = new CommandRouter(null, manager, null);

        // Send UPDATE_CONFIG command
        const updateCmd = {
            id: 'cfg-1',
            category: 'Configuration',
            type: 'UPDATE_CONFIG',
            timestamp: Date.now(),
            payload: {
                V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT',
                V3_ENABLE_STANDBY_POOL: true
            }
        };

        const routedUpdate = await router.route(updateCmd);
        expect(routedUpdate).toBe(true);
        expect(manager.getSchemaMode()).toBe('STRICT');
        expect(manager.isFlagEnabled('V3_ENABLE_STANDBY_POOL')).toBe(true);

        // Send BROADCAST_ROLLBACK command
        const rollbackCmd = {
            id: 'cfg-2',
            category: 'Configuration',
            type: 'BROADCAST_ROLLBACK',
            timestamp: Date.now()
        };

        const routedRollback = await router.route(rollbackCmd);
        expect(routedRollback).toBe(true);
        expect(manager.getSchemaMode()).toBe('DISABLED');
        expect(manager.isFlagEnabled('V3_ENABLE_STANDBY_POOL')).toBe(false);
    });
});
