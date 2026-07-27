export class MutationRateTracker {
    constructor() {
        this.buffer = new Int32Array(60);
        this.index = 0;
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.buffer.fill(0);
        this.index = 0;
        const tick = () => {
            if (!this.isRunning) return;
            this.index = (this.index + 1) % 60;
            this.buffer[this.index] = 0;
            if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                this.timer = window.requestAnimationFrame(tick);
            } else {
                this.timer = setTimeout(tick, 16);
            }
        };
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            this.timer = window.requestAnimationFrame(tick);
        } else {
            this.timer = setTimeout(tick, 16);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.timer !== null) {
            if (typeof window !== 'undefined' && window.cancelAnimationFrame && typeof this.timer === 'number') {
                window.cancelAnimationFrame(this.timer);
            } else {
                clearTimeout(this.timer);
            }
            this.timer = null;
        }
    }

    increment(count = 1) {
        if (this.isRunning) {
            this.buffer[this.index] += count;
        }
    }

    getRate() {
        let sum = 0;
        for (let i = 0; i < 60; i++) {
            sum += this.buffer[i];
        }
        return sum;
    }
}

export class MutationProcessor {
    constructor(textIndex, accessibilityIndex = null, spatialCache = null, onUpdateCallback = null) {
        if (typeof accessibilityIndex === 'function') {
            onUpdateCallback = accessibilityIndex;
            accessibilityIndex = null;
            spatialCache = null;
        } else if (typeof spatialCache === 'function') {
            onUpdateCallback = spatialCache;
            spatialCache = null;
        }
        this.textIndex = textIndex;
        this.accessibilityIndex = accessibilityIndex;
        this.spatialCache = spatialCache;
        this.onUpdateCallback = onUpdateCallback;
        this.rateTracker = new MutationRateTracker();
        this.observer = null;
    }

    start(targetNode) {
        this.rateTracker.start();
        if (typeof MutationObserver !== 'undefined' && targetNode) {
            this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
            const target = targetNode.body || targetNode.documentElement || targetNode;
            if (target && target.nodeType) {
                this.observer.observe(target, {
                    childList: true,
                    characterData: true,
                    attributes: true,
                    subtree: true
                });
            }
        }
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.rateTracker.stop();
    }

    getMutationRate() {
        return this.rateTracker.getRate();
    }

    processMutations(mutations) {
        if (!mutations || !Array.isArray(mutations) || mutations.length === 0) return;
        this.rateTracker.increment(mutations.length);

        if (typeof this.onUpdateCallback === 'function') {
            this.onUpdateCallback('UPDATING');
        }

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 3) { // TEXT_NODE
                            const parent = node.parentElement || node.parentNode;
                            if (parent && parent.nodeType === 1) {
                                this._indexElement(parent);
                            }
                        } else if (node.nodeType === 1) { // ELEMENT_NODE
                            this._indexSubtree(node);
                        }
                    }
                }
                if (mutation.removedNodes) {
                    for (let i = 0; i < mutation.removedNodes.length; i++) {
                        const node = mutation.removedNodes[i];
                        if (node.nodeType === 3) { // TEXT_NODE
                            const parent = node.parentElement || node.parentNode;
                            if (parent && parent.nodeType === 1) {
                                this._indexElement(parent);
                            }
                        } else if (node.nodeType === 1) { // ELEMENT_NODE
                            this._unindexSubtree(node);
                        }
                    }
                }
            } else if (mutation.type === 'characterData') {
                const node = mutation.target;
                if (node && node.nodeType === 3) {
                    const parent = node.parentElement || node.parentNode;
                    if (parent && parent.nodeType === 1) {
                        this._indexElement(parent);
                    }
                }
            } else if (mutation.type === 'attributes') {
                const node = mutation.target;
                if (node && node.nodeType === 1) {
                    if (mutation.attributeName === 'value' || mutation.attributeName === 'placeholder' || mutation.attributeName === 'aria-label' || mutation.attributeName === 'role' || mutation.attributeName === 'type' || mutation.attributeName === 'title' || mutation.attributeName === 'alt') {
                        this._indexElement(node);
                    }
                }
            }
        }

        if (typeof this.onUpdateCallback === 'function') {
            this.onUpdateCallback('READY');
        }
    }

    _indexElement(el) {
        if (!el || el.nodeType !== 1) return;
        if (this.textIndex) {
            const text = el.textContent || el.value || el.getAttribute?.('aria-label') || el.getAttribute?.('placeholder') || '';
            if (text && text.trim().length > 0) {
                this.textIndex.add(el, text);
            } else {
                this.textIndex.remove(el);
            }
        }
        if (this.accessibilityIndex) {
            this.accessibilityIndex.add(el);
        }
        if (this.spatialCache) {
            this.spatialCache.observe(el);
        }
    }

    _indexSubtree(el) {
        if (!el || el.nodeType !== 1) return;
        this._indexElement(el);
        const children = el.children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                this._indexSubtree(children[i]);
            }
        }
    }

    _unindexSubtree(el) {
        if (!el || el.nodeType !== 1) return;
        if (this.textIndex) this.textIndex.remove(el);
        if (this.accessibilityIndex) this.accessibilityIndex.remove(el);
        if (this.spatialCache) this.spatialCache.unobserve(el);

        const children = el.children;
        if (children) {
            for (let i = 0; i < children.length; i++) {
                this._unindexSubtree(children[i]);
            }
        }
    }
}
export default MutationProcessor;
