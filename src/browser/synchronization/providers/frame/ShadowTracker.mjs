import { ShadowEvent } from './ShadowEvent.mjs';

export class ShadowTracker {
    constructor(browserId) {
        this.browserId = browserId;
        this.page = null;
        this.stateMachine = null;
    }

    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }

    async initialize(page) {
        this.page = page;
        
        await this.page.exposeBinding('dispatchShadowEvent', ({ frame }, eventData) => {
            if (!this.stateMachine) return;
            eventData.payload.frameUrl = frame.url();
            eventData.payload.frameName = frame.name();
            this.stateMachine.handleEvent(new ShadowEvent(eventData.type, eventData.payload));
        });

        const shadowScript = `
            (() => {
                if (window.__shadowTrackerInjected) return;
                window.__shadowTrackerInjected = true;

                const emitShadow = (el, mode) => {
                    try {
                        const hostTag = el.tagName.toLowerCase();
                        const hostId = el.id || '';
                        const hostClass = typeof el.className === 'string' ? el.className : '';
                        
                        const locator = { tag: hostTag, id: hostId, class: hostClass };

                        if (window.dispatchShadowEvent) {
                            window.dispatchShadowEvent({
                                type: 'ShadowAttached',
                                payload: { hostLocator: locator, mode: mode }
                            });
                        }
                    } catch (e) {
                        console.error('ShadowTracker error:', e);
                    }
                };

                const originalAttachShadow = Element.prototype.attachShadow;
                Element.prototype.attachShadow = function(init) {
                    const shadowRoot = originalAttachShadow.call(this, init);
                    emitShadow(this, init.mode);
                    return shadowRoot;
                };
                
                const processNode = (node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.shadowRoot) {
                            emitShadow(node, node.shadowRoot.mode || 'open');
                        }
                        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
                        let child;
                        while ((child = walker.nextNode())) {
                            if (child.shadowRoot) {
                                emitShadow(child, child.shadowRoot.mode || 'open');
                            }
                        }
                    }
                };

                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            processNode(node);
                        }
                    }
                });
                
                observer.observe(document, { childList: true, subtree: true });
            })();
        `;
        
        await this.page.addInitScript(shadowScript);
        
        try {
            await this.page.evaluate(shadowScript);
        } catch(e) {}
    }

    async attach(page) {
        this.page = page;
        // Script already injected via addInitScript
    }

    async detach() {
        this.page = null;
    }
}
