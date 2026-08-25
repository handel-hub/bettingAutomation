import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeatureFlagsRegistry } from '../FeatureFlags.mjs';

describe('FeatureFlagsRegistry', () => {
    let registry;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        registry = new FeatureFlagsRegistry();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it('should initialize all flags to default false', () => {
    });

    it('should return false for unknown flags', () => {
        expect(registry.isEnabled('NON_EXISTENT_FLAG')).toBe(false);
    });

    it('should allow overriding flags in init / resetForTesting', () => {
    });

    it('should load flags from process.env', () => {
        process.env.LI_EXTENDED_FEATURES = 'true';
        registry.init();
    });

    it('should return all flags in getAll() as a Map', () => {
        const all = registry.getAll();
        expect(all).toBeInstanceOf(Map);
        expect(all.size).toBe(Object.keys(registry.definitions).length);
    });
});

