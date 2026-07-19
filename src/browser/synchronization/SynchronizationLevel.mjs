import { Capabilities } from './capabilities.mjs';

/**
 * Mappings of external synchronization levels to their required capabilities.
 */
export const SynchronizationLevel = {
    LEVEL_0: [], // Disconnected
    LEVEL_1: [Capabilities.CONNECTED],
    LEVEL_2: [Capabilities.CONNECTED, Capabilities.NAVIGATION_READY],
    LEVEL_3: [Capabilities.CONNECTED, Capabilities.NAVIGATION_READY, Capabilities.DOM_READY],
    LEVEL_4: [
        Capabilities.CONNECTED, 
        Capabilities.NAVIGATION_READY, 
        Capabilities.DOM_READY, 
        Capabilities.VIEWPORT_READY, 
        Capabilities.SCROLL_READY,
        Capabilities.FRAME_READY
    ],
    LEVEL_5: [
        Capabilities.CONNECTED, 
        Capabilities.NAVIGATION_READY, 
        Capabilities.DOM_READY, 
        Capabilities.VIEWPORT_READY, 
        Capabilities.SCROLL_READY,
        Capabilities.FRAME_READY,
        Capabilities.SESSION_READY
    ]
};
