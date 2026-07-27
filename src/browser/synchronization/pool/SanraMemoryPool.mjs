/**
 * @file SanraMemoryPool.mjs
 * @description Zero-allocation SharedArrayBuffer ring buffer memory pool and telemetry metrics pool
 * for Viewport and Scroll Synchronization vNext (SANRA Architecture Stage 1).
 * 
 * Implements:
 * - Lock-free atomic ring buffer for SanraKineticVector (64 bytes) and SanraMilestoneKeyframe (48 bytes)
 * - SanraMetricsPool (256-byte linear memory pool for 0 bytes/sec heap allocation during streaming)
 * - Invariant: INV-MEM-ZERO-ALLOC
 * - Migration Hook: MIG-003 (Fallback from SharedArrayBuffer to ArrayBuffer if cross-origin isolation restricted)
 */

import { KINETIC_VECTOR_SIZE, MILESTONE_KEYFRAME_SIZE, VECTOR_ALIGNMENT } from '../models/SanraWireProtocol.mjs';

export const CONTROL_HEADER_SIZE = 64;
export const METRICS_POOL_SIZE = 256;

export const DefaultPoolConfig = {
    vectorSlots: 1024,
    keyframeSlots: 256
};

export class SanraMemoryPool {
    /**
     * @param {Object} [config={}]
     * @param {number} [config.vectorSlots=1024]
     * @param {number} [config.keyframeSlots=256]
     * @param {Object} [config.telemetrySink=null]
     */
    constructor(config = {}) {
        this.vectorSlots = config.vectorSlots ?? DefaultPoolConfig.vectorSlots;
        this.keyframeSlots = config.keyframeSlots ?? DefaultPoolConfig.keyframeSlots;
        this.telemetrySink = config.telemetrySink ?? null;

        this.vectorAreaSize = this.vectorSlots * KINETIC_VECTOR_SIZE;
        this.keyframeAreaSize = this.keyframeSlots * MILESTONE_KEYFRAME_SIZE;
        this.totalBufferSize = CONTROL_HEADER_SIZE + this.vectorAreaSize + this.keyframeAreaSize + METRICS_POOL_SIZE;

        this.vectorStartOffset = CONTROL_HEADER_SIZE;
        this.keyframeStartOffset = this.vectorStartOffset + this.vectorAreaSize;
        this.metricsStartOffset = this.keyframeStartOffset + this.keyframeAreaSize;

        this.isShared = true;
        this.buffer = null;
        this.controlView = null;
        this.metricsView = null;

        this._initBuffer();
        this._initViews();
    }

    _initBuffer() {
        try {
            if (typeof SharedArrayBuffer !== 'undefined') {
                this.buffer = new SharedArrayBuffer(this.totalBufferSize);
                this.isShared = true;
            } else {
                throw new Error('SharedArrayBuffer is not defined in this runtime environment.');
            }
        } catch (err) {
            // Enforce MIG-003: Fallback to standard ArrayBuffer if SharedArrayBuffer allocation fails
            this.isShared = false;
            this.buffer = new ArrayBuffer(this.totalBufferSize);

            if (this.telemetrySink && typeof this.telemetrySink.emitEvent === 'function') {
                this.telemetrySink.emitEvent('SharedMemoryPoolAllocationFailed', {
                    errorCode: 'MIG-003',
                    severity: 'WARN',
                    subsystem: 'MIG',
                    pipelineStage: 'POOL_INIT',
                    payload: {
                        reason: err.message,
                        fallback: 'ArrayBuffer',
                        totalBufferSize: this.totalBufferSize
                    },
                    recoveryStatus: 'FALLBACK_ACTIVE'
                });
            }
        }
    }

    _initViews() {
        // Int32Array view over the 64-byte control header for Atomics (16 Int32 slots)
        this.controlView = new Int32Array(this.buffer, 0, 16);
        // Float64Array view over the 256-byte metrics pool (32 Float64 slots)
        this.metricsView = new Float64Array(this.buffer, this.metricsStartOffset, 32);
        
        // Zero out control header and metrics
        this.controlView.fill(0);
        this.metricsView.fill(0);

        // Pre-allocate reusable scratch views for zero-allocation deserialization (INV-MEM-ZERO-ALLOC)
        this._reusableVectorObj = {};
        this._reusableKeyframeObj = {};
    }

    /**
     * Helper for lock-free atomic loading (or fallback standard loading if ArrayBuffer).
     */
    _loadIndex(slotIndex) {
        if (this.isShared && typeof Atomics !== 'undefined') {
            return Atomics.load(this.controlView, slotIndex);
        }
        return this.controlView[slotIndex];
    }

    /**
     * Helper for lock-free atomic storing.
     */
    _storeIndex(slotIndex, value) {
        if (this.isShared && typeof Atomics !== 'undefined') {
            Atomics.store(this.controlView, slotIndex, value);
        } else {
            this.controlView[slotIndex] = value;
        }
    }

    /**
     * Helper for lock-free atomic addition.
     */
    _addIndex(slotIndex, delta) {
        if (this.isShared && typeof Atomics !== 'undefined') {
            return Atomics.add(this.controlView, slotIndex, delta);
        }
        const oldVal = this.controlView[slotIndex];
        this.controlView[slotIndex] += delta;
        return oldVal;
    }

    // --- Vector Ring Buffer Management ---

