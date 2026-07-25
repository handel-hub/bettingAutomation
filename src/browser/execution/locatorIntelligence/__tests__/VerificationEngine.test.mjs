import { describe, it, expect } from 'vitest';
import { VerificationEngine } from '../resolution/VerificationEngine.mjs';
import { TestHarness } from './TestHarness.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';

describe('VerificationEngine', () => {
    it('verifies successfully when element matches master EID above threshold', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn-primary', id: 'btn-submit', text: 'Submit Order Now', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'btn-submit', classes: ['btn-primary'], role: 'button' },
            text: { exact: 'Submit Order Now', normalized: 'submit order now' }
        });

        const engine = new VerificationEngine({ minThreshold: 0.35 });
        const result = await engine.verify(page, '#btn-submit', masterEID);

        expect(result.verified).toBe(true);
        expect(result.similarity.overallScore).toBeGreaterThanOrEqual(0.35);
        expect(result.reason).toContain('Verification successful');
    });

    it('returns verified=true when no master EID is provided (unique match accepted)', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'box', text: 'Hello', visible: true }
            ]
        });

        const engine = new VerificationEngine();
        const result = await engine.verify(page, '.box', null);

        expect(result.verified).toBe(true);
        expect(result.similarity).toBeNull();
        expect(result.reason).toContain('No master EID provided');
    });

    it('returns LF-601 when element identity mismatches below threshold', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'footer', text: 'Unrelated Content', visible: true }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'btn-submit', classes: ['btn-primary'], role: 'button' },
            text: { exact: 'Submit Order Now', normalized: 'submit order now' }
        });

        const engine = new VerificationEngine({ minThreshold: 0.70 });
        const result = await engine.verify(page, '.footer', masterEID);

        expect(result.verified).toBe(false);
        expect(result.reason).toContain('LF-601');
        expect(result.reason).toContain('below minThreshold');
    });

    it('returns LF-302 when element is detached or vanished during verification', async () => {
        const page = TestHarness.createMockPage({
            template: [] // Empty DOM
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'btn-submit' }
        });

        const engine = new VerificationEngine();
        const result = await engine.verify(page, '#nonexistent', masterEID);

        expect(result.verified).toBe(false);
        expect(result.similarity).toBeNull();
        expect(result.reason).toContain('LF-302');
    });
});
