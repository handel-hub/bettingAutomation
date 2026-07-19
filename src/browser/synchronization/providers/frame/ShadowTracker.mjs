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

                const originalAttachShadow = Element.prototype.attachShadow;
                Element.prototype.attachShadow = function(init) {
                    const shadowRoot = originalAttachShadow.call(this, init);
                    
                    try {
                        const hostTag = this.tagName.toLowerCase();
                        const hostId = this.id || '';
                        const hostClass = typeof this.className === 'string' ? this.className : '';
                        
                        const locator = {
                            tag: hostTag,
                            id: hostId,
                            class: hostClass
                        };

                        if (window.dispatchShadowEvent) {
                            window.dispatchShadowEvent({
                                type: 'ShadowAttached',
                                payload: {
                                    hostLocator: locator,
                                    mode: init.mode
                                }
                            });
                        }
                    } catch (e) {
                        console.error('ShadowTracker error:', e);
                    }

                    return shadowRoot;
                };
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
