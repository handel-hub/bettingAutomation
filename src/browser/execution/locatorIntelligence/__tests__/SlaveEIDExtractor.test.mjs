import { describe, it, expect } from 'vitest';
import { SlaveEIDExtractor } from '../resolution/SlaveEIDExtractor.mjs';
import { TestHarness } from './TestHarness.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';

describe('SlaveEIDExtractor', () => {
    it('extracts EID from mock page for a specific element index', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'DIV', className: 'container', id: 'main-box', text: 'Hello World', visible: true, attributes: { 'data-testid': 'box-1' } }
            ]
        });

        const eid = await SlaveEIDExtractor.extract(page, '#main-box', 0);
        expect(eid).toBeInstanceOf(ElementIdentityDocument);
        expect(eid.element.tagName).toBe('DIV');
        expect(eid.element.id).toBe('main-box');
        expect(eid.text.exact).toBe('Hello World');
        expect(eid.element.dataAttributes['data-testid']).toBe('box-1');
        expect(eid.identityHash).toBeDefined();
    });

    it('extractAll extracts EIDs for multiple matching elements in single call', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn', text: 'Button 1', visible: true },
                { tagName: 'BUTTON', className: 'btn', text: 'Button 2', visible: true }
            ]
        });

        const eids = await SlaveEIDExtractor.extractAll(page, '.btn', 5);
        expect(Array.isArray(eids)).toBe(true);
        expect(eids.length).toBe(2);
        expect(eids[0].text.exact).toBe('Button 1');
        expect(eids[1].text.exact).toBe('Button 2');
        expect(eids[0]).toBeInstanceOf(ElementIdentityDocument);
    });

    it('returns null or empty array when locator matches nothing', async () => {
        const page = TestHarness.createMockPage({ template: [] });

        const eid = await SlaveEIDExtractor.extract(page, '#missing', 0);
        expect(eid).toBeNull();

        const eids = await SlaveEIDExtractor.extractAll(page, '#missing');
        expect(eids).toEqual([]);
    });

    it('handles text= and role= selectors via fallback matching', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'A', href: '/login', text: 'Sign In', visible: true, attributes: { role: 'link' } }
            ]
        });

        const eidText = await SlaveEIDExtractor.extract(page, 'text="Sign In"');
        expect(eidText).toBeInstanceOf(ElementIdentityDocument);
        expect(eidText.text.exact).toBe('Sign In');
    });
});
