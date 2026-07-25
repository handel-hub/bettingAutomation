import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { TestHarness } from './TestHarness.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';
import featureFlags from '../FeatureFlags.mjs';

describe('Phase 7 Integration: Disambiguation & Verification in LocatorResolver', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true,
            LI_VERIFICATION: true,
            LI_DISAMBIGUATION: true
        });
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('verifies unique candidate (count === 1) against master EID and returns similarity score', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn-submit', id: 'submit-order', text: 'Confirm Order', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'submit-order', classes: ['btn-submit'], role: 'button' },
            text: { exact: 'Confirm Order', normalized: 'confirm order' }
        });

        const candidates = [
            { locator: '#submit-order', strategy: 'css', rank: 1 }
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', undefined, { identityDocument: masterEID });

        expect(result.success).toBe(true);
        expect(result.locator).toBe('#submit-order');
        expect(result.similarity).not.toBeNull();
        expect(result.similarity.overallScore).toBeGreaterThanOrEqual(0.35);
    });

    it('rejects unique candidate failing verification and falls back to next valid candidate', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'wrong-el', text: 'Not What We Want', visible: true },
                { tagName: 'BUTTON', className: 'right-el', id: 'target-btn', text: 'Confirm Order', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'target-btn', classes: ['right-el'], role: 'button' },
            text: { exact: 'Confirm Order', normalized: 'confirm order' }
        });

        // First candidate resolves to wrong-el (fails verification). Second resolves to right-el (passes verification).
        const candidates = [
            { locator: '.wrong-el', strategy: 'css', rank: 1 },
            { locator: '#target-btn', strategy: 'id', rank: 2 }
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', { verification: { minThreshold: 0.50 } }, { identityDocument: masterEID });

        expect(result.success).toBe(true);
        expect(result.locator).toBe('#target-btn'); // Won second candidate after first was rejected!
        expect(result.winningStrategy).toBe('id');
        expect(result.similarity).not.toBeNull();
    });

    it('disambiguates multi-match candidate (count > 1) and selects correct nth element', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'action-btn', text: 'Cancel', visible: true },
                { tagName: 'BUTTON', className: 'action-btn', id: 'target-action', text: 'Confirm Order', visible: true, attributes: { role: 'button' } },
                { tagName: 'BUTTON', className: 'action-btn', text: 'Help', visible: true }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'target-action', classes: ['action-btn'], role: 'button' },
            text: { exact: 'Confirm Order', normalized: 'confirm order' }
        });

        const candidates = [
            { locator: '.action-btn', strategy: 'css', rank: 1 }
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', undefined, { identityDocument: masterEID });

        expect(result.success).toBe(true);
        expect(result.locator).toBe('.action-btn');
        expect(result.similarity).not.toBeNull();
        expect(result.similarity.overallScore).toBeGreaterThanOrEqual(0.40);
    });

    it('skips ambiguous multi-match candidate when disambiguation fails (no .first() fallback)', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'generic-item', text: 'Item A', visible: true },
                { tagName: 'DIV', className: 'generic-item', text: 'Item B', visible: true },
                { tagName: 'BUTTON', id: 'fallback-btn', text: 'Unique Target', visible: true, attributes: { role: 'button' } }
            ]
        });

        // Master EID is looking for unique target, NOT generic-item
        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'fallback-btn', role: 'button' },
            text: { exact: 'Unique Target', normalized: 'unique target' }
        });

        const candidates = [
            { locator: '.generic-item', strategy: 'css', rank: 1 }, // Ambiguous (count=2), disambiguation fails
            { locator: '#fallback-btn', strategy: 'id', rank: 2 }    // Unique, verification succeeds
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', undefined, { identityDocument: masterEID });

        expect(result.success).toBe(true);
        expect(result.locator).toBe('#fallback-btn'); // Did not blindly pick .first() of .generic-item!
        expect(result.winningStrategy).toBe('id');
    });

    it('works identically in sequential fallback mode when LI_BATCH_RESOLVER is disabled', async () => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: false,
            LI_VERIFICATION: true,
            LI_DISAMBIGUATION: true
        });

        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn-item', text: 'Wrong 1', visible: true },
                { tagName: 'BUTTON', className: 'btn-item', id: 'correct-btn', text: 'Correct Target', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'correct-btn', classes: ['btn-item'], role: 'button' },
            text: { exact: 'Correct Target', normalized: 'correct target' }
        });

        const candidates = [
            { locator: '.btn-item', strategy: 'css', rank: 1 }
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', undefined, { identityDocument: masterEID });

        expect(result.success).toBe(true);
        expect(result.locator).toBe('.btn-item');
        expect(result.similarity).not.toBeNull();
    });
});
