/**
 * @file SanraWireProtocol.mjs
 * @description Defines zero-copy binary serialization schemas and memory alignment invariants
 * for Viewport and Scroll Synchronization vNext (SANRA Architecture Stage 1).
 * 
 * Implements:
 * - SanraKineticVector (64 bytes exact, 8-byte aligned, repr(C) equivalent)
 * - SanraMilestoneKeyframe (48 bytes exact, 8-byte aligned, repr(C) equivalent)
 * - Invariants: INV-MEM-ALIGN, VAL-001 (rho in [0, 1])
 * - Failure Taxonomy: IPC-001, VAL-001
 */

export const KINETIC_VECTOR_SIZE = 64;
export const MILESTONE_KEYFRAME_SIZE = 48;
export const VECTOR_ALIGNMENT = 8;

export const ActionType = {
    KINETIC_STREAM: 0,
    KEYFRAME: 1,
    STRIDE: 2
};

export const VectorFlags = {
    IS_VIEWPORT: 1 << 0,
    ANCHOR_VALID: 1 << 1,
    SCALE_VALID: 1 << 2
};

export class SanraSchemaAlignmentError extends Error {
    constructor(message, details = {}) {
        super(`[IPC-001] FlatBuffer Schema Alignment Validation Failure: ${message}`);
        this.name = 'SanraSchemaAlignmentError';
        this.code = 'IPC-001';
        this.severity = 'FATAL';
        this.details = details;
    }
}

/**
 * Zero-copy serializer and deserializer for SanraKineticVector (64 bytes).
 * 
 * Layout Specification (repr(C) Equivalent):
 * [0x00 - 0x07] timestampMaster: Float64 (8 bytes)
 * [0x08 - 0x0B] sequenceId: Uint32 (4 bytes)
 * [0x0C - 0x0D] actionType: Uint16 (2 bytes)
 * [0x0E - 0x0F] flags: Uint16 (2 bytes)
 * [0x10 - 0x13] nodeHash: Uint32 (4 bytes)
 * [0x14 - 0x15] treeDepth: Uint16 (2 bytes)
 * [0x16 - 0x17] ariaRole: Uint16 (2 bytes)
 * [0x18 - 0x1B] rectRatioX: Float32 (4 bytes)
 * [0x1C - 0x1F] rectRatioY: Float32 (4 bytes)
 * [0x20 - 0x27] rhoX: Float64 (8 bytes)
 * [0x28 - 0x2F] rhoY: Float64 (8 bytes)
 * [0x30 - 0x33] velocityY: Float32 (4 bytes)
 * [0x34 - 0x37] accelerationY: Float32 (4 bytes)
 * [0x38 - 0x3B] anchorNodeHash: Uint32 (4 bytes)
 * [0x3C - 0x3F] anchorOffsetPx: Float32 (4 bytes)
 * Total Size: exactly 64 bytes.
 */
export class SanraKineticVectorSerializer {
    /**
     * Asserts buffer alignment and size invariants (INV-MEM-ALIGN).
     * @param {ArrayBuffer|SharedArrayBuffer} buffer
     * @param {number} offset
     */
    static assertAlignment(buffer, offset = 0) {
        if (!buffer || (buffer.byteLength - offset) < KINETIC_VECTOR_SIZE) {
            throw new SanraSchemaAlignmentError(
                `Buffer capacity insufficient for SanraKineticVector. Expected at least ${KINETIC_VECTOR_SIZE} bytes from offset ${offset}, got ${buffer ? buffer.byteLength - offset : 'null'}.`,
                { expectedSize: KINETIC_VECTOR_SIZE, actualSize: buffer ? buffer.byteLength - offset : 0 }
            );
        }
        if (offset % VECTOR_ALIGNMENT !== 0) {
            throw new SanraSchemaAlignmentError(
                `Memory alignment violation (INV-MEM-ALIGN). Offset ${offset} is not aligned to ${VECTOR_ALIGNMENT}-byte boundary.`,
                { offset, alignment: VECTOR_ALIGNMENT }
            );
        }
    }

