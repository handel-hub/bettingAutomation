import { logger } from '../../../../config.mjs';
import featureFlags from '../../../execution/locatorIntelligence/FeatureFlags.mjs';

/**
 * Injects a script into the browser to monitor scroll events
 * and emits normalized ScrollEvent payloads.
 */
export class ScrollTracker {
    constructor(browserId, page, options = {}) {
        this.browserId = browserId;
        this.page = page;
        this.options = options;
        this.started = false;
        this.onScrollEvent = null;
    }

    async initialize() {
        if (this.started) return;
        this.started = true;

        const v4SpatialScroll = this.options.v4SpatialScroll !== undefined 
            ? this.options.v4SpatialScroll 
            : featureFlags.isEnabled('V4_SPATIAL_SCROLL');

        await this.page.exposeFunction('dispatchProviderScrollEvent', (eventData) => {
            if (this.onScrollEvent) {
                this.onScrollEvent(eventData);
            }
        });

        const scriptContent = `
            (() => {
                if (window.__scrollTrackerInitialized) return;
                window.__scrollTrackerInitialized = true;
                window.__pendingScrolls = new Map();
                window.__rafId = null;
                window.__fallbackTimerId = null;

                let lastPageX = window.pageXOffset || document.documentElement.scrollLeft;
                let lastPageY = window.pageYOffset || document.documentElement.scrollTop;
                let lastTime = performance.now();
                
                // Track per-element scroll states to compute accurate velocity
                const elementScrollStates = new WeakMap();

                function identifyContainer(el) {
                    if (!el || el === window || el === document || el === document.documentElement || el === document.body) {
                        return null; // window level scroll
                    }
                    
                    // 1. data-* attribute
                    if (el.getAttribute('data-test-id')) return 'data-test-id=' + el.getAttribute('data-test-id');
                    if (el.getAttribute('data-id')) return 'data-id=' + el.getAttribute('data-id');
                    if (el.getAttribute('data-testid')) return 'data-testid=' + el.getAttribute('data-testid');
                    
                    // 2. id
                    if (el.id) return 'id=' + el.id;
                    
                    // 3. accessibility attributes
                    if (el.getAttribute('aria-label')) return 'aria-label=' + el.getAttribute('aria-label');
                    if (el.getAttribute('role')) return 'role=' + el.getAttribute('role');
                    
                    // 4. stable DOM path across Shadow boundaries
                    let path = '';
                    let current = el;
                    while (current && current !== document.body && current !== document.documentElement) {
                        if (current.nodeType === 11 && current.host) {
                            current = current.host;
                        }
                        if (current.parentNode && current.parentNode.children) {
                            let tag = current.tagName.toLowerCase();
                            let index = Array.from(current.parentNode.children).indexOf(current) + 1;
                            path = '/' + tag + '[' + index + ']' + path;
                        }
                        current = current.parentNode || (current.getRootNode && current.getRootNode().host);
                    }
                    return path;
                }

                function getSource(e) {
                    if (e.isTrusted === false) return 'PROGRAMMATIC_SCROLL';
                    if (e.target === document || e.target === window) return 'WINDOW_SCROLL';
                    return 'ELEMENT_SCROLL';
                }

                function handleScrollEvent(e, isEnd = false) {
                    const now = performance.now();
                    const dt = now - lastTime;
                    
                    const currentPageX = window.pageXOffset || document.documentElement.scrollLeft;
                    const currentPageY = window.pageYOffset || document.documentElement.scrollTop;
                    
                    let dx = 0;
                    let dy = 0;
                    
                    let source = getSource(e);
                    let containerId = null;
                    let containerX = 0;
                    let containerY = 0;

                    if (source === 'ELEMENT_SCROLL' && e.target instanceof Element) {
                        containerId = identifyContainer(e.target);
                        containerX = e.target.scrollLeft;
                        containerY = e.target.scrollTop;
                        
                        let lastState = elementScrollStates.get(e.target) || { x: containerX, y: containerY };
                        dx = containerX - lastState.x;
                        dy = containerY - lastState.y;
                        
                        elementScrollStates.set(e.target, { x: containerX, y: containerY });
                    } else {
                        dx = currentPageX - lastPageX;
                        dy = currentPageY - lastPageY;
                        
                        lastPageX = currentPageX;
                        lastPageY = currentPageY;
                    }
                    lastTime = now;

                    let velocity = 0;
                    if (dt > 0) {
                        velocity = Math.sqrt(dx*dx + dy*dy) / dt;
                    }

                    // Force velocity to 0 if it's explicitly a scrollend event
                    if (isEnd) {
                        velocity = 0;
                    }

                    // V4 Spatial Scroll logic
                    let rhoX = 0, rhoY = 0, limitX = 0, limitY = 0, spatialHash = null;
                    if (${v4SpatialScroll}) {
                        const target = (source === 'ELEMENT_SCROLL' && e.target instanceof Element) ? e.target : document.documentElement;
                        limitX = Math.max(0, target.scrollWidth - target.clientWidth);
                        limitY = Math.max(0, target.scrollHeight - target.clientHeight);
                        
                        const sx = source === 'ELEMENT_SCROLL' ? containerX : currentPageX;
                        const sy = source === 'ELEMENT_SCROLL' ? containerY : currentPageY;

                        rhoX = limitX > 0 ? (sx / limitX) : 0;
                        rhoY = limitY > 0 ? (sy / limitY) : 0;

                        // Semantic Scroll Anchoring (Item 11)
                        let anchorHash = null;
                        let anchorOffset = 0;
                        try {
                            const rect = target.getBoundingClientRect();
                            const topY = rect.top + 10;
                            const centerX = rect.left + (rect.width / 2);
                            
                            // Find the element at the top center of the container
                            const elements = document.elementsFromPoint(centerX, topY);
                            // Get the first element that is a descendant of the target container
                            const anchorEl = elements.find(el => el !== target && target.contains(el));
                            
                            if (anchorEl) {
                                anchorHash = identifyContainer(anchorEl);
                                anchorOffset = topY - anchorEl.getBoundingClientRect().top;
                            }
                        } catch (e) {}

                        // FNV-1a hash of topological path
                        if (source === 'ELEMENT_SCROLL' && containerId) {
                            let hash = 2166136261;
                            for (let i = 0; i < containerId.length; i++) {
                                hash ^= containerId.charCodeAt(i);
                                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                            }
                            spatialHash = (hash >>> 0).toString(16);
                        } else {
                            spatialHash = 'window';
                        }
                    }

                    const payload = {
                        browserId: '${this.browserId}',
                        timestamp: Date.now(),
                        source: source,
                        pageScrollX: currentPageX,
                        pageScrollY: currentPageY,
                        activeContainerId: containerId,
                        containerScrollX: containerX,
                        containerScrollY: containerY,
                        direction: dy > 0 ? 'down' : (dy < 0 ? 'up' : (dx > 0 ? 'right' : (dx < 0 ? 'left' : 'none'))),
                        velocity: velocity,
                        isScrollEnd: isEnd,
                        rhoX: rhoX,
                        rhoY: rhoY,
                        anchorHash: anchorHash,
                        anchorOffset: anchorOffset,
                        viewportLimitX: limitX,
                        viewportLimitY: limitY,
                        spatialHash: spatialHash
                    };

                    const key = payload.activeContainerId || 'window';
                    window.__pendingScrolls.set(key, payload);
                    
                    const flush = () => {
                        if (window.__fallbackTimerId) {
                            clearTimeout(window.__fallbackTimerId);
                            window.__fallbackTimerId = null;
                        }
                        if (window.__rafId) {
                            cancelAnimationFrame(window.__rafId);
                            window.__rafId = null;
                        }
                        for (const p of window.__pendingScrolls.values()) {
                            if (window.dispatchProviderScrollEvent) {
                                window.dispatchProviderScrollEvent(p);
                            }
                        }
                        window.__pendingScrolls.clear();
                    };

                    if (!window.__rafId && !window.__fallbackTimerId) {
                        window.__rafId = requestAnimationFrame(flush);
                        window.__fallbackTimerId = setTimeout(flush, 16);
                    }
                }

                window.addEventListener('scroll', (e) => handleScrollEvent(e, false), { capture: true, passive: true });
                window.addEventListener('wheel', (e) => handleScrollEvent(e, false), { capture: true, passive: true });
                if ('onscrollend' in window) {
                    window.addEventListener('scrollend', (e) => handleScrollEvent(e, true), { capture: true, passive: true });
                }
            })();
        `;
        
        await this.page.addInitScript(scriptContent);
        await this.page.evaluate(scriptContent).catch(err => logger.warn('Failed to immediately evaluate ScrollTracker script: ' + err.message));
    }

    on(event, callback) {
        if (event === 'ScrollEvent') {
            this.onScrollEvent = callback;
        }
    }

    off(event, callback) {
        if (event === 'ScrollEvent') {
            this.onScrollEvent = null;
        }
    }
}
