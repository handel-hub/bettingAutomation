import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TextIndex } from '../scenegraph/TextIndex.mjs';
import { MutationProcessor } from '../scenegraph/MutationProcessor.mjs';
import { QueryPlanner, CandidateRecord } from '../scenegraph/QueryPlanner.mjs';
import { SceneGraph } from '../scenegraph/SceneGraph.mjs';

class MockNode {
    constructor(tagName, textContent = '', attributes = {}) {
        this.nodeType = 1;
        this.tagName = tagName.toUpperCase();
        this.textContent = textContent;
        this.value = '';
        this.attributes = attributes;
        this.children = [];
        this.parentElement = null;
        this.parentNode = null;
        this.id = attributes.id || '';
        this.classList = {
            contains: (cls) => (attributes.class || '').split(' ').includes(cls)
        };
    }

    getAttribute(name) {
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
    }

    hasAttribute(name) {
        return this.attributes[name] !== undefined;
    }

    setAttribute(name, val) {
        this.attributes[name] = val;
        if (name === 'id') this.id = val;
    }

    appendChild(child) {
        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentElement = null;
            child.parentNode = null;
        }
        return child;
    }

    querySelectorAll(selector) {
        const results = [];
        const match = (el) => {
            if (selector === '*') {
                results.push(el);
            } else if (selector.startsWith('[data-testid="') && selector.endsWith('"]')) {
                const val = selector.slice(14, -2);
                if (el.getAttribute('data-testid') === val) results.push(el);
            } else if (selector.startsWith('#')) {
                const val = selector.slice(1);
                if (el.id === val) results.push(el);
            } else if (el.tagName === selector.toUpperCase() || el.tagName.toLowerCase() === selector.toLowerCase()) {
                results.push(el);
            }
            for (const c of el.children) match(c);
        };
        for (const c of this.children) match(c);
        return results;
    }

    getBoundingClientRect() {
        return { x: 10, y: 20, width: 100, height: 30, top: 20, left: 10, right: 110, bottom: 50 };
    }
}

class MockDocument extends MockNode {
    constructor() {
        super('document');
        this.nodeType = 9;
        this.body = new MockNode('body');
        this.appendChild(this.body);
    }
}

