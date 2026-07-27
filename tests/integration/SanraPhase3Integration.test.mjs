import { describe, it, expect, beforeEach } from 'vitest';
import {
    SanraMemoryPool,
    SanraKineticVectorSerializer,
    CoordinateTransformEngine,
    SanraTelemetryCollector
} from '../../src/browser/synchronization/index.mjs';

describe('Stage 3 — Coordinate Transform & Projection Engine Integration Test', () => {
    let pool;
    let telemetry;
    let engine;

    beforeEach(() => {
        telemetry = new SanraTelemetryCollector({ browserId: 'slave-1' });
        pool = new SanraMemoryPool({ vectorSlots: 16, keyframeSlots: 4, telemetrySink: telemetry });
        engine = new CoordinateTransformEngine('slave-1', telemetry);
    });

    it('executes zero-allocation matrix transforms directly on Stage 1 SharedArrayBuffer ring buffer streams', () => {
        const masterViewport = { width: 1920, height: 1080, visualScale: 1.0, visualOffsetX: 0, visualOffsetY: 0 };
        const slaveViewport = { width: 960, height: 540, visualScale: 1.0, visualOffsetX: 0, visualOffsetY: 0 };

        // Write 3 kinetic vector frames into the pool ring buffer
        const off0 = pool.acquireVectorWriteOffset();
        SanraKineticVectorSerializer.serialize({ sequenceId: 1, rhoX: 0.8, rhoY: 0.6 }, pool.buffer, off0);

        const off1 = pool.acquireVectorWriteOffset();
        SanraKineticVectorSerializer.serialize({ sequenceId: 2, rhoX: 0.4, rhoY: 0.2 }, pool.buffer, off1);

        const off2 = pool.acquireVectorWriteOffset();
        SanraKineticVectorSerializer.serialize({ sequenceId: 3, rhoX: 1.0, rhoY: 1.0 }, pool.buffer, off2);

        expect(pool.getAvailableVectorCount()).toBe(3);

        const fwdMatrix = engine.computeMatrix(masterViewport, slaveViewport, 'layout');
        // Suppose targetBounds in normalized coordinates is [0.0, 0.4] (e.g., clipped sub-region)
        const targetBounds = { minX: 0.0, minY: 0.0, maxX: 0.4, maxY: 0.4 };

        // Zero-allocation transform: we transform directly by reading each vector from the ring buffer,
        // transforming its coordinates in place using Float64Array views over the SharedArrayBuffer!
        let totalClipped = 0;
        const f64Buffer = new Float64Array(pool.buffer);

        for (let i = 0; i < 3; i++) {
            const readOff = pool.acquireVectorReadOffset();
            expect(readOff).not.toBeNull();

            // In SanraKineticVectorSerializer, rhoX is at byte offset readOff + 32 (f64 index readOff / 8 + 4)
            // and rhoY is at byte offset readOff + 40 (f64 index readOff / 8 + 5).
            const f64Index = (readOff >>> 3) + 4;

            // Transform the coordinate pair directly in place inside the SharedArrayBuffer!
            const clipped = engine.transformBufferInPlace(f64Buffer, f64Index, 1, fwdMatrix, targetBounds);
            totalClipped += clipped;
        }

        // Vector 1: 0.8 * 0.5 = 0.4, 0.6 * 0.5 = 0.3 -> not clipped
        // Vector 2: 0.4 * 0.5 = 0.2, 0.2 * 0.5 = 0.1 -> not clipped
        // Vector 3: 1.0 * 0.5 = 0.5, 1.0 * 0.5 = 0.5 -> exceeds maxX/maxY (0.4), so it gets clipped!
        expect(totalClipped).toBe(1);

        // Verify telemetry recorded VAL-004 clipping
        const clipEvents = telemetry.getEvents().filter(e => e.eventName === 'CoordinateTransformationClipped');
        expect(clipEvents.length).toBeGreaterThanOrEqual(1);
        expect(clipEvents[0].payload.errorCode).toBe('VAL-004');
    });
});
