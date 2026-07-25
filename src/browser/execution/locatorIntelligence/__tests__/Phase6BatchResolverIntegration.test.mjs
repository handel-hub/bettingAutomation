import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { TestHarness } from './TestHarness.mjs';
import featureFlags from '../FeatureFlags.mjs';

describe('Phase 6 — Batch Resolver Integration', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: false,
            LI_IDENTITY_DOCUMENT: false,
            LI_SERIALIZE_FEATURES: false,
            LI_BATCH_RESOLVER: false
        });
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('uses legacy sequential resolution when LI_BATCH_RESOLVER is disabled', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'btn-legacy', text: 'Submit', visible: true }
            ]
        });

        const candidates = TestHarness.createCandidates([
            { locator: '#btn-legacy', strategy: 'StructuralStrategy', rank: 1 }
        ]);

        const result = await LocatorResolver.resolve(page, candidates, 'CLICK');
        expect(result.success).toBe(true);
        expect(result.locator).toBe('#btn-legacy');
        expect(result.resolutionCycles).toBe(1);
    });

    it('uses BatchResolver when LI_BATCH_RESOLVER is enabled and resolves unique candidate in single round-trip', async () => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true
        });

        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'card', text: 'Card 1', visible: true },
                { tagName: 'DIV', className: 'card', text: 'Card 2', visible: true },
                { tagName: 'BUTTON', id: 'btn-batch', text: 'Batch Click', visible: true }
            ]
        });

        const candidates = TestHarness.createCandidates([
            { locator: '.card', strategy: 'SemanticClassStrategy', rank: 1 }, // ambiguous (count=2)
            { locator: '#btn-batch', strategy: 'StructuralStrategy', rank: 2 }, // unique (count=1)
            { locator: '#missing', strategy: 'StructuralStrategy', rank: 3 }  // missing (count=0)
        ]);

        const result = await LocatorResolver.resolve(page, candidates, 'CLICK');
        expect(result.success).toBe(true);
        expect(result.locator).toBe('#btn-batch');
        expect(result.winningStrategy).toBe('StructuralStrategy');
        expect(result.resolutionCycles).toBe(1);
    });

    it('skips unique candidates that fail profile checks and selects next passing unique candidate', async () => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true
        });

        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'btn-hidden', text: 'Hidden', visible: false },
                { tagName: 'BUTTON', id: 'btn-visible', text: 'Visible', visible: true }
            ]
        });

        const candidates = TestHarness.createCandidates([
            { locator: '#btn-hidden', strategy: 'StructuralStrategy', rank: 1 },  // unique but invisible
            { locator: '#btn-visible', strategy: 'StructuralStrategy', rank: 2 }  // unique and visible
        ]);

        const result = await LocatorResolver.resolve(page, candidates, 'CLICK'); // CLICK requires visible
        expect(result.success).toBe(true);
        expect(result.locator).toBe('#btn-visible');
    });

    it('does NOT resolve ambiguous candidates with .first() in batch mode (deferred to Phase 7)', async () => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true
        });

        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'duplicate', text: 'First', visible: true },
                { tagName: 'DIV', className: 'duplicate', text: 'Second', visible: true }
            ]
        });

        const candidates = TestHarness.createCandidates([
            { locator: '.duplicate', strategy: 'SemanticClassStrategy', rank: 1 } // ambiguous
        ]);

        const result = await LocatorResolver.resolve(page, candidates, 'CLICK');
        expect(result.success).toBe(false);
        expect(result.failureReason).toContain('LF-505');
    });

    it('falls back to legacy sequential resolution if BatchResolver evaluation throws error', async () => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true
        });

        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'btn-fallback', text: 'Fallback', visible: true }
            ]
        });

        // Force page.evaluate to throw an error to simulate browser evaluation failure
        page.evaluate = async () => {
            throw new Error('Simulated Evaluation Error');
        };

        const candidates = TestHarness.createCandidates([
            { locator: '#btn-fallback', strategy: 'StructuralStrategy', rank: 1 }
        ]);

        const result = await LocatorResolver.resolve(page, candidates, 'CLICK');
        expect(result.success).toBe(true);
        expect(result.locator).toBe('#btn-fallback');
    });
});
