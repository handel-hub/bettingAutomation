import { describe, it, expect } from 'vitest';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';

describe('ElementIdentityDocument', () => {
    const sampleData = {
        url: 'https://test.com/checkout',
        element: {
            tagName: 'BUTTON',
            id: 'pay-now',
            role: 'button',
            classes: ['btn', 'primary'],
            dataAttributes: { 'data-action': 'pay' }
        },
        text: {
            exact: 'Pay Now $10',
            normalized: 'pay now $10',
            wordCount: 3,
            isNumeric: false
        },
        hierarchy: {
            depth: 5,
            siblingIndex: 1,
            ancestors: [{ tagName: 'FORM', id: 'payment' }]
        },
        semantics: {
            landmark: 'main',
            componentRoot: 'PaymentForm'
        }
    };

    it('should create an immutable instance with default fallbacks', () => {
        const eid = new ElementIdentityDocument(sampleData);

        expect(eid.version).toBe('1.0.0');
        expect(eid.url).toBe('https://test.com/checkout');
        expect(eid.element.tagName).toBe('BUTTON');
        expect(eid.text.wordCount).toBe(3);
        expect(Object.isFrozen(eid)).toBe(true);
        expect(Object.isFrozen(eid.element)).toBe(true);
        expect(Object.isFrozen(eid.element.classes)).toBe(true);

        expect(() => {
            eid.element.id = 'modified';
        }).toThrow();
    });

    it('should calculate deterministic FNV-1a 32-bit hashes', () => {
        const h1 = ElementIdentityDocument.computeFNV1a('test string');
        const h2 = ElementIdentityDocument.computeFNV1a('test string');
        const h3 = ElementIdentityDocument.computeFNV1a('different string');

        expect(h1).toBe(h2);
        expect(h1).not.toBe(h3);
        expect(h1).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should automatically compute fingerprint and identityHash', () => {
        const eid = new ElementIdentityDocument(sampleData);

        expect(eid.fingerprint.structuralHash).toMatch(/^[0-9a-f]{8}$/);
        expect(eid.fingerprint.semanticHash).toMatch(/^[0-9a-f]{8}$/);
        expect(eid.fingerprint.contentHash).toMatch(/^[0-9a-f]{8}$/);
        expect(eid.identityHash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should serialize and deserialize identically', () => {
        const eid1 = new ElementIdentityDocument(sampleData);
        const serialized = eid1.serialize();
        const jsonStr = JSON.stringify(serialized);
        const parsed = JSON.parse(jsonStr);

        const eid2 = ElementIdentityDocument.deserialize(parsed);

        expect(eid2.identityHash).toBe(eid1.identityHash);
        expect(eid2.fingerprint.structuralHash).toBe(eid1.fingerprint.structuralHash);
        expect(eid2.element.classes).toEqual(eid1.element.classes);
        expect(eid2.hierarchy.ancestors).toEqual(eid1.hierarchy.ancestors);
    });
});
