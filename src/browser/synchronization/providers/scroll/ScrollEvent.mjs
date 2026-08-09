/**
 * A normalized event payload originating from the browser's ScrollTracker.
 */
export class ScrollEvent {
    constructor(data = {}) {
        this.browserId = data.browserId;
        this.timestamp = data.timestamp || Date.now();

        // One of: WINDOW_SCROLL, ELEMENT_SCROLL, PROGRAMMATIC_SCROLL, AUTO_SCROLL
        this.source = data.source || 'UNKNOWN';

        // Page level scroll
        this.pageScrollX = data.pageScrollX || 0;
        this.pageScrollY = data.pageScrollY || 0;

        // Container level scroll (if source is ELEMENT_SCROLL)
        this.activeContainerId = data.activeContainerId || null;
        this.containerScrollX = data.containerScrollX || 0;
        this.containerScrollY = data.containerScrollY || 0;

        // Kinematics
        this.direction = data.direction || 'none';
        this.velocity = data.velocity || 0;

        // true if the event was an explicit "scrollend" event
        this.isScrollEnd = data.isScrollEnd || false;

        // V4 Spatial Extensions
        this.rhoX = data.rhoX || 0;
        this.rhoY = data.rhoY || 0;
        this.viewportLimitX = data.viewportLimitX || 0;
        this.viewportLimitY = data.viewportLimitY || 0;
        this.spatialHash = data.spatialHash || null;
    }
}
