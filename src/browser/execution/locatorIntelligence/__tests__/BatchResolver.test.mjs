import { describe, it, expect } from 'vitest';
import { BatchResolver, BatchResult } from '../resolution/BatchResolver.mjs';
import { TestHarness, MockPage } from './TestHarness.mjs';

describe('BatchResolver (Phase 6)', () => {
    it('returns error result when no candidates provided', async () => {
        const page = new MockPage();
        const res = await BatchResolver.resolve(page, []);
        expect(res.success).toBe(false);
        expect(res.error).toBe('No candidates provided');
    });

    it('resolves standard CSS selectors in a single round-trip', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'btn-submit', text: 'Submit', visible: true },
                { tagName: 'DIV', className: 'card', text: 'Card 1', visible: true },
                { tagName: 'DIV', className: 'card', text: 'Card 2', visible: true }
            ]
        });

        const candidates = [
            { id: 'c1', locator: '#btn-submit', strategy: 'StructuralStrategy', rank: 1 },
            { id: 'c2', locator: '.card', strategy: 'SemanticClassStrategy', rank: 2 },
            { id: 'c3', locator: '#non-existent', strategy: 'StructuralStrategy', rank: 3 }
        ];

        const batchResult = await BatchResolver.resolve(page, candidates);
        expect(batchResult.success).toBe(true);
        expect(batchResult.results).toHaveLength(3);

        const [r1, r2, r3] = batchResult.results;
        expect(r1.count).toBe(1);
        expect(r1.visible).toBe(true);
        expect(r1.enabled).toBe(true);
        expect(r1.error).toBeNull();

        expect(r2.count).toBe(2);
        expect(r2.visible).toBe(true);

        expect(r3.count).toBe(0);
        expect(r3.visible).toBeNull();
    });

    it('handles Playwright text= selectors via fallback matching', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'SPAN', text: 'Hello World', visible: true },
                { tagName: 'BUTTON', text: 'Login', visible: true }
            ]
        });

        const candidates = [
            { id: 't1', locator: 'text="Hello World"', strategy: 'TextStrategy' },
            { id: 't2', locator: "text='Login'", strategy: 'TextStrategy' },
            { id: 't3', locator: 'text="Not Here"', strategy: 'TextStrategy' }
        ];

        const batchResult = await BatchResolver.resolve(page, candidates);
        expect(batchResult.success).toBe(true);
        expect(batchResult.results[0].count).toBe(1);
        expect(batchResult.results[1].count).toBe(1);
        expect(batchResult.results[2].count).toBe(0);
    });

    it('handles Playwright role= selectors via fallback matching', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', text: 'Save Changes', visible: true },
                { tagName: 'A', attributes: { href: '#' }, text: 'Cancel', visible: true }
            ]
        });

        const candidates = [
            { id: 'r1', locator: 'role=button[name="Save Changes"]', strategy: 'RoleStrategy' },
            { id: 'r2', locator: 'role=link[name="Cancel"]', strategy: 'RoleStrategy' },
            { id: 'r3', locator: 'role=button[name="Delete"]', strategy: 'RoleStrategy' }
        ];

        const batchResult = await BatchResolver.resolve(page, candidates);
        expect(batchResult.success).toBe(true);
        expect(batchResult.results[0].count).toBe(1);
        expect(batchResult.results[1].count).toBe(1);
        expect(batchResult.results[2].count).toBe(0);
    });

    it('records syntax errors for malformed selectors without aborting batch', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'INPUT', id: 'username', visible: true }
            ]
        });

        const candidates = [
            { id: 'good', locator: '#username', strategy: 'StructuralStrategy' },
            { id: 'bad', locator: 'div[[[malformed', strategy: 'StructuralStrategy' }
        ];

        const batchResult = await BatchResolver.resolve(page, candidates);
        expect(batchResult.success).toBe(true);
        expect(batchResult.results[0].count).toBe(1);
        expect(batchResult.results[0].error).toBeNull();
        expect(batchResult.results[1].count).toBe(0);
        expect(batchResult.results[1].error).toContain('SyntaxError');
    });

    it('categorizes results into unique, ambiguous, missing, and invalid buckets', async () => {
        const batchResult = new BatchResult({
            results: [
                { candidateId: 'c-unique', locator: '#id1', count: 1, visible: true, enabled: true, error: null },
                { candidateId: 'c-ambig', locator: '.cls', count: 3, visible: true, enabled: true, error: null },
                { candidateId: 'c-miss', locator: '#id2', count: 0, visible: null, enabled: null, error: null },
                { candidateId: 'c-err', locator: 'badsel', count: 0, visible: null, enabled: null, error: 'SyntaxError' }
            ],
            success: true
        });

        const candidates = [
            { id: 'c-unique', locator: '#id1', rank: 10, strategy: 'StructuralStrategy' },
            { id: 'c-ambig', locator: '.cls', rank: 20, strategy: 'SemanticClassStrategy' },
            { id: 'c-miss', locator: '#id2', rank: 30, strategy: 'StructuralStrategy' },
            { id: 'c-err', locator: 'badsel', rank: 40, strategy: 'StructuralStrategy' }
        ];

        const categorized = BatchResolver.categorize(batchResult, candidates);
        expect(categorized.unique).toHaveLength(1);
        expect(categorized.unique[0].candidateId).toBe('c-unique');
        expect(categorized.unique[0].rank).toBe(10);

        expect(categorized.ambiguous).toHaveLength(1);
        expect(categorized.ambiguous[0].candidateId).toBe('c-ambig');
        expect(categorized.ambiguous[0].rank).toBe(20);

        expect(categorized.missing).toHaveLength(1);
        expect(categorized.missing[0].candidateId).toBe('c-miss');

        expect(categorized.invalid).toHaveLength(1);
        expect(categorized.invalid[0].candidateId).toBe('c-err');
        expect(categorized.invalid[0].error).toBe('SyntaxError');
    });
});
