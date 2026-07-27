import { describe, it, expect, vi } from 'vitest';
import {
    SanraKineticVectorSerializer,
    SanraMilestoneKeyframeSerializer,
    SanraSchemaAlignmentError,
    KINETIC_VECTOR_SIZE,
    MILESTONE_KEYFRAME_SIZE,
    ActionType,
    VectorFlags
} from '../../src/browser/synchronization/models/SanraWireProtocol.mjs';

describe('Stage 1 — SANRA Wire Protocol & Alignment Invariants', () => {
    it('asserts exact 64-byte size and 8-byte alignment for SanraKineticVector (INV-MEM-ALIGN)', () => {
        const buffer = new ArrayBuffer(64);
        expect(() => SanraKineticVectorSerializer.assertAlignment(buffer, 0)).not.toThrow();

        // Unaligned offset should throw IPC-001
        expect(() => SanraKineticVectorSerializer.assertAlignment(buffer, 4)).toThrow(SanraSchemaAlignmentError);
        expect(() => SanraKineticVectorSerializer.assertAlignment(buffer, 4)).toThrow(/IPC-001/);

        // Insufficient buffer size should throw IPC-001
        const smallBuffer = new ArrayBuffer(63);
        expect(() => SanraKineticVectorSerializer.assertAlignment(smallBuffer, 0)).toThrow(SanraSchemaAlignmentError);
    });

    it('serializes and deserializes SanraKineticVector round-trip without allocations', () => {
        const buffer = new ArrayBuffer(64);
        const inputData = {
            timestampMaster: 1722000000123.456,
            sequenceId: 42,
            actionType: ActionType.KINETIC_STREAM,
            flags: VectorFlags.IS_VIEWPORT | VectorFlags.ANCHOR_VALID,
            nodeHash: 0xDEADBEEF,
            treeDepth: 5,
            ariaRole: 10,
            rectRatioX: 1.5,
            rectRatioY: 0.8,
            rhoX: 0.25,
            rhoY: 0.75,
            velocityY: 150.5,
            accelerationY: -10.2,
            anchorNodeHash: 0xCAFEBABE,
            anchorOffsetPx: 24.5
        };

        const bytesWritten = SanraKineticVectorSerializer.serialize(inputData, buffer, 0);
        expect(bytesWritten).toBe(64);

        const targetObj = {};
        const outputData = SanraKineticVectorSerializer.deserialize(buffer, 0, targetObj);

        expect(outputData).toBe(targetObj); // Zero-allocation reuse
        expect(outputData.timestampMaster).toBeCloseTo(inputData.timestampMaster, 3);
        expect(outputData.sequenceId).toBe(42);
        expect(outputData.actionType).toBe(ActionType.KINETIC_STREAM);
        expect(outputData.flags).toBe(inputData.flags);
        expect(outputData.nodeHash >>> 0).toBe(0xDEADBEEF >>> 0);
        expect(outputData.treeDepth).toBe(5);
        expect(outputData.ariaRole).toBe(10);
        expect(outputData.rectRatioX).toBeCloseTo(1.5, 4);
        expect(outputData.rectRatioY).toBeCloseTo(0.8, 4);
        expect(outputData.rhoX).toBeCloseTo(0.25, 6);
        expect(outputData.rhoY).toBeCloseTo(0.75, 6);
        expect(outputData.velocityY).toBeCloseTo(150.5, 3);
        expect(outputData.accelerationY).toBeCloseTo(-10.2, 3);
        expect(outputData.anchorNodeHash >>> 0).toBe(0xCAFEBABE >>> 0);
        expect(outputData.anchorOffsetPx).toBeCloseTo(24.5, 3);
    });

    it('enforces VAL-001 by clamping rhoX and rhoY to [0.0, 1.0] and emitting telemetry', () => {
        const buffer = new ArrayBuffer(64);
        const telemetrySink = { emitEvent: vi.fn() };

        const outOfBoundsData = {
            sequenceId: 99,
            rhoX: -0.5, // Below 0
            rhoY: 1.8   // Above 1
        };

        SanraKineticVectorSerializer.serialize(outOfBoundsData, buffer, 0, telemetrySink);

        const result = SanraKineticVectorSerializer.deserialize(buffer, 0);
        expect(result.rhoX).toBe(0.0);
        expect(result.rhoY).toBe(1.0);

        expect(telemetrySink.emitEvent).toHaveBeenCalledTimes(1);
        expect(telemetrySink.emitEvent).toHaveBeenCalledWith('SanraBoundsViolationClamped', expect.objectContaining({
            severity: 'ERROR',
            payload: expect.objectContaining({
                errorCode: 'VAL-001',
                originalRhoX: -0.5,
                originalRhoY: 1.8,
                clampedRhoX: 0.0,
                clampedRhoY: 1.0,
                sequenceId: 99
            })
        }));
    });

    it('asserts exact 48-byte size and alignment for SanraMilestoneKeyframe', () => {
        const buffer = new ArrayBuffer(48);
        expect(() => SanraMilestoneKeyframeSerializer.assertAlignment(buffer, 0)).not.toThrow();

        expect(() => SanraMilestoneKeyframeSerializer.assertAlignment(buffer, 4)).toThrow(/IPC-001/);
        expect(() => SanraMilestoneKeyframeSerializer.assertAlignment(new ArrayBuffer(47), 0)).toThrow(/IPC-001/);
    });

    it('serializes and deserializes SanraMilestoneKeyframe round-trip', () => {
        const buffer = new ArrayBuffer(48);
        const inputData = {
            timestampMaster: 1722000000999.0,
            sequenceId: 500,
            targetNodeHash: 0x12345678,
            exactRhoX: 0.0,
            exactRhoY: 1.0,
            maxScrollBoundsY: 5000.0,
            layoutChecksum: 0x99887766,
            padding: 0
        };

        const bytesWritten = SanraMilestoneKeyframeSerializer.serialize(inputData, buffer, 0);
        expect(bytesWritten).toBe(48);

        const outputData = SanraMilestoneKeyframeSerializer.deserialize(buffer, 0);
        expect(outputData.timestampMaster).toBeCloseTo(1722000000999.0, 1);
        expect(outputData.sequenceId).toBe(500);
        expect(outputData.targetNodeHash >>> 0).toBe(0x12345678 >>> 0);
        expect(outputData.exactRhoX).toBe(0.0);
        expect(outputData.exactRhoY).toBe(1.0);
        expect(outputData.maxScrollBoundsY).toBeCloseTo(5000.0, 1);
        expect(outputData.layoutChecksum >>> 0).toBe(0x99887766 >>> 0);
    });
});
