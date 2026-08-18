import { describe, it, expect } from 'vitest';
import { TestHarness, MockElement, MockPage } from './TestHarness.mjs';
import { Command } from '../../Command.mjs';
import { LocatorCandidate } from '../models/LocatorCandidate.mjs';

describe('TestHarness & Mock DOM Infrastructure', () => {
    it('should create a mock DOM tree from template', () => {
        const dom = TestHarness.createMockDOM([
            {
                tagName: 'DIV',
                id: 'container',
                className: 'main-box',
                children: [
                    { tagName: 'BUTTON', id: 'submit-btn', text: 'Submit', attributes: { 'data-op': 'save' } },
                    { tagName: 'INPUT', id: 'username', attributes: { type: 'text', placeholder: 'Enter name' } }
                ]
            }
        ]);

        expect(dom.tagName).toBe('BODY');
        const container = dom.querySelector('#container');
        expect(container).not.toBeNull();
        expect(container.className).toBe('main-box');

        const btn = dom.querySelector('button[data-op="save"]');
        expect(btn).not.toBeNull();
        expect(btn.id).toBe('submit-btn');
        expect(btn.textContent).toBe('Submit');
        expect(btn.offsetParent).not.toBeNull(); // Visible by default

        const input = dom.querySelector('#username');
        expect(input.getAttribute('placeholder')).toBe('Enter name');
    });

    it('should match descendant and child selectors in querySelectorAll', () => {
        const dom = TestHarness.createMockDOM([
            {
                tagName: 'DIV',
                id: 'parent',
                children: [
                    {
                        tagName: 'DIV',
                        className: 'child',
                        children: [
                            { tagName: 'SPAN', className: 'target', text: 'Nested' }
                        ]
                    }
                ]
            }
        ]);

        const spans = dom.querySelectorAll('#parent span.target');
        expect(spans.length).toBe(1);
        expect(spans[0].textContent).toBe('Nested');

        const directChildren = dom.querySelectorAll('#parent > .child');
        expect(directChildren.length).toBe(1);
    });

    it('should simulate Playwright locator methods in MockPage', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', className: 'btn', text: 'First' },
                { tagName: 'BUTTON', className: 'btn', text: 'Second' }
            ]
        });

        const locator = page.locator('.btn');
        expect(await locator.count()).toBe(2);
        expect(await locator.isVisible()).toBe(true);
        expect(await locator.isEnabled()).toBe(true);

        const first = locator.first();
        expect(await first.count()).toBe(1);

        await first.click();
        expect(page._actionLog.length).toBe(1);
        expect(page._actionLog[0].type).toBe('click');
    });

    it('should evaluate JavaScript in page.evaluate against mock DOM', async () => {
        const page = TestHarness.createMockPage({
            template: [
                { tagName: 'H1', id: 'title', text: 'Hello World' }
            ]
        });

        const result = await page.evaluate(() => {
            const el = document.querySelector('#title');
            return el ? el.textContent : null;
        });
        expect(result).toBe('Hello World');

        const count = await page.evaluate((sel) => {
            return document.querySelectorAll(sel).length;
        }, '#title');
        expect(count).toBe(1);
    });

    it('should generate synthetic candidates and commands', () => {
        const cands = TestHarness.createCandidates([
            { strategy: 'DataAttribute', locator: '[data-test="1"]', rank: 1, finalScore: 0.95 },
            { strategy: 'Text', locator: 'text="Submit"', rank: 2, finalScore: 0.80 }
        ]);

        expect(cands.length).toBe(2);
        expect(cands[0]).toBeInstanceOf(LocatorCandidate);
        expect(cands[0].ranking.finalScore).toBe(0.95);

        const cmd = TestHarness.createCommand({
            type: 'CLICK',
            payload: { locators: cands }
        });
        expect(cmd).toBeInstanceOf(Command);
        expect(cmd.type).toBe('CLICK');
        expect(cmd.payload.locators.length).toBe(2);
    });

    it('should assert resolution results correctly', () => {
        expect(() => {
            TestHarness.assertResolutionResult({ success: true, locator: { selector: '#btn' } }, { success: true, locator: '#btn' });
        }).not.toThrow();

        expect(() => {
            TestHarness.assertResolutionResult({ success: false, error: 'Element not found' }, { success: true });
        }).toThrow(/Expected resolution success to be true/);
    });
});
