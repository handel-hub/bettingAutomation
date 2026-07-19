export const NavigationEventType = {
    FRAME_NAVIGATED: 'FRAME_NAVIGATED',
    LOAD: 'LOAD',
    DOM_CONTENT_LOADED: 'DOM_CONTENT_LOADED',
    HISTORY_API: 'HISTORY_API',
    URL_CHANGED: 'URL_CHANGED'
};

export class NavigationEvent {
    constructor({ type, browserId, url, navigationId, timestamp = Date.now(), metadata = {} }) {
        this.type = type;
        this.browserId = browserId;
        this.url = url;
        this.navigationId = navigationId;
        this.timestamp = timestamp;
        this.metadata = metadata;
    }
}
