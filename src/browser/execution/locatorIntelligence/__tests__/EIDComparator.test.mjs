import { describe, it, expect } from 'vitest';
import { EIDComparator } from '../resolution/EIDComparator.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';

describe('EIDComparator', () => {
    it('returns 0.95 immediately on identityHash fast path match', () => {
        const eid1 = new ElementIdentityDocument({
            identityHash: 'hash-abc-123',
            element: { tagName: 'BUTTON', id: 'submit-btn' }
        });
        const eid2 = new ElementIdentityDocument({
            identityHash: 'hash-abc-123',
            element: { tagName: 'BUTTON', id: 'submit-btn' }
        });

        const score = EIDComparator.compare(eid1, eid2);
        expect(score.overallScore).toBe(0.95);
        expect(score.rejectionReasons.length).toBe(0);
    });

    it('computes multi-dimensional similarity when identityHashes differ', () => {
        const eid1 = new ElementIdentityDocument({
            identityHash: 'hash-111',
            element: { tagName: 'BUTTON', id: 'submit-btn', classes: ['btn', 'primary'], role: 'button' },
            text: { exact: 'Submit Order', normalized: 'submit order' },
            semantics: { landmark: 'main' }
        });

        const eid2 = new ElementIdentityDocument({
            identityHash: 'hash-222',
            element: { tagName: 'BUTTON', id: 'submit-btn', classes: ['btn', 'secondary'], role: 'button' },
            text: { exact: 'Submit Order Now', normalized: 'submit order now' },
            semantics: { landmark: 'main' }
        });

        const score = EIDComparator.compare(eid1, eid2);
        expect(score.overallScore).toBeGreaterThan(0.70);
        expect(score.overallScore).toBeLessThan(0.95);
        expect(score.dimensions.tagMatch).toBe(1.0);
        expect(score.dimensions.roleMatch).toBe(1.0);
        expect(score.dimensions.textSimilarity).toBeGreaterThan(0.5);
    });

    it('returns rejection reason and 0 score if one or both EIDs are missing', () => {
        const eid1 = new ElementIdentityDocument({ element: { tagName: 'DIV' } });
        const score = EIDComparator.compare(eid1, null);
        expect(score.overallScore).toBe(0.0);
        expect(score.rejectionReasons.length).toBeGreaterThan(0);
        expect(score.rejectionReasons[0]).toContain('MISSING_EID');
    });
});
