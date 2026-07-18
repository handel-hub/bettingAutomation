export class RollingWindow {
    constructor(size = 128) {
        this.size = size;
        this.buffer = new Float64Array(size);
        this.head = 0;
        this.count = 0;
        this.sum = 0;
    }

    push(value) {
        if (typeof value !== 'number' || isNaN(value)) return;

        if (this.count === this.size) {
            // Subtract the oldest value from the sum
            this.sum -= this.buffer[this.head];
        } else {
            this.count++;
        }

        this.buffer[this.head] = value;
        this.sum += value;
        
        this.head = (this.head + 1) % this.size;
    }

    get average() {
        return this.count === 0 ? 0 : this.sum / this.count;
    }

    get currentCount() {
        return this.count;
    }

    snapshot() {
        return {
            average: this.average,
            count: this.count
        };
    }

    reset() {
        this.buffer.fill(0);
        this.head = 0;
        this.count = 0;
        this.sum = 0;
    }
}
