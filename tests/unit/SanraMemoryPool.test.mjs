import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    SanraMemoryPool,
    CONTROL_HEADER_SIZE,
    METRICS_POOL_SIZE
} from '../../src/browser/synchronization/pool/SanraMemoryPool.mjs';
import {
    SanraKineticVectorSerializer,
    KINETIC_VECTOR_SIZE,
    ActionType
} from '../../src/browser/synchronization/models/SanraWireProtocol.mjs';

describe('Stage 1 — SANRA Zero-Allocation SharedArrayBuffer Memory Pool', () => {
    it('initializes buffer with correct slot sizing and control header', () => {
        const pool = new SanraMemoryPool({ vectorSlots: 100, keyframeSlots: 50 });
        const expectedSize = CONTROL_HEADER_SIZE + (100 * 64) + (50 * 48) + METRICS_POOL_SIZE;
        expect(pool.totalBufferSize).toBe(expectedSize);
        expect(pool.buffer.byteLength).toBe(expectedSize);
        expect(pool.getAvailableVectorCount()).toBe(0);
        expect(pool.getAvailableKeyframeCount()).toBe(0);
    });

    it('performs atomic ring buffer wrap-around for vectors without heap allocation', () => {
        const pool = new SanraMemoryPool({ vectorSlots: 10, keyframeSlots: 5 });

        // Fill 5 vectors
        for (let i = 0; i < 5; i++) {
            const offset = pool.acquireVectorWriteOffset();
            SanraKineticVectorSerializer.serialize({ sequenceId: i + 1, rhoY: i * 0.1 }, pool.buffer, offset);
        }

        expect(pool.getAvailableVectorCount()).toBe(5);

        // Read 3 vectors
        for (let i = 0; i < 3; i++) {
            const offset = pool.acquireVectorReadOffset();
            expect(offset).not.toBeNull();
            const vec = SanraKineticVectorSerializer.deserialize(pool.buffer, offset);
            expect(vec.sequenceId).toBe(i + 1);
        }

        expect(pool.getAvailableVectorCount()).toBe(2);

        // Fill 8 more vectors to cause wrap-around across slot boundary 10
        for (let i = 5; i < 13; i++) {
            const offset = pool.acquireVectorWriteOffset();
            SanraKineticVectorSerializer.serialize({ sequenceId: i + 1, rhoY: 0.5 }, pool.buffer, offset);
        }

        // Now we should have 10 available vectors (max capacity of ring buffer)
        expect(pool.getAvailableVectorCount()).toBe(10);
    });

    it('emits VAL-002 on ring buffer overflow when tail is overwritten', () => {
        const telemetrySink = { emitEvent: vi.fn() };
        const pool = new SanraMemoryPool({ vectorSlots: 4, keyframeSlots: 2, telemetrySink });

        // Write 6 vectors into a 4-slot pool without reading
        for (let i = 0; i < 6; i++) {
            pool.acquireVectorWriteOffset();
        }

        expect(pool.getMetricsSnapshot().droppedVectors).toBe(2);
        // Telemetry emitted on overflow at head % 100 === 0 or first overflow (head=4 is 0%100? no, only when head%100 === 0 in our throttle, let's check)
        // In our code we check (head % 100) === 0. Let's test reaching 100 writes!
        for (let i = 6; i < 101; i++) {
            pool.acquireVectorWriteOffset();
        }
        expect(telemetrySink.emitEvent).toHaveBeenCalledWith('VectorRingBufferOverflow', expect.objectContaining({
            errorCode: 'VAL-002',
            severity: 'WARN',
            subsystem: 'VAL'
        }));
    });

    it('handles MIG-003 fallback to standard ArrayBuffer when SharedArrayBuffer is unavailable', () => {
        const telemetrySink = { emitEvent: vi.fn() };
        
        // Temporarily hide SharedArrayBuffer
        const originalSab = globalThis.SharedArrayBuffer;
        delete globalThis.SharedArrayBuffer;

        try {
            const pool = new SanraMemoryPool({ vectorSlots: 10, keyframeSlots: 5, telemetrySink });
            expect(pool.isShared).toBe(false);
            expect(pool.buffer).toBeInstanceOf(ArrayBuffer);

            // Ring buffer operations must continue working seamlessly!
            const offset = pool.acquireVectorWriteOffset();
            SanraKineticVectorSerializer.serialize({ sequenceId: 777, rhoX: 0.5 }, pool.buffer, offset);
            const readOffset = pool.acquireVectorReadOffset();
            const result = SanraKineticVectorSerializer.deserialize(pool.buffer, readOffset);
            expect(result.sequenceId).toBe(777);

            expect(telemetrySink.emitEvent).toHaveBeenCalledWith('SharedMemoryPoolAllocationFailed', expect.objectContaining({
                errorCode: 'MIG-003',
                severity: 'WARN',
                subsystem: 'MIG',
                payload: expect.objectContaining({
                    fallback: 'ArrayBuffer'
                }),
                recoveryStatus: 'FALLBACK_ACTIVE'
            }));
        } finally {
            globalThis.SharedArrayBuffer = originalSab;
        }
    });

    it('records and harvests zero-allocation metrics in SanraMetricsPool', () => {
        const telemetrySink = { emitEvent: vi.fn() };
        const pool = new SanraMemoryPool({ vectorSlots: 10, keyframeSlots: 5, telemetrySink });

        pool.recordMetric(0, 14.5); // InputToCaptureLatencyUs
        pool.recordMetric(1, 4.2);  // SplineEvaluationLatencyUs
        pool.recordMetric(2, 8.1);  // RafCommitLatencyUs
        pool.recordMetric(3, 0.0);  // HeapAllocationRateBytesSec (0 bytes/sec!)
        pool.incrementMetric(4, 50); // TotalVectorsProcessed
        pool.incrementMetric(6, 1);  // TotalErrorsEncountered

        const snapshot = pool.getMetricsSnapshot();
        expect(snapshot.inputToCaptureLatencyUs).toBeCloseTo(14.5, 2);
        expect(snapshot.splineEvaluationLatencyUs).toBeCloseTo(4.2, 2);
        expect(snapshot.rafCommitLatencyUs).toBeCloseTo(8.1, 2);
        expect(snapshot.heapAllocationRateBytesSec).toBe(0.0);
        expect(snapshot.totalVectorsProcessed).toBe(50);
        expect(snapshot.totalErrorsEncountered).toBe(1);

        pool.emitPoolStats();
        expect(telemetrySink.emitEvent).toHaveBeenCalledWith('SharedMemoryPoolStat', expect.objectContaining({
            eventName: 'SharedMemoryPoolStat',
            subsystem: 'SYNC',
            payload: expect.objectContaining({
                vectorSlotsUsed: 0,
                vectorSlotsCapacity: 10,
                metricsSnapshot: expect.objectContaining({
                    totalVectorsProcessed: 50,
                    heapAllocationRateBytesSec: 0.0
                })
            })
        }));
    });
});
