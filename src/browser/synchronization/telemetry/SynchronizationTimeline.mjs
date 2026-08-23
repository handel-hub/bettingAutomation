export class SynchronizationTimeline {
    constructor(capacity = 5000) {
        this.capacity = capacity;
        this.events = new Array(capacity);
        this.head = 0;
        this.tail = 0;
        this.isFull = false;
        this.frozen = false;
    }

    record(event) {
        if (this.frozen) return;
        
        this.events[this.head] = { ...event, timestamp: Date.now() };
        
        this.head = (this.head + 1) % this.capacity;
        if (this.isFull) {
            this.tail = this.head;
        } else if (this.head === 0) {
            this.isFull = true;
        }
    }

    freeze() {
        this.frozen = true;
    }

    getTimeline() {
        const result = [];
        if (!this.isFull && this.head === 0) return result;
        
        const count = this.isFull ? this.capacity : this.head;
        for (let i = 0; i < count; i++) {
            const index = (this.tail + i) % this.capacity;
            result.push(this.events[index]);
        }
        return result;
    }
}
