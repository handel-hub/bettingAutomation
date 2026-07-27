import { describe, it, expect, vi } from 'vitest';
import {
    SanraMemoryPool,
    SanraKineticVectorSerializer,
    SanraMilestoneKeyframeSerializer,
    SanraTelemetryCollector,
    W3CTraceContext,
    ActionType,
    VectorFlags,
    SanraSchemaAlignmentError
} from '../../src/browser/synchronization/index.mjs';

describe('Stage 1 — SANRA Wire Protocol & Zero-Copy Memory Pool Integration Test', () => {
    it('simulates end-to-end Master-to-Slave zero-copy kinetic vector streaming with W3C Trace Context', () => {
        const pool = new SanraMemoryPool({ vectorSlots: 1024, keyframeSlots: 256 });
        const masterTelemetry = new SanraTelemetryCollector({ sessionId: 'int-sess-1', browserId: 'master-0' });
        const slaveTelemetry = new SanraTelemetryCollector({ sessionId: 'int-sess-1', browserId: 'slave-1' });
        
        masterTelemetry.attachMemoryPool(pool);
        slaveTelemetry.attachMemoryPool(pool);

        // 1. Master starts capture and creates a trace span
        const masterSpan = masterTelemetry.createChildSpan();
        masterTelemetry.emitEvent('MasterCaptureStarted', {
            subsystem: 'SS',
            pipelineStage: 'CAPTURE',
            payload: { sequenceId: 101, traceparent: masterSpan.traceparent }
        });

        // 2. Master serializes kinetic vector directly into the zero-copy memory pool ring buffer
        const writeOffset = pool.acquireVectorWriteOffset();
        const masterVectorData = {
            timestampMaster: Date.now(),
            sequenceId: 101,
            actionType: ActionType.KINETIC_STREAM,
            flags: VectorFlags.IS_VIEWPORT | VectorFlags.ANCHOR_VALID,
            nodeHash: 0xA1B2C3D4,
            treeDepth: 4,
            ariaRole: 5,
            rectRatioX: 1.0,
            rectRatioY: 1.0,
            rhoX: 0.5,
            rhoY: 0.333333,
            velocityY: 250.0,
            accelerationY: -15.0,
            anchorNodeHash: 0xE5F60718,
            anchorOffsetPx: 10.0
        };

        const bytesWritten = SanraKineticVectorSerializer.serialize(masterVectorData, pool.buffer, writeOffset, masterTelemetry);
        expect(bytesWritten).toBe(64);
        pool.incrementMetric(4, 1); // Increment TotalVectorsProcessed

        // 3. Network Transport Simulation: Master sends traceparent header and buffer offset to Slave
        const transmittedHeader = masterSpan.traceparent;
        expect(transmittedHeader).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

        // 4. Slave receives notification, parses W3C Trace Context, and creates child span
        const parsedContext = W3CTraceContext.parseTraceparent(transmittedHeader);
        expect(parsedContext).not.toBeNull();
        slaveTelemetry.setTraceContext(parsedContext.traceId, parsedContext.spanId);
        const slaveSpan = slaveTelemetry.createChildSpan();

        expect(slaveSpan.traceId).toBe(masterSpan.traceId); // Contiguous trace!
        expect(slaveSpan.parentSpanId).toBe(masterSpan.spanId); // Slave span is child of Master span!

        // 5. Slave acquires read offset and deserializes vector with zero allocation
        expect(pool.getAvailableVectorCount()).toBe(1);
        const readOffset = pool.acquireVectorReadOffset();
        expect(readOffset).toBe(writeOffset); // In our shared memory simulation, offset matches

        const slaveVectorData = {}; // Reusable scratch object
        SanraKineticVectorSerializer.deserialize(pool.buffer, readOffset, slaveVectorData);

        // 6. Verify Slave received exact data with 0 precision loss
        expect(slaveVectorData.sequenceId).toBe(masterVectorData.sequenceId);
        expect(slaveVectorData.nodeHash >>> 0).toBe(masterVectorData.nodeHash >>> 0);
        expect(slaveVectorData.rhoX).toBeCloseTo(0.5, 6);
        expect(slaveVectorData.rhoY).toBeCloseTo(0.333333, 6);
        expect(slaveVectorData.velocityY).toBeCloseTo(250.0, 3);
        expect(slaveVectorData.anchorNodeHash >>> 0).toBe(masterVectorData.anchorNodeHash >>> 0);

        slaveTelemetry.emitEvent('SlaveVectorReplayed', {
            subsystem: 'SS',
            pipelineStage: 'RAF_COMMIT',
            payload: { sequenceId: slaveVectorData.sequenceId, rhoY: slaveVectorData.rhoY }
        });

        // 7. Verify Telemetry & Pool Stats
        const poolSnapshot = slaveTelemetry.harvestPoolMetrics();
        expect(poolSnapshot.totalVectorsProcessed).toBe(1);
        expect(poolSnapshot.totalErrorsEncountered).toBe(0);

        const masterEvents = masterTelemetry.getEvents();
        const slaveEvents = slaveTelemetry.getEvents();
        expect(masterEvents.length).toBeGreaterThanOrEqual(1);
        expect(slaveEvents.length).toBeGreaterThanOrEqual(2); // Replayed + Harvested
    });

    it('validates failure recovery and taxonomy emission across Master-Slave seam on schema error or invariant violation', () => {
        const pool = new SanraMemoryPool({ vectorSlots: 10, keyframeSlots: 5 });
        const telemetry = new SanraTelemetryCollector({ browserId: 'master-0' });
        telemetry.attachMemoryPool(pool);

        // Simulate sending a vector with out-of-bounds rhoY (> 1.0) -> triggers VAL-001 clamping
        const writeOffset = pool.acquireVectorWriteOffset();
        SanraKineticVectorSerializer.serialize({ sequenceId: 999, rhoY: 5.0 }, pool.buffer, writeOffset, telemetry);

        const readOffset = pool.acquireVectorReadOffset();
        const deserialized = SanraKineticVectorSerializer.deserialize(pool.buffer, readOffset);
        expect(deserialized.rhoY).toBe(1.0); // Clamped!

        // Verify VAL-001 telemetry emitted
        const val001Event = telemetry.getEvents().find(e => e.eventName === 'SanraBoundsViolationClamped');
        expect(val001Event).toBeDefined();
        expect(val001Event.payload.errorCode).toBe('VAL-001');

        // Simulate IPC-001 alignment failure by attempting to serialize at unaligned offset
        expect(() => {
            SanraKineticVectorSerializer.serialize({ sequenceId: 1000 }, pool.buffer, writeOffset + 3, telemetry);
        }).toThrow(SanraSchemaAlignmentError);

        // Explicitly emit IPC-001 failure to test taxonomy dispatcher in integration
        telemetry.emitFailure('IPC-001', { offset: writeOffset + 3, reason: 'Unaligned access' });
        expect(pool.getMetric(6)).toBe(2); // TotalErrorsEncountered incremented by VAL-001 and IPC-001
    });
});
