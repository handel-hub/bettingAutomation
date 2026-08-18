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
        expect(context.features.semantic.dataTestId).toBe('submit-order');
        expect(context.features.confidenceScore).toBeGreaterThan(0.7);
        expect(context.features.identityHash).toBeDefined();
        expect(duration).toBeLessThan(15); // soft real-time constraint <15ms for unit test
    });

    it('should gracefully handle null or non-Element inputs with 100% fault-tolerant P-EID', () => {
        const extractor = new FeatureExtractor();
        const context1 = new PipelineContext(null);
        extractor.execute(context1);
        expect(context1.features).not.toBeNull();
        expect(context1.features.confidenceScore).toBe(0.0);
        expect(context1.features.anomalyFlags).toBeGreaterThan(0);

        const context2 = new PipelineContext({ notAnElement: true });
        extractor.execute(context2);
        expect(context2.features).not.toBeNull();
        expect(context2.features.confidenceScore).toBe(0.0);
        expect(context2.features.anomalyFlags).toBeGreaterThan(0);
    });
});

