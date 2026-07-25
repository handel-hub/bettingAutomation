import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchResolver, BatchResult } from '../resolution/BatchResolver.mjs';

describe('Phase 12: BatchResolver Shadow DOM Support', () => {
    let page;

    beforeEach(() => {
        page = {
            evaluate: vi.fn()
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should pass shadowPath to evaluation script payload', async () => {
        page.evaluate.mockResolvedValue({
            results: [{ candidateId: '1', locator: '.btn', count: 1 }],
            evaluateMs: 10
        });

        await BatchResolver.resolve(page, [{ id: '1', locator: '.btn' }], {}, { shadowPath: ['div#host', 'my-component'] });

        expect(page.evaluate).toHaveBeenCalledWith(
            BatchResolver._evaluationScript,
            expect.objectContaining({
                shadowPath: ['div#host', 'my-component']
            })
        );
    });

    describe('_evaluationScript shadow DOM traversal', () => {
        it('should traverse shadow roots correctly and set rootNode', () => {
            // Mock DOM
            const shadowRoot = {
                querySelectorAll: vi.fn().mockReturnValue([{ id: 'target' }])
            };
            const host = { shadowRoot };
            
            global.document = {
                querySelector: vi.fn().mockReturnValue(host),
                body: {}
            };
            global.window = {
                getComputedStyle: vi.fn().mockReturnValue({ display: 'block', opacity: '1' })
            };

            const payload = {
                candidates: [{ id: 'c1', locator: '.inside-shadow' }],
                shadowPath: ['#host']
            };

            const result = BatchResolver._evaluationScript(payload);

            expect(global.document.querySelector).toHaveBeenCalledWith('#host');
            expect(shadowRoot.querySelectorAll).toHaveBeenCalledWith('.inside-shadow');
            expect(result.results[0].count).toBe(1);
            expect(result.results[0].error).toBeNull();
        });

        it('should fail gracefully if shadow root is closed or unreachable', () => {
            const host = { shadowRoot: null }; // Closed shadow root
            
            global.document = {
                querySelector: vi.fn().mockReturnValue(host),
                body: {}
            };

            const payload = {
                candidates: [{ id: 'c1', locator: '.inside-shadow' }],
                shadowPath: ['#closed-host']
            };

            const result = BatchResolver._evaluationScript(payload);

            expect(global.document.querySelector).toHaveBeenCalledWith('#closed-host');
            expect(result.results[0].count).toBe(0);
            expect(result.results[0].error).toBe('Error: Shadow DOM unreachable');
        });
    });
});
