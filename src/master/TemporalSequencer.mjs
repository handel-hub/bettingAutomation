import { EventEmitter } from 'node:events';
import { HybridLogicalClock } from '../common/models/HybridLogicalClock.mjs';
import { LateArrivalError } from '../common/errors/ProtocolErrors.mjs';
import { logger } from '../config.mjs';
import { TelemetryCollector } from '../browser/execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';

/**
 * Min-Heap for Temporal Buffer. 
 * Sorts by HLC: physical ASC, logical ASC, framePath depth ASC (tie-breaker)
 */
class EventMinHeap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this.heapifyUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        const root = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.heapifyDown(0);
        return root;
    }

    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    size() {
        return this.heap.length;
    }

    compare(a, b) {
        const cmp = HybridLogicalClock.compare(a.hlc, b.hlc);
        if (cmp !== 0) return cmp;
        // Tie-breaker: frame depth. Shorter path goes first (top-level frame before iframes)
        const depthA = (a.framePath.match(/\./g) || []).length;
        const depthB = (b.framePath.match(/\./g) || []).length;
        return depthA - depthB;
    }

    heapifyUp(index) {
        let currentIndex = index;
        while (currentIndex > 0) {
            let parentIndex = Math.floor((currentIndex - 1) / 2);
            if (this.compare(this.heap[currentIndex], this.heap[parentIndex]) < 0) {
                this.swap(currentIndex, parentIndex);
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    heapifyDown(index) {
        let currentIndex = index;
        while (true) {
            let leftChild = 2 * currentIndex + 1;
            let rightChild = 2 * currentIndex + 2;
            let smallest = currentIndex;

            if (leftChild < this.heap.length && this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
                smallest = leftChild;
            }
            if (rightChild < this.heap.length && this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
                smallest = rightChild;
            }
            if (smallest !== currentIndex) {
                this.swap(currentIndex, smallest);
                currentIndex = smallest;
            } else {
                break;
            }
        }
    }

    swap(i, j) {
        let temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}

export class TemporalSequencer extends EventEmitter {
    constructor(deltaMs = 50) {
        super();
        this.deltaMs = deltaMs;
        this.buffer = new EventMinHeap();
        this.lastFlushedHLC = null;
        this.currentGES = 0;
        this.interval = null;
        this.running = false;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.interval = setInterval(() => this._flush(), this.deltaMs);
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.interval);
        this._flush(true); // Force flush everything remaining
    }

    /**
     * Receives an event from V8 Capture Layer via CDP IPC
     * @param {Object} event 
     * @param {string} event.interactionId
     * @param {string} event.framePath
     * @param {string} event.type
     * @param {Object} event.payload
     * @param {HybridLogicalClock} event.hlc
     */
    receive(event) {
        if (!event.hlc || typeof event.hlc.physical !== 'number') {
            logger.warn(`TemporalSequencer received event without valid HLC: ${event.interactionId}`);
            return;
        }

        const hlc = event.hlc instanceof HybridLogicalClock ? event.hlc : HybridLogicalClock.fromJSON(event.hlc);
        event.hlc = hlc;

        // Strict Late-Arrival Abort to guarantee invariant (Causal Consistency)
        if (this.lastFlushedHLC && HybridLogicalClock.compare(hlc, this.lastFlushedHLC) < 0) {
            const error = new LateArrivalError(event, this.lastFlushedHLC);
            logger.error(error.message);
            TelemetryCollector.recordLifecycleEvent({
                traceId: event.payload?.traceId || 'tr-unknown',
                spanId: 'sp-error',
                parentSpanId: null,
                stageSequence: 999,
                stageName: 'LATE_ARRIVAL_ABORT',
                component: 'TemporalSequencer.mjs',
                method: 'receive',
                timestamp: Date.now(),
                interactionId: event.interactionId,
                errorDetails: { errorCode: error.code, errorMessage: error.message }
            });
            this.emit('error', error);
            // Protocol dictates we must throw/abort rather than corrupting sequence
            throw error; 
        }

        this.buffer.push(event);
    }

    _flush(force = false) {
        const now = performance.timeOrigin + performance.now();
        const cutoff = force ? Infinity : now - this.deltaMs;

        while (true) {
            const minEvent = this.buffer.peek();
            if (!minEvent) break;

            if (minEvent.hlc.physical <= cutoff) {
                const event = this.buffer.pop();
                this.currentGES++;
                
                this.lastFlushedHLC = event.hlc;
                
                this.emit('sequenced', {
                    ges: this.currentGES,
                    event: event
                });
            } else {
                break; // Earliest event is newer than cutoff, stop flushing
            }
        }
    }
}
