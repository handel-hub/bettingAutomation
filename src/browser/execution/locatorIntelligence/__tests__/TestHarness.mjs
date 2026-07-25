import { LocatorCandidate } from '../models/LocatorCandidate.mjs';
import { Command } from '../../Command.mjs';

export class MockElement {
    constructor({
        tagName = 'DIV',
        id = '',
        className = '',
        text = '',
        attributes = {},
        rect = { top: 0, left: 0, width: 100, height: 30 },
        visible = true,
        disabled = false,
        role = null
    } = {}) {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this._className = className;
        this.classList = new Set(className ? className.split(/\s+/) : []);
        this._text = text;
        this._attributes = new Map(Object.entries(attributes));
        if (id) this._attributes.set('id', id);
        if (className) this._attributes.set('class', className);
        if (role) this._attributes.set('role', role);

        this.parentElement = null;
        this.children = [];
        this._rect = { ...rect, bottom: rect.top + rect.height, right: rect.left + rect.width, x: rect.left, y: rect.top };
        this._visible = visible;
        this.disabled = disabled;
        this.shadowRoot = null;
    }

    get className() {
        return Array.from(this.classList).join(' ');
    }

    set className(val) {
        this._className = val;
        this.classList = new Set(val ? val.split(/\s+/) : []);
        if (val) this._attributes.set('class', val);
        else this._attributes.delete('class');
    }

    get innerText() { return this._text; }
    get textContent() { return this._text; }
    set textContent(val) { this._text = val; }
    set innerText(val) { this._text = val; }

    get offsetParent() {
        return this._visible ? (this.parentElement || { tagName: 'BODY' }) : null;
    }

    getAttribute(name) {
        return this._attributes.has(name) ? this._attributes.get(name) : null;
    }

    setAttribute(name, val) {
        this._attributes.set(name, String(val));
        if (name === 'id') this.id = String(val);
        if (name === 'class') {
            this.classList = new Set(String(val).split(/\s+/));
        }
    }

    removeAttribute(name) {
        this._attributes.delete(name);
        if (name === 'id') this.id = '';
        if (name === 'class') this.classList.clear();
    }

    hasAttribute(name) {
        return this._attributes.has(name);
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentElement = null;
        }
        return child;
    }

    getBoundingClientRect() {
        return this._rect;
    }

    attachShadow(init) {
        this.shadowRoot = new MockElement({ tagName: '#SHADOW-ROOT' });
        return this.shadowRoot;
    }

    // Simple recursive DOM search for common CSS selectors
    querySelectorAll(selector) {
        if (!selector || selector.includes('[[[') || selector.includes('(((') || selector.startsWith(':syntax-error') || selector.includes(':malformed')) {
            throw new Error(`SyntaxError: Failed to execute 'querySelectorAll' on 'Element': '${selector}' is not a valid selector.`);
        }
        const results = [];
        const allNodes = [];
        const traverse = (node) => {
            if (node !== this) allNodes.push(node);
            for (const child of node.children) traverse(child);
        };
        traverse(this);

        // Very lightweight selector matching for tests
        for (const node of allNodes) {
            if (this._matchesSelector(node, selector)) {
                results.push(node);
            }
        }
        return results;
    }

    querySelector(selector) {
        const all = this.querySelectorAll(selector);
        return all.length > 0 ? all[0] : null;
    }

    _matchesSelector(node, sel) {
        sel = sel.trim();
        if (sel === '*') return true;

        // Parent > child
        if (sel.includes(' > ')) {
            const parts = sel.split(' > ').map(p => p.trim());
            let curr = node;
            for (let i = parts.length - 1; i >= 0; i--) {
                if (!curr || !this._matchesSelector(curr, parts[i])) return false;
                curr = curr.parentElement;
            }
            return true;
        }

        // Descendant (space)
        if (sel.includes(' ')) {
            const parts = sel.split(' ').map(p => p.trim());
            const targetSel = parts[parts.length - 1];
            if (!this._matchesSelector(node, targetSel)) return false;
            let ancestor = node.parentElement;
            let matchedIdx = parts.length - 2;
            while (ancestor && matchedIdx >= 0) {
                if (this._matchesSelector(ancestor, parts[matchedIdx])) {
                    matchedIdx--;
                }
                ancestor = ancestor.parentElement;
            }
            return matchedIdx < 0;
        }

        // Tag + attribute e.g. button[data-op="submit"]
        let tagPart = sel;
        let attrPart = null;
        let classPart = null;
        let idPart = null;

        if (sel.includes('[')) {
            const idx = sel.indexOf('[');
            tagPart = sel.substring(0, idx);
            attrPart = sel.substring(idx);
        } else if (sel.includes('.')) {
            const idx = sel.indexOf('.');
            tagPart = sel.substring(0, idx);
            classPart = sel.substring(idx + 1);
        } else if (sel.includes('#')) {
            const idx = sel.indexOf('#');
            tagPart = sel.substring(0, idx);
            idPart = sel.substring(idx + 1);
        }

        if (tagPart && tagPart !== '*' && node.tagName !== tagPart.toUpperCase()) {
            return false;
        }
        if (idPart && node.id !== idPart) {
            return false;
        }
        if (classPart && !node.classList.has(classPart)) {
            return false;
        }
        if (attrPart) {
            // e.g. [data-op="submit"]
            const m = attrPart.match(/\[([a-zA-Z0-9_-]+)(?:=["']([^"']*)["'])?\]/);
            if (m) {
                const attrName = m[1];
                const attrVal = m[2];
                if (!node.hasAttribute(attrName)) return false;
                if (attrVal !== undefined && node.getAttribute(attrName) !== attrVal) return false;
            }
        }
        return true;
    }
}

