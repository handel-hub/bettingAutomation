import { Capabilities } from '../capabilities.mjs';

export class CapabilityDependencyGraph {
    static get DOWNWARD_DEPENDENCIES() {
        return {
            [Capabilities.NAVIGATION_READY]: [
                Capabilities.DOM_READY,
                Capabilities.VIEWPORT_READY,
                Capabilities.SCROLL_READY,
                Capabilities.FRAME_READY
            ],
            [Capabilities.DOM_READY]: [
                Capabilities.VIEWPORT_READY,
                Capabilities.SCROLL_READY,
                Capabilities.FRAME_READY
            ],
            [Capabilities.VIEWPORT_READY]: [
                Capabilities.SCROLL_READY,
                Capabilities.FRAME_READY
            ],
            [Capabilities.SCROLL_READY]: [
                Capabilities.FRAME_READY
            ],
            [Capabilities.FRAME_READY]: []
        };
    }

    static get UPWARD_DEPENDENCIES() {
        return {
            [Capabilities.FRAME_READY]: Capabilities.SCROLL_READY,
            [Capabilities.SCROLL_READY]: Capabilities.VIEWPORT_READY,
            [Capabilities.VIEWPORT_READY]: Capabilities.DOM_READY,
            [Capabilities.DOM_READY]: Capabilities.NAVIGATION_READY,
            [Capabilities.NAVIGATION_READY]: null
        };
    }

    static getDependentCapabilities(capability) {
        return this.DOWNWARD_DEPENDENCIES[capability] || [];
    }

    static getRootCausePath(capability) {
        const path = [];
        let current = capability;
        while (current) {
            path.push(current);
            current = this.UPWARD_DEPENDENCIES[current];
        }
        return path;
    }
}
