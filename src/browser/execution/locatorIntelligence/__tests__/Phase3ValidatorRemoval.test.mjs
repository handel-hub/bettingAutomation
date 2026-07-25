import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocatorIntelligenceEngine } from '../engine/LocatorIntelligenceEngine.mjs';
import { MockElement } from './TestHarness.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

describe('Phase 3 — CandidateValidator Removal & Pipeline Surgery', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({ LI_REMOVE_VALIDATOR: false });
        TelemetryCollector.reset();
    });

    afterEach(() => {
        featureFlags.resetForTesting({});
    });

    it('should run CandidateValidator and ValidationConfidenceRule when LI_REMOVE_VALIDATOR is false', () => {
        const el = new MockElement({
            tagName: 'button',
            id: 'btn-test',
            text: 'Submit'
        });

        const engine = new LocatorIntelligenceEngine({ debug: true });
        const output = engine.process(el, [el]);

        expect(output).toBeDefined();
        expect(output.locators.length).toBeGreaterThan(0);

        // When flag is false, validation status should not be SKIPPED
        // Note: In unit test harness without real DOM document.querySelectorAll,
        // validator might set status to MISSING or UNIQUE depending on harness mock,
        // but it should NOT be SKIPPED.
        for (const loc of output.locators) {
            expect(loc.validation.status).not.toBe('SKIPPED');
        }
    });

    it('should bypass CandidateValidator and exclude ValidationConfidenceRule when LI_REMOVE_VALIDATOR is true', () => {
        featureFlags.resetForTesting({ LI_REMOVE_VALIDATOR: true });

        const el = new MockElement({
            tagName: 'button',
            id: 'btn-test-2',
            text: 'Submit'
        });

        const engine = new LocatorIntelligenceEngine({ debug: true });
        const start = performance.now();
        const output = engine.process(el, [el]);
        const duration = performance.now() - start;

        expect(output).toBeDefined();
        expect(output.locators.length).toBeGreaterThan(0);

        for (const loc of output.locators) {
            // Validation status should be SKIPPED
            expect(loc.validation.status).toBe('SKIPPED');
            expect(loc.validation.matchCount).toBe(-1);

            // ValidationConfidenceRule should be excluded from scoreBreakdown
            expect(loc.ranking.scoreBreakdown).toBeDefined();
            expect(loc.ranking.scoreBreakdown['ValidationConfidenceRule']).toBeUndefined();
        }

        expect(duration).toBeLessThan(10);
    });

    it('should skip recording validation telemetry when LI_REMOVE_VALIDATOR is true', () => {
        featureFlags.resetForTesting({ LI_REMOVE_VALIDATOR: true });
        
        TelemetryCollector.recordValidation('UNIQUE');
        TelemetryCollector.recordValidation('AMBIGUOUS');

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.validation.UNIQUE).toBe(0);
        expect(snapshot.validation.AMBIGUOUS).toBe(0);
    });

    it('should allow instant rollback by setting LI_REMOVE_VALIDATOR back to false', () => {
        featureFlags.resetForTesting({ LI_REMOVE_VALIDATOR: true });
        const el = new MockElement({ tagName: 'input', id: 'rollback-test' });
        const engine = new LocatorIntelligenceEngine({ debug: true });
        
        let output = engine.process(el, [el]);
        expect(output.locators[0].validation.status).toBe('SKIPPED');

        // Rollback
        featureFlags.resetForTesting({ LI_REMOVE_VALIDATOR: false });
        output = engine.process(el, [el]);
        expect(output.locators[0].validation.status).not.toBe('SKIPPED');
    });
});