export class MockLocator {
    constructor(page, selector, elements = []) {
        this.page = page;
        this.selector = selector;
        this.elements = elements;
    }

    first() {
        return new MockLocator(this.page, this.selector, this.elements.slice(0, 1));
    }

    nth(index) {
        const el = this.elements[index];
        return new MockLocator(this.page, this.selector, el ? [el] : []);
    }

    async count() {
        return this.elements.length;
    }

    async isVisible() {
        if (this.elements.length === 0) return false;
        const el = this.elements[0];
        return el.offsetParent !== null && el.getBoundingClientRect().height > 0;
    }

    async isEnabled() {
        if (this.elements.length === 0) return false;
        const el = this.elements[0];
        return !el.disabled && el.getAttribute('aria-disabled') !== 'true';
    }

    async click() {
        if (this.elements.length === 0) {
            throw new Error(`Locator not found: ${this.selector}`);
        }
        this.page._actionLog.push({ type: 'click', selector: this.selector, element: this.elements[0] });
    }
}

export class MockPage {
    constructor(mockDocument = null, url = 'https://example.com/home') {
        this.mockDocument = mockDocument || new MockElement({ tagName: 'BODY' });
        this.mockWindow = {
            document: this.mockDocument,
            location: { href: url, pathname: new URL(url).pathname }
        };
        this.url = () => this.mockWindow.location.href;
        this._actionLog = [];
        this._exposedBindings = new Map();
    }