    /**
     * Acquires the byte offset in the buffer for writing a new SanraKineticVector.
     * Automatically advances the atomic head pointer. If buffer overflows unread tail, increments dropped count.
     * Enforces zero heap allocation (INV-MEM-ZERO-ALLOC).
     * @returns {number} Byte offset in buffer
     */
    acquireVectorWriteOffset() {
        const head = this._addIndex(0, 1); // Slot 0 is vectorHead
        const tail = this._loadIndex(1);   // Slot 1 is vectorTail

        // Check overflow: if head - tail >= vectorSlots, we overwrite unread items
        if ((head - tail) >= this.vectorSlots) {
            this._addIndex(4, 1); // Slot 4 is droppedVectors
            if (this.telemetrySink && typeof this.telemetrySink.emitEvent === 'function') {
                // Throttle emission to avoid GC spam during high-frequency overflow
                if ((head % 100) === 0) {
                    this.telemetrySink.emitEvent('VectorRingBufferOverflow', {
                        errorCode: 'VAL-002',
                        severity: 'WARN',
                        subsystem: 'VAL',
                        pipelineStage: 'RING_BUFFER_WRITE',
                        payload: { head, tail, droppedCount: this._loadIndex(4) }
                    });
                }
            }
        }

        const slotIndex = (head >>> 0) % this.vectorSlots;
        return this.vectorStartOffset + (slotIndex * KINETIC_VECTOR_SIZE);
    }

    /**
     * Returns the number of available vectors ready for reading in the ring buffer.
     * @returns {number}
     */
    getAvailableVectorCount() {
        const head = this._loadIndex(0);
        const tail = this._loadIndex(1);
        return Math.max(0, head - tail);
    }

    /**
     * Acquires the byte offset for reading the oldest unread vector and advances tail pointer.
     * @returns {number|null} Byte offset in buffer, or null if buffer is empty
     */
    acquireVectorReadOffset() {
        const head = this._loadIndex(0);
        const tail = this._loadIndex(1);
        if (head <= tail) {
            return null; // Empty
        }
        const nextTail = this._addIndex(1, 1);
        const slotIndex = (nextTail >>> 0) % this.vectorSlots;
        return this.vectorStartOffset + (slotIndex * KINETIC_VECTOR_SIZE);
    }

    // --- Keyframe Ring Buffer Management ---

    acquireKeyframeWriteOffset() {
        const head = this._addIndex(2, 1); // Slot 2 is keyframeHead
        const tail = this._loadIndex(3);   // Slot 3 is keyframeTail

        if ((head - tail) >= this.keyframeSlots) {
            this._addIndex(5, 1); // Slot 5 is droppedKeyframes
        }

        const slotIndex = (head >>> 0) % this.keyframeSlots;
        return this.keyframeStartOffset + (slotIndex * MILESTONE_KEYFRAME_SIZE);
    }

    getAvailableKeyframeCount() {
        const head = this._loadIndex(2);
        const tail = this._loadIndex(3);
        return Math.max(0, head - tail);
    }

    acquireKeyframeReadOffset() {
        const head = this._loadIndex(2);
        const tail = this._loadIndex(3);
        if (head <= tail) {
            return null;
        }
        const nextTail = this._addIndex(3, 1);
        const slotIndex = (nextTail >>> 0) % this.keyframeSlots;
        return this.keyframeStartOffset + (slotIndex * MILESTONE_KEYFRAME_SIZE);
    }

    // --- Zero-Allocation Performance Telemetry (SanraMetricsPool) ---
    // Metrics indices in Float64Array (32 slots available):
    // 0: InputToCaptureLatencyUs
    // 1: SplineEvaluationLatencyUs
    // 2: RafCommitLatencyUs
    // 3: HeapAllocationRateBytesSec
    // 4: TotalVectorsProcessed
    // 5: TotalKeyframesProcessed
    // 6: TotalErrorsEncountered

    recordMetric(metricIndex, value) {
        if (metricIndex >= 0 && metricIndex < 32) {
            this.metricsView[metricIndex] = value;
        }
    }

    incrementMetric(metricIndex, delta = 1) {
        if (metricIndex >= 0 && metricIndex < 32) {
            this.metricsView[metricIndex] += delta;
        }
    }

    getMetric(metricIndex) {
        if (metricIndex >= 0 && metricIndex < 32) {
            return this.metricsView[metricIndex];
        }
        return 0;
    }

    getMetricsSnapshot() {
        return {
            inputToCaptureLatencyUs: this.metricsView[0],
            splineEvaluationLatencyUs: this.metricsView[1],
            rafCommitLatencyUs: this.metricsView[2],
            heapAllocationRateBytesSec: this.metricsView[3],
            totalVectorsProcessed: this.metricsView[4],
            totalKeyframesProcessed: this.metricsView[5],
            totalErrorsEncountered: this.metricsView[6],
            droppedVectors: this._loadIndex(4),
            droppedKeyframes: this._loadIndex(5),
            isSharedMemory: this.isShared
        };
    }

    /**
     * Emits SharedMemoryPoolStat telemetry event as specified in Observability Plan Section 3.
     */
    emitPoolStats() {
        if (this.telemetrySink && typeof this.telemetrySink.emitEvent === 'function') {
            this.telemetrySink.emitEvent('SharedMemoryPoolStat', {
                eventName: 'SharedMemoryPoolStat',
                severity: 'INFO',
                subsystem: 'SYNC',
                pipelineStage: 'METRICS_HARVEST',
                payload: {
                    totalBufferSize: this.totalBufferSize,
                    vectorSlotsUsed: this.getAvailableVectorCount(),
                    vectorSlotsCapacity: this.vectorSlots,
                    keyframeSlotsUsed: this.getAvailableKeyframeCount(),
                    keyframeSlotsCapacity: this.keyframeSlots,
                    metricsSnapshot: this.getMetricsSnapshot()
                }
            });
        }
    }
}
