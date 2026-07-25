import { describe, it, expect } from 'vitest';
import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { PipelineContext } from '../engine/PipelineContext.mjs';
import { MockElement } from './TestHarness.mjs';

describe('FeatureExtractor (Phase 2 Extended)', () => {
    it('should extract basic and extended features accurately', () => {
        const parent = new MockElement({ tagName: 'div', id: 'container', role: 'main' });
        const el = new MockElement({
            tagName: 'button',
            id: 'submit-btn',
            className: 'btn primary',
            role: 'button',
            attributes: {
                'data-testid': 'submit-order',
                'data-action': 'checkout',
                'aria-label': 'Submit Order',
                'aria-disabled': 'false'
            },
            text: 'Submit Order'
        });

        parent.appendChild(el);
        const sibling = new MockElement({ tagName: 'button', id: 'cancel-btn', text: 'Cancel' });
        parent.appendChild(sibling);

        const extractor = new FeatureExtractor();
        const context = new PipelineContext(el, [el, parent]);

        const start = performance.now();
        extractor.execute(context);
        const duration = performance.now() - start;

        expect(context.features).toBeDefined();
        expect(context.features.id).toBe('submit-btn');
        expect(context.features.tagName).toBe('button');
        expect(context.features.text).toBe('Submit Order');
        expect(context.features.dataAttributes['data-testid']).toBe('submit-order');
        expect(context.features.ariaAttributes['aria-label']).toBe('Submit Order');
        expect(context.features.ancestry.length).toBe(1);
        expect(context.features.ancestry[0].tagName).toBe('DIV');
        expect(context.features.landmark).toBe('main');
        expect(context.features.siblings.siblingCount).toBe(2);
        expect(context.features.siblings.siblingIndex).toBe(0);
        expect(duration).toBeLessThan(5); // soft real-time constraint <5ms for unit test
    });

    it('should gracefully handle null or non-Element inputs', () => {
        const extractor = new FeatureExtractor();
        const context1 = new PipelineContext(null);
        extractor.execute(context1);
        expect(context1.features).toBeNull();

        const context2 = new PipelineContext({ notAnElement: true });
        extractor.execute(context2);
        expect(context2.features).toBeNull();
    });
});
