import { describe, it, expect } from 'vitest';
import { IdentityDocumentBuilder } from '../extraction/IdentityDocumentBuilder.mjs';
import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { PipelineContext } from '../engine/PipelineContext.mjs';
import { MockElement } from './TestHarness.mjs';

describe('IdentityDocumentBuilder (Phase 2)', () => {
    it('should construct a valid and immutable ElementIdentityDocument from features', () => {
        const parent = new MockElement({ tagName: 'section', id: 'pay-section', role: 'region' });
        const el = new MockElement({
            tagName: 'button',
            id: 'btn-pay',
            className: 'action-btn',
            attributes: { 'data-testid': 'pay-button', 'aria-label': 'Pay Now' },
            text: 'Pay Now $20'
        });
        parent.appendChild(el);

        const context = new PipelineContext(el, [el, parent]);
        const extractor = new FeatureExtractor();
        const builder = new IdentityDocumentBuilder();

        const start = performance.now();
        extractor.execute(context);
        builder.execute(context);
        const duration = performance.now() - start;

        expect(context.identityDocument).toBeDefined();
        expect(context.identityDocument).not.toBeNull();
        expect(context.identityDocument.version).toBe('1.0.0');
        expect(context.identityDocument.element.tagName).toBe('BUTTON');
        expect(context.identityDocument.element.id).toBe('btn-pay');
        expect(context.identityDocument.text.exact).toBe('Pay Now $20');
        expect(context.identityDocument.hierarchy.depth).toBe(1);
        expect(context.identityDocument.semantics.landmark).toBe('region');
        expect(Object.isFrozen(context.identityDocument)).toBe(true);
        expect(duration).toBeLessThan(50); // soft real-time constraint under parallel CI load
    });

    it('should set context.identityDocument to null if features are missing', () => {
        const builder = new IdentityDocumentBuilder();
        const context = new PipelineContext(null);
        builder.execute(context);
        expect(context.identityDocument).toBeNull();
    });
});
