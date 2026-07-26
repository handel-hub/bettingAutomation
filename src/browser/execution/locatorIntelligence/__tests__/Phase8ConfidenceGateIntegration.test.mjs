import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { TestHarness } from './TestHarness.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';
import { DefaultPolicy } from '../resolution/ResolutionPolicy.mjs';
import { ConfidenceGateRejectionError } from '../../errors.mjs';

describe('Phase 8 Integration: ConfidenceGate in LocatorResolver', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true,
            LI_VERIFICATION: true,
            LI_DISAMBIGUATION: true,
            LI_CONFIDENCE_GATE: true
        });

        TelemetryCollector.reset();
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('should REJECT and throw ConfidenceGateRejectionError when similarity is below threshold for CLICK (0.45)', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', id: 'foo-bar', className: 'xyz-class', text: 'Foo Bar Baz', visible: true }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'submit-order', classes: ['btn-submit-order'], role: 'button' },
            text: { exact: 'Confirm Order', normalized: 'confirm order' }
        });

        const candidates = [
            { locator: '.xyz-class', strategy: 'css', rank: 1, ranking: { finalScore: 80 } }
        ];

        // We lower VerificationEngine minThreshold to 0.0 so it passes verification, allowing ConfidenceGate (threshold 0.45 for CLICK) to evaluate and reject it.
        const customPolicy = {
            ...DefaultPolicy,
            getRetryBudget: () => 1,
            verification: { minThreshold: 0.0 },
            confidenceGate: { thresholds: { CLICK: 0.99 } }
        };

        await expect(LocatorResolver.resolve(page, candidates, 'click', customPolicy, {
            identityDocument: masterEID
        })).rejects.toThrow(ConfidenceGateRejectionError);

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.confidence.REJECT).toBeGreaterThan(0);
    });

    it('should ACCEPT and return success when similarity is above threshold for CLICK', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'submit-btn', className: 'btn primary', text: 'Submit', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'submit-btn', classes: ['btn', 'primary'], role: 'button' },
            text: { exact: 'Submit', normalized: 'submit' }
        });

        const candidates = [
            { locator: '#submit-btn', strategy: 'id', rank: 1, ranking: { finalScore: 95 } }
        ];

        const result = await LocatorResolver.resolve(page, candidates, 'click', DefaultPolicy, {
            identityDocument: masterEID
        });

        expect(result.success).toBe(true);
        expect(result.winningStrategy).toBe('id');

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.confidence.ACCEPT).toBeGreaterThan(0);
    });

    it('should skip ConfidenceGate when no EID is provided (legacy command)', async () => {
        featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED' });
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'any-btn', text: 'Click me', visible: true }
            ]
        });

        const candidates = [
            { locator: '#any-btn', strategy: 'id', rank: 1, ranking: { finalScore: 50 } }
        ];

        // Notice no identityDocument is passed
        const result = await LocatorResolver.resolve(page, candidates, 'click', DefaultPolicy, {});

        expect(result.success).toBe(true);
        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.confidence.ACCEPT).toBe(0);
        expect(snapshot.confidence.REJECT).toBe(0);
    });
});
