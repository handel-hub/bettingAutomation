export class SynchronizationTimeline {
    constructor() {
        this.events = [];
    }

    record(event) {
        this.events.push({ ...event, timestamp: Date.now() });
    }

    getTimeline() {
        return [...this.events];
    }
}