    /**
     * Serializes kinetic vector data into target buffer without temporary allocations.
     * Enforces VAL-001 (rho clamped to [0.0, 1.0]).
     * 
     * @param {Object} data - Input kinetic vector fields
     * @param {ArrayBuffer|SharedArrayBuffer} targetBuffer - Destination buffer
     * @param {number} [offset=0] - Byte offset in buffer
     * @param {Object} [telemetrySink=null] - Optional sink to report VAL-001 boundary clamping
     * @returns {number} Number of bytes written (64)
     */
    static serialize(data, targetBuffer, offset = 0, telemetrySink = null) {
        this.assertAlignment(targetBuffer, offset);

        const f64View = new Float64Array(targetBuffer, offset, 8); // Covers up to 64 bytes
        const f32View = new Float32Array(targetBuffer, offset, 16);
        const u32View = new Uint32Array(targetBuffer, offset, 16);
        const u16View = new Uint16Array(targetBuffer, offset, 32);

        // Enforce VAL-001: Clamp rhoX and rhoY to [0.0, 1.0]
        let rhoX = data.rhoX ?? 0.0;
        let rhoY = data.rhoY ?? 0.0;
        let boundsClamped = false;

        if (rhoX < 0.0 || rhoX > 1.0 || rhoY < 0.0 || rhoY > 1.0) {
            boundsClamped = true;
            const originalRhoX = rhoX;
            const originalRhoY = rhoY;
            rhoX = Math.max(0.0, Math.min(1.0, rhoX));
            rhoY = Math.max(0.0, Math.min(1.0, rhoY));

            if (telemetrySink && typeof telemetrySink.emitEvent === 'function') {
                telemetrySink.emitEvent('SanraBoundsViolationClamped', {
                    severity: 'ERROR',
                    subsystem: 'VAL',
                    pipelineStage: 'SERIALIZE',
                    payload: {
                        errorCode: 'VAL-001',
                        originalRhoX,
                        originalRhoY,
                        clampedRhoX: rhoX,
                        clampedRhoY: rhoY,
                        sequenceId: data.sequenceId ?? 0
                    }
                });
            }
        }

        // Write Header (16 bytes)
        f64View[0] = data.timestampMaster ?? Date.now(); // [0x00]
        u32View[2] = (data.sequenceId ?? 0) >>> 0;       // [0x08]
        u16View[6] = (data.actionType ?? ActionType.KINETIC_STREAM) & 0xFFFF; // [0x0C]
        u16View[7] = (data.flags ?? 0) & 0xFFFF;         // [0x0E]

        // Write Topological Spatial Signature (16 bytes)
        u32View[4] = (data.nodeHash ?? 0) >>> 0;         // [0x10]
        u16View[10] = (data.treeDepth ?? 0) & 0xFFFF;    // [0x14]
        u16View[11] = (data.ariaRole ?? 0) & 0xFFFF;     // [0x16]
        f32View[6] = data.rectRatioX ?? 1.0;             // [0x18]
        f32View[7] = data.rectRatioY ?? 1.0;             // [0x1C]

        // Write SANRA Percentage & Kinetic Kinematics (24 bytes)
        f64View[4] = rhoX;                               // [0x20]
        f64View[5] = rhoY;                               // [0x28]
        f32View[12] = data.velocityY ?? 0.0;             // [0x30]
        f32View[13] = data.accelerationY ?? 0.0;         // [0x34]

        // Write Semantic Anchor Reference (8 bytes)
        u32View[14] = (data.anchorNodeHash ?? 0) >>> 0;  // [0x38]
        f32View[15] = data.anchorOffsetPx ?? 0.0;        // [0x3C]

        return KINETIC_VECTOR_SIZE;
    }

    /**
     * Deserializes kinetic vector from source buffer without allocating nested objects.
     * When targetObject is provided, populates it directly (zero-allocation).
     * 
     * @param {ArrayBuffer|SharedArrayBuffer} sourceBuffer
     * @param {number} [offset=0]
     * @param {Object} [targetObject={}] Reusable target object to populate
     * @returns {Object} Deserialized kinetic vector fields
     */
    static deserialize(sourceBuffer, offset = 0, targetObject = {}) {
        this.assertAlignment(sourceBuffer, offset);

        const f64View = new Float64Array(sourceBuffer, offset, 8);
        const f32View = new Float32Array(sourceBuffer, offset, 16);
        const u32View = new Uint32Array(sourceBuffer, offset, 16);
        const u16View = new Uint16Array(sourceBuffer, offset, 32);

        targetObject.timestampMaster = f64View[0];
        targetObject.sequenceId = u32View[2];
        targetObject.actionType = u16View[6];
        targetObject.flags = u16View[7];

        targetObject.nodeHash = u32View[4];
        targetObject.treeDepth = u16View[10];
        targetObject.ariaRole = u16View[11];
        targetObject.rectRatioX = f32View[6];
        targetObject.rectRatioY = f32View[7];

        targetObject.rhoX = f64View[4];
        targetObject.rhoY = f64View[5];
        targetObject.velocityY = f32View[12];
        targetObject.accelerationY = f32View[13];

        targetObject.anchorNodeHash = u32View[14];
        targetObject.anchorOffsetPx = f32View[15];

        return targetObject;
    }
}

