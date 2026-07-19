import { ViewportEvent, ViewportEventType } from './ViewportEvent.mjs';
import { logger } from '../../../../config.mjs';

/**
 * Responsible for observing Viewport changes via Playwright events
 * and injecting scripts to monitor resize, DPR, orientation, and visualViewport.
 */
export class ViewportTracker {
    constructor(browserId) {
        this.browserId = browserId;
        this.page = null;
        this.stateMachine = null;
    }

    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }

    async attach(page) {
        this.page = page;

        try {
            // Expose a binding for the injected script to report viewport changes.
            await this.page.exposeFunction('reportViewportChange', (eventPayload) => {
                const event = new ViewportEvent({
                    type: eventPayload.type,
                    browserId: this.browserId,
                    data: eventPayload.data,
                    timestamp: eventPayload.timestamp
                });

                if (this.stateMachine) {
                    this.stateMachine.processEvent(event);
                }
            });

            // Inject the observer script into the page.
            await this.page.addInitScript(() => {
                const sendViewportUpdate = (eventType) => {
                    if (window.reportViewportChange) {
                        window.reportViewportChange({
                            type: eventType,
                            timestamp: Date.now(),
                            data: {
                                windowContext: {
                                    outerWidth: window.outerWidth,
                                    outerHeight: window.outerHeight,
                                    screenX: window.screenX,
                                    screenY: window.screenY,
                                    maximized: window.outerWidth >= window.screen.availWidth && window.outerHeight >= window.screen.availHeight,
                                    minimized: window.outerWidth <= 0 || window.outerHeight <= 0,
                                    fullscreen: document.fullscreenElement !== null
                                },
                                viewportContext: {
                                    dpr: window.devicePixelRatio,
                                    orientation: window.screen?.orientation?.type || 'unknown',
                                    layoutViewportWidth: window.innerWidth,
                                    layoutViewportHeight: window.innerHeight,
                                    visualViewportOffsetX: window.visualViewport?.offsetLeft || 0,
                                    visualViewportOffsetY: window.visualViewport?.pageTop || 0,
                                    visualViewportScale: window.visualViewport?.scale || 1,
                                    visualViewportWidth: window.visualViewport?.width || window.innerWidth,
                                    visualViewportHeight: window.visualViewport?.height || window.innerHeight
                                }
                            }
                        });
                    }
                };

                // Track Resize
                window.addEventListener('resize', () => sendViewportUpdate('RESIZE'));
                
                // Track Orientation
                window.addEventListener('orientationchange', () => sendViewportUpdate('ORIENTATION_CHANGE'));

                // Track Visual Viewport
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', () => sendViewportUpdate('VISUAL_VIEWPORT_RESIZE'));
                    window.visualViewport.addEventListener('scroll', () => sendViewportUpdate('VISUAL_VIEWPORT_RESIZE'));
                }

                // Initial Measure
                setTimeout(() => sendViewportUpdate('INITIAL_MEASURE'), 0);
            });

            // Initial manual evaluation in case addInitScript missed the current document load.
            await this.page.evaluate(() => {
                if (window.reportViewportChange && window.innerWidth > 0) {
                    // Trigger an initial measure manually if possible.
                    // We dispatch a custom event to our own script if we wanted, but since it's global,
                    // we can just wait for the timeout above.
                }
            }).catch(() => {});

        } catch (error) {
            logger.warn(`[ViewportTracker:${this.browserId}] Failed to attach: ${error.message}`);
        }
    }
}
