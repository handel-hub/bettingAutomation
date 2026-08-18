import { describe, it, expect } from 'vitest';
import { DisambiguationEngine } from '../resolution/DisambiguationEngine.mjs';
import { TestHarness } from './TestHarness.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';

describe('DisambiguationEngine', () => {
    it('successfully disambiguates when top candidate matches master EID with sufficient margin', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn btn-secondary', text: 'Cancel Order', id: 'btn-cancel', visible: true, attributes: { role: 'button' } },
                { tagName: 'BUTTON', className: 'btn btn-primary', text: 'Submit Order Now', id: 'btn-submit', visible: true, attributes: { role: 'button' } }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'btn-submit', classes: ['btn', 'btn-primary'], role: 'button' },
            text: { exact: 'Submit Order Now', normalized: 'submit order now' }
        });

        const engine = new DisambiguationEngine();
        const result = await engine.disambiguate(page, '.btn', 2, masterEID);

        expect(result.error).toBeNull();
        expect(result.resolved).toBe(true);
        expect(result.elementIndex).toBe(1); // Second button in DOM
        expect(result.margin).toBeGreaterThanOrEqual(0.10);
        expect(result.score.overallScore).toBeGreaterThanOrEqual(0.70);
    });

    it('fails with LF-603 when master EID is not provided (explicit .first() prohibition)', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn', text: 'Btn 1', visible: true },
                { tagName: 'BUTTON', className: 'btn', text: 'Btn 2', visible: true }
            ]
        });

        const engine = new DisambiguationEngine();
        const result = await engine.disambiguate(page, '.btn', 2, null);

        expect(result.resolved).toBe(false);
        expect(result.elementIndex).toBe(-1);
        expect(result.error).toContain('LF-603');
        expect(result.error).toContain('implicit .first() fallback is disabled');
    });

    it('fails with LF-603 when margin between top two candidates is <= minMargin', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn', text: 'Submit Order 1', visible: true },
                { tagName: 'BUTTON', className: 'btn', text: 'Submit Order 2', visible: true }
            ]
        });

        // Master EID text is equally close/distant to both
        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', classes: ['btn'] },
            text: { exact: 'Submit Order', normalized: 'submit order' }
        });

        const engine = new DisambiguationEngine({ minConfidence: 0.50, minMargin: 0.15 });
        const result = await engine.disambiguate(page, '.btn', 2, masterEID);

        expect(result.resolved).toBe(false);
        expect(result.error).toContain('LF-603');
        expect(result.error).toContain('insufficient margin');
    });

    it('fails with LF-603 when top match is below minConfidence', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'box', text: 'Totally Unrelated Text', visible: true }
            ]
        });

        const masterEID = new ElementIdentityDocument({
            element: { tagName: 'BUTTON', id: 'submit-btn', role: 'button' },
            text: { exact: 'Pay Now', normalized: 'pay now' }
        });

        const engine = new DisambiguationEngine({ minConfidence: 0.70 });
        const result = await engine.disambiguate(page, '.box', 1, masterEID);

        expect(result.resolved).toBe(false);
        expect(result.error).toContain('LF-603');
        expect(result.error).toContain('below minConfidence');
    });
});
