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
        expect(registry.isEnabled('LI_EXTENDED_FEATURES')).toBe(false);
        expect(registry.isEnabled('LI_IDENTITY_DOCUMENT')).toBe(false);
        expect(registry.isEnabled('LI_REMOVE_VALIDATOR')).toBe(false);
        expect(registry.isEnabled('LI_ADDITIVE_SCORING')).toBe(false);
        expect(registry.isEnabled('LI_SERIALIZE_FEATURES')).toBe(false);
        expect(registry.isEnabled('LI_EPOCH_GATING')).toBe(false);
        expect(registry.isEnabled('LI_BATCH_RESOLVER')).toBe(false);
        expect(registry.isEnabled('LI_DISAMBIGUATION')).toBe(false);
        expect(registry.isEnabled('LI_VERIFICATION')).toBe(false);
        expect(registry.isEnabled('LI_CONFIDENCE_GATE')).toBe(false);
        expect(registry.isEnabled('LI_RECOVERY_HIERARCHY')).toBe(false);
        expect(registry.isEnabled('LI_RESOLUTION_MEMORY')).toBe(false);
        expect(registry.isEnabled('LI_SHADOW_MODE')).toBe(false);
    });

    it('should return false for unknown flags', () => {
        expect(registry.isEnabled('NON_EXISTENT_FLAG')).toBe(false);
    });

    it('should allow overriding flags in init / resetForTesting', () => {
        registry.resetForTesting({ LI_EXTENDED_FEATURES: true });
        expect(registry.isEnabled('LI_EXTENDED_FEATURES')).toBe(true);
    });

    it('should load flags from process.env', () => {
        process.env.LI_EXTENDED_FEATURES = 'true';
        registry.init();
        expect(registry.isEnabled('LI_EXTENDED_FEATURES')).toBe(true);
    });

    it('should disable flag when dependency is not enabled', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // LI_IDENTITY_DOCUMENT depends on LI_EXTENDED_FEATURES
        registry.resetForTesting({ LI_IDENTITY_DOCUMENT: true, LI_EXTENDED_FEATURES: false });
        expect(registry.isEnabled('LI_IDENTITY_DOCUMENT')).toBe(false);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Disabling LI_IDENTITY_DOCUMENT because dependency LI_EXTENDED_FEATURES is disabled.'));
    });

    it('should enable flag when all dependencies are enabled', () => {
        registry.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true
        });
        expect(registry.isEnabled('LI_EXTENDED_FEATURES')).toBe(true);
        expect(registry.isEnabled('LI_IDENTITY_DOCUMENT')).toBe(true);
    });

    it('should resolve transitive dependencies correctly', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // LI_SERIALIZE_FEATURES -> LI_IDENTITY_DOCUMENT -> LI_EXTENDED_FEATURES
        // If we enable LI_SERIALIZE_FEATURES and LI_IDENTITY_DOCUMENT, but not LI_EXTENDED_FEATURES, both should be disabled!
        registry.resetForTesting({
            LI_SERIALIZE_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_EXTENDED_FEATURES: false
        });
        expect(registry.isEnabled('LI_EXTENDED_FEATURES')).toBe(false);
        expect(registry.isEnabled('LI_IDENTITY_DOCUMENT')).toBe(false);
        expect(registry.isEnabled('LI_SERIALIZE_FEATURES')).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it('should return all flags in getAll() as a Map', () => {
        const all = registry.getAll();
        expect(all).toBeInstanceOf(Map);
        expect(all.get('LI_EXTENDED_FEATURES')).toBe(false);
        expect(all.size).toBe(Object.keys(registry.definitions).length);
    });
});
