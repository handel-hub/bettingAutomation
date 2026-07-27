import { describe, it, expect } from 'vitest';
import { FeatureExtractor } from '../extraction/FeatureExtractor.mjs';
import { IdentityDocumentBuilder } from '../extraction/IdentityDocumentBuilder.mjs';
import { CommandPayloadSchema } from '../../schema/CommandPayloadSchema.mjs';
import { MockElement } from './TestHarness.mjs';

describe('Phase 1 — Core Model & Extraction Enhancements', () => {
    describe('Text Normalization (vNext §1.1.3)', () => {
        it('normalizes whitespace, trims, and converts to lowercase', () => {
            const raw = '   Hello \t\n  World!   ';
            const normalized = FeatureExtractor.normalizeText(raw);
            expect(normalized).toBe('hello world!');
        });

        it('truncates text to 256 characters', () => {
            const longText = 'A'.repeat(300);
            const normalized = FeatureExtractor.normalizeText(longText);
            expect(normalized.length).toBe(256);
            expect(normalized).toBe('a'.repeat(256));
        });

        it('handles null, undefined, and non-string inputs safely', () => {
            expect(FeatureExtractor.normalizeText(null)).toBe('');
            expect(FeatureExtractor.normalizeText(undefined)).toBe('');
            expect(FeatureExtractor.normalizeText(12345)).toBe('');
        });
    });

    describe('Anchor Extraction (vNext §1.1.4)', () => {
        it('finds nearest ancestor with unique text within depth 5 and calculates spatial vector', () => {
            const parent = new MockElement({
                tagName: 'DIV',
                text: 'Unique Container Title',
                rect: { left: 10, top: 20, width: 200, height: 100 }
            });
            const child = new MockElement({
                tagName: 'BUTTON',
                text: 'Click Me',
                rect: { left: 30, top: 50, width: 50, height: 20 }
            });
            parent.appendChild(child);

            const extractor = new FeatureExtractor();
            const anchor = extractor.extractAnchor(child);

            expect(anchor).not.toBeNull();
            expect(anchor.textContent).toBe('unique container titleclick me');
            expect(anchor.tagName).toBe('DIV');
            expect(anchor.edgeDistance).toBe(1);
            expect(anchor.spatialVector).toEqual({ dx: -20, dy: -30 });
        });

        it('falls back to lateral sibling if ancestor has identical or no unique text', () => {
            const container = new MockElement({ tagName: 'DIV', text: '' });
            const sibling = new MockElement({
                tagName: 'SPAN',
                attributes: { 'aria-label': 'Sibling Label' },
                rect: { left: 5, top: 10, width: 40, height: 15 }
            });
            const target = new MockElement({
                tagName: 'INPUT',
                text: '',
                rect: { left: 50, top: 10, width: 100, height: 20 }
            });
            container.appendChild(sibling);
            container.appendChild(target);

            const extractor = new FeatureExtractor();
            const anchor = extractor.extractAnchor(target);

            expect(anchor).not.toBeNull();
            expect(anchor.textContent).toBe('sibling label');
            expect(anchor.tagName).toBe('SPAN');
            expect(anchor.edgeDistance).toBe(2);
            expect(anchor.spatialVector).toEqual({ dx: -45, dy: 0 });
        });

        it('returns null if no unique anchor is found within depth 5', () => {
            let current = new MockElement({ tagName: 'BODY', text: '' });
            for (let i = 0; i < 7; i++) {
                const next = new MockElement({ tagName: 'DIV', text: '' });
                current.appendChild(next);
                current = next;
            }
            const target = new MockElement({ tagName: 'BUTTON', text: 'Submit' });
            current.appendChild(target);

            const extractor = new FeatureExtractor();
            const anchor = extractor.extractAnchor(target);

            expect(anchor).toBeNull();
        });
    });

    describe('AOM Role Extraction & Overriding', () => {
        it('prioritizes element.role property over attribute role', () => {
            const el = new MockElement({
                tagName: 'DIV',
                attributes: { role: 'generic' }
            });
            el.role = 'button'; // AOM property

            const extractor = new FeatureExtractor();
            const context = { element: el, composedPath: [el] };
            extractor.execute(context);

            expect(context.features.role).toBe('button');
            expect(context.features.semantic.ariaRole).toBe('button');
        });
    });

    describe('CSS Selector Extraction Hint', () => {
        it('extracts clean ID selector when present', () => {
            const el = new MockElement({ tagName: 'BUTTON', id: 'submit-btn' });
            const extractor = new FeatureExtractor();
            const context = { element: el, composedPath: [el] };
            extractor.execute(context);

            expect(context.features.cssSelector).toBe('#submit-btn');
        });

        it('extracts data-testid selector when ID is absent or volatile', () => {
            const el = new MockElement({
                tagName: 'DIV',
                id: 'uuid-12345678', // volatile ID
                attributes: { 'data-testid': 'user-profile-card' }
            });
            const extractor = new FeatureExtractor();
            const context = { element: el, composedPath: [el] };
            extractor.execute(context);

            expect(context.features.cssSelector).toBe('[data-testid="user-profile-card"]');
        });
    });

    describe('IdentityDocumentBuilder Integration', () => {
        it('builds EID with anchor, captureTimestamp, sourceEpoch, and cssSelector', () => {
            const el = new MockElement({
                tagName: 'BUTTON',
                text: '  Confirm Order  ',
                id: 'confirm-btn'
            });
            const extractor = new FeatureExtractor();
            const context = {
                element: el,
                composedPath: [el],
                metadata: {
                    captureTimestamp: 1722000000000,
                    sourceEpoch: 42
                }
            };
            extractor.execute(context);

            const builder = new IdentityDocumentBuilder();
            builder.execute(context);

            const eid = context.identityDocument;
            expect(eid).toBeDefined();
            expect(eid.captureTimestamp).toBe(1722000000000);
            expect(eid.sourceEpoch).toBe(42);
            expect(eid.cssSelector).toBe('#confirm-btn');
            expect(eid.text.exact).toBe('Confirm Order');
            expect(eid.text.normalized).toBe('confirm order');

            // Test serialization and deserialization
            const serialized = JSON.stringify(eid.serialize());
            const parsed = JSON.parse(serialized);
            expect(parsed.captureTimestamp).toBe(1722000000000);
            expect(parsed.sourceEpoch).toBe(42);
            expect(parsed.cssSelector).toBe('#confirm-btn');
            expect(parsed.text.normalized).toBe('confirm order');
        });
    });

    describe('CommandPayloadSchema Validation', () => {
        const validBaseEID = {
            version: '1.0.0',
            identityHash: 'abcdef12',
            tagName: 'BUTTON',
            attributes: {},
            boundingBox: { x: 0, y: 0, width: 10, height: 10 }
        };

        it('validates EID with valid optional Phase 1 fields', () => {
            const eid = {
                ...validBaseEID,
                anchor: {
                    textContent: 'parent title',
                    tagName: 'DIV',
                    edgeDistance: 1,
                    spatialVector: { dx: -10, dy: -20 }
                },
                captureTimestamp: 1722000000000,
                sourceEpoch: 5,
                cssSelector: 'div.container > button'
            };
            expect(CommandPayloadSchema.isEIDValid(eid)).toBe(true);
        });

        it('rejects EID with malformed anchor structure', () => {
            const eid = {
                ...validBaseEID,
                anchor: {
                    textContent: 12345, // invalid type
                    tagName: 'DIV'
                }
            };
            expect(CommandPayloadSchema.isEIDValid(eid)).toBe(false);
        });

        it('rejects EID with non-integer sourceEpoch', () => {
            const eid = {
                ...validBaseEID,
                sourceEpoch: 5.5
            };
            expect(CommandPayloadSchema.isEIDValid(eid)).toBe(false);
        });

        it('rejects EID with non-string cssSelector', () => {
            const eid = {
                ...validBaseEID,
                cssSelector: 12345
            };
            expect(CommandPayloadSchema.isEIDValid(eid)).toBe(false);
        });
    });
});
