export const ViewportEventType = {
    RESIZE: 'RESIZE',
    ORIENTATION_CHANGE: 'ORIENTATION_CHANGE',
    DPR_CHANGE: 'DPR_CHANGE',
    VISUAL_VIEWPORT_RESIZE: 'VISUAL_VIEWPORT_RESIZE',
    INITIAL_MEASURE: 'INITIAL_MEASURE'
};

/**
 * Normalized event representing a change in the viewport or window.
 */
export class ViewportEvent {
    constructor({ type, browserId, data, timestamp }) {
        this.type = type;
        this.browserId = browserId;
        this.data = data;
        this.timestamp = timestamp ?? Date.now();
    }
}
