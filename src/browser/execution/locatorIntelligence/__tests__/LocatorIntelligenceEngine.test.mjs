import { describe, it, expect } from 'vitest';
import { LocatorIntelligenceEngine } from '../engine/LocatorIntelligenceEngine.mjs';
import { MockElement } from './TestHarness.mjs';

describe('LocatorIntelligenceEngine (Phase 2 Integration)', () => {
    it('should run the full pipeline including FeatureExtractor and IdentityDocumentBuilder and return identityDocument in output', () => {
        const parent = new MockElement({ tagName: 'form', id: 'login-form', role: 'form' });
        const el = new MockElement({
            tagName: 'button',
            id: 'submit-login',
            className: 'btn submit',
            attributes: { 'data-testid': 'login-btn', 'aria-label': 'Log In' },
            text: 'Log In'
        });
        parent.appendChild(el);

        const engine = new LocatorIntelligenceEngine();
        const start = performance.now();
        const output = engine.process(el, [el, parent]);
        const duration = performance.now() - start;

        expect(output).toBeDefined();
        expect(output.identityDocument).toBeDefined();
        expect(output.identityDocument).not.toBeNull();
        expect(output.identityDocument.element.id).toBe('submit-login');
        expect(output.identityDocument.element.tagName).toBe('BUTTON');
        expect(output.identityDocument.text.exact).toBe('Log In');
        expect(output.identityDocument.fingerprint).toBeDefined();
        expect(output.identityDocument.fingerprint.structuralHash).toBeDefined();
        expect(output.locators).toBeDefined();
        expect(Array.isArray(output.locators)).toBe(true);
        expect(duration).toBeLessThan(10); // soft real-time constraint <10ms for full master pipeline in test
    });
});