/**
 * Zero-copy serializer and deserializer for SanraMilestoneKeyframe (48 bytes).
 * 
 * Layout Specification (repr(C) Equivalent):
 * [0x00 - 0x07] timestampMaster: Float64 (8 bytes)
 * [0x08 - 0x0B] sequenceId: Uint32 (4 bytes)
 * [0x0C - 0x0F] targetNodeHash: Uint32 (4 bytes)
 * [0x10 - 0x17] exactRhoX: Float64 (8 bytes)
 * [0x18 - 0x1F] exactRhoY: Float64 (8 bytes)
 * [0x20 - 0x27] maxScrollBoundsY: Float64 (8 bytes)
 * [0x28 - 0x2B] layoutChecksum: Uint32 (4 bytes)
 * [0x2C - 0x2F] padding: Uint32 (4 bytes)
 * Total Size: exactly 48 bytes.
 */
export class SanraMilestoneKeyframeSerializer {
    static assertAlignment(buffer, offset = 0) {
        if (!buffer || (buffer.byteLength - offset) < MILESTONE_KEYFRAME_SIZE) {
            throw new SanraSchemaAlignmentError(
                `Buffer capacity insufficient for SanraMilestoneKeyframe. Expected at least ${MILESTONE_KEYFRAME_SIZE} bytes from offset ${offset}, got ${buffer ? buffer.byteLength - offset : 'null'}.`,
                { expectedSize: MILESTONE_KEYFRAME_SIZE, actualSize: buffer ? buffer.byteLength - offset : 0 }
            );
        }
        if (offset % VECTOR_ALIGNMENT !== 0) {
            throw new SanraSchemaAlignmentError(
                `Memory alignment violation (INV-MEM-ALIGN). Offset ${offset} is not aligned to ${VECTOR_ALIGNMENT}-byte boundary.`,
                { offset, alignment: VECTOR_ALIGNMENT }
            );
        }
    }

    static serialize(data, targetBuffer, offset = 0, telemetrySink = null) {
        this.assertAlignment(targetBuffer, offset);

        const f64View = new Float64Array(targetBuffer, offset, 6); // Covers 48 bytes
        const u32View = new Uint32Array(targetBuffer, offset, 12);

        let exactRhoX = data.exactRhoX ?? 0.0;
        let exactRhoY = data.exactRhoY ?? 0.0;

        if (exactRhoX < 0.0 || exactRhoX > 1.0 || exactRhoY < 0.0 || exactRhoY > 1.0) {
            const originalRhoX = exactRhoX;
            const originalRhoY = exactRhoY;
            exactRhoX = Math.max(0.0, Math.min(1.0, exactRhoX));
            exactRhoY = Math.max(0.0, Math.min(1.0, exactRhoY));

            if (telemetrySink && typeof telemetrySink.emitEvent === 'function') {
                telemetrySink.emitEvent('SanraBoundsViolationClamped', {
                    severity: 'ERROR',
                    subsystem: 'VAL',
                    pipelineStage: 'SERIALIZE',
                    payload: {
                        errorCode: 'VAL-001',
                        originalRhoX,
                        originalRhoY,
                        clampedRhoX: exactRhoX,
                        clampedRhoY: exactRhoY,
                        sequenceId: data.sequenceId ?? 0,
                        isKeyframe: true
                    }
                });
            }
        }

        f64View[0] = data.timestampMaster ?? Date.now(); // [0x00]
        u32View[2] = (data.sequenceId ?? 0) >>> 0;       // [0x08]
        u32View[3] = (data.targetNodeHash ?? 0) >>> 0;   // [0x0C]
        f64View[2] = exactRhoX;                          // [0x10]
        f64View[3] = exactRhoY;                          // [0x18]
        f64View[4] = data.maxScrollBoundsY ?? 0.0;       // [0x20]
        u32View[10] = (data.layoutChecksum ?? 0) >>> 0;  // [0x28]
        u32View[11] = (data.padding ?? 0) >>> 0;         // [0x2C]

        return MILESTONE_KEYFRAME_SIZE;
    }

    static deserialize(sourceBuffer, offset = 0, targetObject = {}) {
        this.assertAlignment(sourceBuffer, offset);

        const f64View = new Float64Array(sourceBuffer, offset, 6);
        const u32View = new Uint32Array(sourceBuffer, offset, 12);

        targetObject.timestampMaster = f64View[0];
        targetObject.sequenceId = u32View[2];
        targetObject.targetNodeHash = u32View[3];
        targetObject.exactRhoX = f64View[2];
        targetObject.exactRhoY = f64View[3];
        targetObject.maxScrollBoundsY = f64View[4];
        targetObject.layoutChecksum = u32View[10];
        targetObject.padding = u32View[11];

        return targetObject;
    }
}