    locator(selector) {
        let elements = [];
        if (selector.startsWith('text=')) {
            const text = selector.substring(5).replace(/^["']|["']$/g, '');
            const all = this.mockDocument.querySelectorAll('*');
            elements = all.filter(el => el.textContent.trim() === text);
        } else if (selector.startsWith('role=')) {
            // e.g. role=button[name="Submit"]
            const all = this.mockDocument.querySelectorAll('*');
            elements = all.filter(el => {
                const roleAttr = el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : '');
                if (!selector.includes(roleAttr)) return false;
                const nameMatch = selector.match(/name=["']([^"']+)["']/);
                if (nameMatch) {
                    const name = nameMatch[1];
                    return el.textContent.includes(name) || el.getAttribute('aria-label') === name;
                }
                return true;
            });
        } else {
            elements = this.mockDocument.querySelectorAll(selector);
        }
        return new MockLocator(this, selector, elements);
    }

    async evaluate(fn, arg) {
        const prevDoc = global.document;
        const prevWin = global.window;
        const prevNodeFilter = global.NodeFilter;
        try {
            global.document = this.mockDocument;
            global.window = this.mockWindow;
            global.NodeFilter = { SHOW_ELEMENT: 1 };
            
            // Provide TreeWalker mock for document if needed
            if (!this.mockDocument.createTreeWalker) {
                this.mockDocument.createTreeWalker = (root, whatToShow, filter) => {
                    const nodes = [];
                    const traverse = (node) => {
                        nodes.push(node);
                        for (const c of node.children) traverse(c);
                    };
                    traverse(root);
                    let idx = 0;
                    return {
                        nextNode: () => {
                            while (idx < nodes.length) {
                                const n = nodes[idx++];
                                if (!filter || (typeof filter === 'function' && filter(n)) || (filter.acceptNode && filter.acceptNode(n))) {
                                    return n;
                                }
                            }
                            return null;
                        }
                    };
                };
            }

            if (typeof fn === 'string') {
                const func = new Function('arg', `return (${fn})(arg)`);
                return await func(arg);
            } else if (typeof fn === 'function') {
                return await fn(arg);
            }
        } finally {
            if (prevDoc === undefined) delete global.document; else global.document = prevDoc;
            if (prevWin === undefined) delete global.window; else global.window = prevWin;
            if (prevNodeFilter === undefined) delete global.NodeFilter; else global.NodeFilter = prevNodeFilter;
        }
    }

    async exposeBinding(name, callback) {
        this._exposedBindings.set(name, callback);
    }

    async reload() {
        this._actionLog.push({ type: 'reload' });
    }
}

export class TestHarness {
    static createMockDOM(template = []) {
        const body = new MockElement({ tagName: 'BODY' });
        const buildTree = (parent, specs) => {
            for (const spec of specs) {
                const el = new MockElement(spec);
                parent.appendChild(el);
                if (spec.children && spec.children.length > 0) {
                    buildTree(el, spec.children);
                }
            }
        };
        buildTree(body, template);
        return body;
    }

    static createMockPage(options = {}) {
        const dom = options.dom || TestHarness.createMockDOM(options.template || []);
        return new MockPage(dom, options.url || 'https://example.com/test');
    }

    static createCandidates(specs = []) {
        return specs.map((spec, index) => {
            const cand = new LocatorCandidate({
                strategy: spec.strategy || 'Text',
                locator: spec.locator || `[data-test="${index}"]`,
                rank: spec.rank !== undefined ? spec.rank : index + 1
            });
            if (spec.finalScore !== undefined) {
                cand.ranking.finalScore = spec.finalScore;
            }
            if (spec.validationStatus) {
                cand.validation.status = spec.validationStatus;
            }
            if (spec.features) {
                cand.features = spec.features;
            }
            return cand;
        });
    }

    static createCommand(overrides = {}) {
        return new Command({
            category: 'Execution',
            type: 'CLICK',
            payload: {
                locators: overrides.locators || [],
                identityDocument: overrides.identityDocument || null
            },
            source: 'test-master',
            ...overrides
        });
    }

    static assertResolutionResult(result, expectations) {
        if (expectations.success !== undefined) {
            if (result.success !== expectations.success) {
                throw new Error(`Expected resolution success to be ${expectations.success}, but got ${result.success}`);
            }
        }
        if (expectations.locator !== undefined && result.locator) {
            if (result.locator.selector !== expectations.locator && result.locator !== expectations.locator) {
                throw new Error(`Expected locator to match ${expectations.locator}, but got ${result.locator.selector || result.locator}`);
            }
        }
        if (expectations.error !== undefined && !result.success) {
            if (result.error && !String(result.error).includes(expectations.error)) {
                throw new Error(`Expected error to include "${expectations.error}", but got "${result.error}"`);
            }
        }
    }
}
export default TestHarness;
