export class SpatialCache {
    constructor() {
        this.cache = new WeakMap(); // Element -> { x, y, width, height, top, left, right, bottom, isIntersecting, visible, lastUpdated }
        this.observedElements = new Set();
        this.observer = null;
    }

    start(rootDocument) {
        this.stop();
        if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function') {
            try {
                this.observer = new window.IntersectionObserver((entries) => {
                    const now = Date.now();
                    for (let i = 0; i < entries.length; i++) {
                        const entry = entries[i];
                        const rect = entry.boundingClientRect;
                        if (rect && entry.target) {
                            this.cache.set(entry.target, {
                                x: rect.x || rect.left || 0,
                                y: rect.y || rect.top || 0,
                                width: rect.width || 0,
                                height: rect.height || 0,
                                top: rect.top || 0,
                                left: rect.left || 0,
                                right: rect.right || 0,
                                bottom: rect.bottom || 0,
                                isIntersecting: entry.isIntersecting,
                                visible: entry.isIntersecting && entry.intersectionRatio > 0,
                                lastUpdated: now
                            });
                        }
                    }
                }, {
                    root: null,
                    threshold: [0, 0.1, 0.5, 1.0]
                });
            } catch (e) {
                this.observer = null;
            }
        }
    }

    observe(element) {
        if (!element || element.nodeType !== 1) return;
        if (!this.observedElements.has(element)) {
            this.observedElements.add(element);
            if (this.observer) {
                try {
                    this.observer.observe(element);
                } catch (e) {}
            }
        }
    }

    unobserve(element) {
        if (!element) return;
        if (this.observedElements.has(element)) {
            this.observedElements.delete(element);
            if (this.observer) {
                try {
                    this.observer.unobserve(element);
                } catch (e) {}
            }
        }
        this.cache.delete(element);
    }

    getBounds(element) {
        if (!element || element.nodeType !== 1) return null;
        let bounds = this.cache.get(element);
        if (!bounds && typeof element.getBoundingClientRect === 'function') {
            try {
                const rect = element.getBoundingClientRect();
                bounds = {
                    x: rect.x || rect.left || 0,
                    y: rect.y || rect.top || 0,
                    width: rect.width || 0,
                    height: rect.height || 0,
                    top: rect.top || 0,
                    left: rect.left || 0,
                    right: rect.right || 0,
                    bottom: rect.bottom || 0,
                    isIntersecting: true,
                    visible: rect.width > 0 && rect.height > 0,
                    lastUpdated: Date.now()
                };
                this.cache.set(element, bounds);
            } catch (e) {
                return null;
            }
        }
        return bounds || null;
    }

    isVisible(element) {
        const bounds = this.getBounds(element);
        if (!bounds) return false;
        return bounds.visible === true && bounds.width > 0 && bounds.height > 0;
    }

    stop() {
        if (this.observer) {
            try {
                this.observer.disconnect();
            } catch (e) {}
            this.observer = null;
        }
    }

    clear() {
        this.stop();
        this.observedElements.clear();
        this.cache = new WeakMap();
    }

    get size() {
        return this.observedElements.size;
    }
}
export default SpatialCache;
