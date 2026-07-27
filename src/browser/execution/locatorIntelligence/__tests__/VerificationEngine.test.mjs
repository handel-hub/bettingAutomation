import { describe, it, expect } from 'vitest';
import { VerificationEngine } from '../resolution/VerificationEngine.mjs';
import { TestHarness, MockElement } from './TestHarness.mjs';
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

    describe('Actionability Verification (Phase 5)', () => {
        it('returns LF-602 DETACHED_NODE when element isConnected is false', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', className: 'btn-primary', id: 'btn-submit', text: 'Submit', visible: true }
                ]
            });

            // Mark element as detached
            const btn = page.mockDocument.querySelector('#btn-submit');
            btn.isConnected = false;

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID);

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('LF-602');
            expect(result.reason).toContain('detached from DOM');
            expect(result.actionabilityCode).toBe('DETACHED_NODE');
        });

        it('returns LF-602 DISPLAY_NONE when element has display: none', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true }
                ]
            });

            const btn = page.mockDocument.querySelector('#btn-submit');
            btn.style = { display: 'none' };

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID);

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('LF-602');
            expect(result.reason).toContain('display: none');
            expect(result.actionabilityCode).toBe('DISPLAY_NONE');
        });

        it('returns LF-602 VISIBILITY_HIDDEN when element has visibility: hidden', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true }
                ]
            });

            const btn = page.mockDocument.querySelector('#btn-submit');
            btn.style = { visibility: 'hidden' };

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID);

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('LF-602');
            expect(result.reason).toContain('visibility: hidden');
            expect(result.actionabilityCode).toBe('VISIBILITY_HIDDEN');
        });

        it('returns LF-602 DOM_UNSTABLE when mutation rate exceeds threshold', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true }
                ]
            });

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const mockMonitor = {
                getMutationRate: async () => 65.5
            };

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID, {
                monitor: mockMonitor,
                stabilityThreshold: 50
            });

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('LF-602');
            expect(result.reason).toContain('DOM unstable');
            expect(result.reason).toContain('65.5/sec');
            expect(result.actionabilityCode).toBe('DOM_UNSTABLE');
        });

        it('returns LF-602 OCCLUDED when document.elementFromPoint returns a different occluding element', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true },
                    { tagName: 'DIV', id: 'modal-overlay', className: 'overlay', visible: true }
                ]
            });

            const overlay = page.mockDocument.querySelector('#modal-overlay');
            page.mockDocument._elementFromPointMock = overlay;

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID);

            expect(result.verified).toBe(false);
            expect(result.reason).toContain('LF-602');
            expect(result.reason).toContain('occluded by <DIV>');
            expect(result.actionabilityCode).toBe('OCCLUDED');
        });

        it('passes occlusion check when elementFromPoint returns child of target element', async () => {
            const page = TestHarness.createMockPage({
                template: [
                    { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true }
                ]
            });

            const btn = page.mockDocument.querySelector('#btn-submit');
            const spanChild = new MockElement({ tagName: 'SPAN', text: 'Icon' });
            btn.appendChild(spanChild);

            page.mockDocument._elementFromPointMock = spanChild;

            const masterEID = new ElementIdentityDocument({
                element: { tagName: 'BUTTON', id: 'btn-submit' },
                text: { exact: 'Submit' }
            });

            const engine = new VerificationEngine({ minThreshold: 0.1 });
            const result = await engine.verify(page, '#btn-submit', masterEID);

            expect(result.reason).toContain('Verification successful');
            expect(result.verified).toBe(true);
        });
    });
});
