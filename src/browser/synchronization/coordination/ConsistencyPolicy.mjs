import { Capabilities } from '../capabilities.mjs';

export class ConsistencyPolicy {
    static get DEFAULT() {
        return {
            weights: {
                [Capabilities.NAVIGATION_READY]: 30,
                [Capabilities.DOM_READY]: 25,
                [Capabilities.VIEWPORT_READY]: 20,
                [Capabilities.SCROLL_READY]: 15,
                [Capabilities.FRAME_READY]: 10
            },
            thresholds: {
                warning: 80,
                critical: 50
            }
        };
    }

    static get STRICT() {
        return {
            weights: {
                [Capabilities.NAVIGATION_READY]: 20,
                [Capabilities.DOM_READY]: 20,
                [Capabilities.VIEWPORT_READY]: 20,
                [Capabilities.SCROLL_READY]: 20,
                [Capabilities.FRAME_READY]: 20
            },
            thresholds: {
                warning: 95,
                critical: 80
            }
        };
    }
}