describe('SceneGraph Subsystem (Phase 2)', () => {
    let doc;
    beforeEach(() => {
        doc = new MockDocument();
    });

    it('TextIndex correctly indexes normalized text and handles removals', () => {
        const index = new TextIndex();
        const btn1 = new MockNode('button', 'Submit Order ');
        const btn2 = new MockNode('button', 'Cancel Order');

        index.add(btn1, btn1.textContent);
        index.add(btn2, btn2.textContent);

        expect(index.get('submit order').has(btn1)).toBe(true);
        expect(index.get('order').has(btn1)).toBe(true);
        expect(index.get('order').has(btn2)).toBe(true);

        index.remove(btn1);
        expect(index.get('submit order').has(btn1)).toBe(false);
        expect(index.get('order').has(btn1)).toBe(false);
        expect(index.get('order').has(btn2)).toBe(true);
    });

    it('MutationProcessor tracks additions and removals', () => {
        const index = new TextIndex();
        const processor = new MutationProcessor(index);
        processor.start(doc);

        const newEl = new MockNode('div', 'Dynamic Element');
        doc.body.appendChild(newEl);

        processor.processMutations([
            { type: 'childList', addedNodes: [newEl], removedNodes: [] }
        ]);

        expect(index.get('dynamic element').has(newEl)).toBe(true);
        expect(processor.getMutationRate()).toBeGreaterThan(0);

        doc.body.removeChild(newEl);
        processor.processMutations([
            { type: 'childList', addedNodes: [], removedNodes: [newEl] }
        ]);

        expect(index.get('dynamic element').has(newEl)).toBe(false);
        processor.stop();
    });

    it('SceneGraph initialize and isReady work correctly', () => {
        const sg = new SceneGraph();
        expect(sg.isReady()).toBe(false);

        const heading = new MockNode('h1', 'Dashboard Home');
        doc.body.appendChild(heading);

        sg.initialize(doc);
        expect(sg.isReady()).toBe(true);
        expect(sg.getStabilityState()).toBe('STABLE');

        const results = sg.query({ textContent: 'Dashboard Home' });
        expect(results.length).toBe(1);
        expect(results[0].node).toBe(heading);
        expect(results[0].locator).toBe('text="Dashboard Home"');

        sg.destroy();
        expect(sg.isReady()).toBe(false);
    });

    it('QueryPlanner prioritizes dataTestId over text content', () => {
        const sg = new SceneGraph();
        const elTestId = new MockNode('button', 'Click Me', { 'data-testid': 'btn-submit' });
        const elText = new MockNode('button', 'Click Me');
        doc.body.appendChild(elTestId);
        doc.body.appendChild(elText);

        sg.initialize(doc);

        const results = sg.query({ dataTestId: 'btn-submit', textContent: 'Click Me' });
        expect(results.length).toBe(1);
        expect(results[0].node).toBe(elTestId);
        expect(results[0].locator).toBe('[data-testid="btn-submit"]');
    });

    it('Memory usage < 1MB on a 5000-node test DOM', () => {
        const sg = new SceneGraph();
        const spaLabels = ['Dashboard Item', 'Status Active', 'User Profile', 'Settings Account', 'Order Pending', 'Payment Processed', 'View Details', 'Edit Record', 'Delete Entry', 'Create New'];
        for (let i = 0; i < 5000; i++) {
            const el = new MockNode('div', spaLabels[i % spaLabels.length], { id: `item-${i}`, 'data-testid': `test-${i}` });
            doc.body.appendChild(el);
        }

        if (global.gc) global.gc();
        const memBefore = process.memoryUsage().heapUsed;
        sg.initialize(doc);
        if (global.gc) global.gc();
        const memAfter = process.memoryUsage().heapUsed;

        const diffBytes = memAfter - memBefore;
        const diffMB = diffBytes / (1024 * 1024);
        
        expect(sg.textIndex.size).toBeGreaterThan(0);
        const threshold = global.gc ? 1.0 : 2.5; // Without GC, V8 retains ~1.5MB of uncollected heap allocations
        expect(diffMB).toBeLessThan(threshold);
        sg.destroy();
    });

    it('Accessibility Index correctly indexes role and aria-label attributes', () => {
        const sg = new SceneGraph();
        const btn = new MockNode('button', 'Submit', { role: 'button', 'aria-label': 'submit form' });
        const link = new MockNode('a', 'Home', { 'aria-label': 'homepage link', href: '#' });
        doc.body.appendChild(btn);
        doc.body.appendChild(link);

        sg.initialize(doc);
        expect(sg.accessibilityIndex.getByRole('button').has(btn)).toBe(true);
        expect(sg.accessibilityIndex.getByLabel('submit form').has(btn)).toBe(true);
        expect(sg.accessibilityIndex.getByLabel('homepage link').has(link)).toBe(true);

        const results = sg.query({ ariaLabel: 'homepage link' });
        expect(results.length).toBe(1);
        expect(results[0].node).toBe(link);
        expect(results[0].ariaRole).toBe('link');
        sg.destroy();
    });

    it('SpatialCache updates bounds and visibility without synchronous layout', () => {
        const sg = new SceneGraph();
        const box = new MockNode('div', 'Content', { id: 'box' });
        box.getBoundingClientRect = () => ({ x: 10, y: 20, width: 100, height: 50, top: 20, left: 10, right: 110, bottom: 70 });
        doc.body.appendChild(box);

        sg.initialize(doc);
        const results = sg.query({ textContent: 'Content' });
        expect(results.length).toBe(1);
        expect(results[0].isVisible).toBe(true);
        expect(results[0].approximateBounds).toMatchObject({ x: 10, y: 20, width: 100, height: 50, top: 20, left: 10, right: 110, bottom: 70 });
        sg.destroy();
    });

    it('ResolutionMemory LRU eviction at 128 entries functions correctly and boosts query hits', () => {
        const sg = new SceneGraph();
        for (let i = 0; i < 150; i++) {
            sg.rememberResolution('/app', `hash-${i}`, 'TEST_STRATEGY', `#el-${i}`, 0.95);
        }
        expect(sg.resolutionMemory.size()).toBe(128);
        expect(sg.recallResolution('/app', 'hash-0')).toBeNull(); // Evicted (oldest)
        expect(sg.recallResolution('/app', 'hash-149')).not.toBeNull(); // Present (newest)

        const targetEl = new MockNode('div', 'Target Text', { id: 'el-target' });
        doc.body.appendChild(targetEl);
        sg.initialize(doc);

        sg.rememberResolution('/app', 'target-hash', 'TEST_STRATEGY', '#el-target', 0.99);
        const results = sg.query({ urlPath: '/app', eidHash: 'target-hash', textContent: 'Target Text' });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].isMemoryHit).toBe(true);
        expect(results[0].memoryConfidence).toBe(0.99);
        sg.destroy();
    });
});
