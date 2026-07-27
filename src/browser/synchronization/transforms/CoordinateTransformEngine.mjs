/**
 * @file CoordinateTransformEngine.mjs
 * @description Stage 3 Coordinate Transform & Projection Engine for SANRA vNext.
 * Supports forward and inverse projection matrices between Master and Slave coordinate spaces
 * (layout viewport, visual viewport pinch-zoom, and physical device coordinates).
 * Enforces VAL-004 bounds clipping and INV-TRANSFORM-REVERSIBILITY (VAL-003) without floating-point drift
 * or heap allocations during high-frequency streaming.
 */

export const REVERSIBILITY_TOLERANCE = 1e-6;

/**
 * Affine transformation matrix representation [a, b, c, d, tx, ty].
 * For standard 2D scaling and translation: x' = a*x + c*y + tx, y' = b*x + d*y + ty.
 * In rectangular viewport projection, b=0 and c=0.
 */
export class CoordinateTransformEngine {
    /**
     * @param {string} browserId - Associated browser ID or session identifier
     * @param {import('../telemetry/SanraTelemetry.mjs').SanraTelemetryCollector} [telemetry] - Telemetry collector
     */
    constructor(browserId = 'global', telemetry = null) {
        this.browserId = browserId;
        this.telemetry = telemetry;
        this.clippingCount = 0;
        this.reversibilityFailures = 0;

        // Pre-allocated Float64Array for temporary zero-allocation matrix computations [a, b, c, d, tx, ty]
        this._scratchMatrix = new Float64Array(6);
        this._scratchInverse = new Float64Array(6);
    }

    /**
     * Computes a 2D affine projection matrix from sourceViewport to targetViewport.
     * @param {Object} sourceViewport - Source viewport dimensions and scaling
     * @param {number} sourceViewport.width - Layout width
     * @param {number} sourceViewport.height - Layout height
     * @param {number} [sourceViewport.dpr=1.0] - Device pixel ratio
     * @param {number} [sourceViewport.visualScale=1.0] - Pinch zoom scale
     * @param {number} [sourceViewport.visualOffsetX=0] - Visual viewport X offset
     * @param {number} [sourceViewport.visualOffsetY=0] - Visual viewport Y offset
     * @param {Object} targetViewport - Target viewport dimensions and scaling
     * @param {string} [coordinateSpace='visual'] - 'layout', 'visual', or 'device'
     * @returns {Float64Array} A 6-element Float64Array [a, b, c, d, tx, ty] representing the transformation matrix
     */
    computeMatrix(sourceViewport, targetViewport, coordinateSpace = 'visual') {
        const sw = sourceViewport.width || 1;
        const sh = sourceViewport.height || 1;
        const tw = targetViewport.width || 1;
        const th = targetViewport.height || 1;

        const sScale = sourceViewport.visualScale || 1.0;
        const tScale = targetViewport.visualScale || 1.0;
        const sOffX = sourceViewport.visualOffsetX || 0;
        const sOffY = sourceViewport.visualOffsetY || 0;
        const tOffX = targetViewport.visualOffsetX || 0;
        const tOffY = targetViewport.visualOffsetY || 0;

        const sDpr = sourceViewport.dpr || 1.0;
        const tDpr = targetViewport.dpr || 1.0;

        const matrix = new Float64Array(6);

        if (coordinateSpace === 'layout') {
            // Simple layout viewport proportional scaling
            matrix[0] = tw / sw; // a
            matrix[1] = 0;       // b
            matrix[2] = 0;       // c
            matrix[3] = th / sh; // d
            matrix[4] = 0;       // tx
            matrix[5] = 0;       // ty
        } else if (coordinateSpace === 'visual') {
            // Visual viewport mapping accounting for pinch-zoom scales and offsets
            // x_layout = x_visual / sScale + sOffX  ->  rho_x = x_layout / sw
            // x'_visual = (rho_x * tw - tOffX) * tScale
            matrix[0] = (tw * tScale) / (sw * sScale); // a
            matrix[1] = 0;
            matrix[2] = 0;
            matrix[3] = (th * tScale) / (sh * sScale); // d
            matrix[4] = tScale * (((tw * sOffX) / sw) - tOffX); // tx
            matrix[5] = tScale * (((th * sOffY) / sh) - tOffY); // ty
        } else if (coordinateSpace === 'device') {
            // Physical device pixels mapping
            matrix[0] = (tw * tDpr) / (sw * sDpr);
            matrix[1] = 0;
            matrix[2] = 0;
            matrix[3] = (th * tDpr) / (sh * sDpr);
            matrix[4] = 0;
            matrix[5] = 0;
        }

        return matrix;
    }

    /**
     * Computes the inverse of an affine matrix [a, b, c, d, tx, ty].
     * @param {Float64Array|number[]} matrix - Input 6-element matrix
     * @returns {Float64Array} Inverse 6-element matrix
     */
    computeInverseMatrix(matrix) {
        const a = matrix[0], b = matrix[1], c = matrix[2], d = matrix[3], tx = matrix[4], ty = matrix[5];
        const det = a * d - b * c;
        if (Math.abs(det) < 1e-12) {
            throw new Error(`[VAL-003] Transformation matrix is singular and cannot be inverted (det=${det})`);
        }

        const inv = new Float64Array(6);
        const invDet = 1.0 / det;
        inv[0] = d * invDet;        // a'
        inv[1] = -b * invDet;       // b'
        inv[2] = -c * invDet;       // c'
        inv[3] = a * invDet;        // d'
        inv[4] = (c * ty - d * tx) * invDet; // tx'
        inv[5] = (b * tx - a * ty) * invDet; // ty'

        return inv;
    }

    /**
     * Transforms a single 2D point (x, y) using the provided matrix.
     * Enforces VAL-004 clipping if targetBounds are specified.
     * @param {number} x - Input X coordinate
     * @param {number} y - Input Y coordinate
     * @param {Float64Array|number[]} matrix - Transformation matrix [a, b, c, d, tx, ty]
     * @param {Object} [targetBounds=null] - Bounding rectangle { minX, maxX, minY, maxY } or { width, height }
     * @returns {{ x: number, y: number, clipped: boolean }}
     */
    transformPoint(x, y, matrix, targetBounds = null) {
        let outX = matrix[0] * x + matrix[2] * y + matrix[4];
        let outY = matrix[1] * x + matrix[3] * y + matrix[5];
        let clipped = false;

        if (targetBounds) {
            const minX = targetBounds.minX ?? 0;
            const minY = targetBounds.minY ?? 0;
            const maxX = targetBounds.maxX ?? targetBounds.width ?? Infinity;
            const maxY = targetBounds.maxY ?? targetBounds.height ?? Infinity;

            if (outX < minX || outX > maxX || outY < minY || outY > maxY) {
                outX = Math.max(minX, Math.min(maxX, outX));
                outY = Math.max(minY, Math.min(maxY, outY));
                clipped = true;
                this._onClippingDetected(1, { x, y, outX, outY, targetBounds });
            }
        }

        return { x: outX, y: outY, clipped };
    }

    /**
     * Zero-allocation in-place coordinate transformation on a typed array buffer or SharedArrayBuffer view.
     * Modifies the coordinate pairs [x0, y0, x1, y1, ...] in place.
     * @param {Float64Array|Float32Array} buffer - Buffer containing coordinate pairs
     * @param {number} offsetElements - Starting element index in buffer (must be even)
     * @param {number} pairCount - Number of (x, y) pairs to transform
     * @param {Float64Array|number[]} matrix - Transformation matrix [a, b, c, d, tx, ty]
     * @param {Object} [targetBounds=null] - Bounding rectangle for VAL-004 clipping
     * @returns {number} Number of coordinate pairs clipped during transformation
     */
    transformBufferInPlace(buffer, offsetElements, pairCount, matrix, targetBounds = null) {
        const a = matrix[0], b = matrix[1], c = matrix[2], d = matrix[3], tx = matrix[4], ty = matrix[5];
        let clippedCount = 0;

        const minX = targetBounds ? (targetBounds.minX ?? 0) : -Infinity;
        const minY = targetBounds ? (targetBounds.minY ?? 0) : -Infinity;
        const maxX = targetBounds ? (targetBounds.maxX ?? targetBounds.width ?? Infinity) : Infinity;
        const maxY = targetBounds ? (targetBounds.maxY ?? targetBounds.height ?? Infinity) : Infinity;

        for (let i = 0; i < pairCount; i++) {
            const idx = offsetElements + (i << 1);
            const x = buffer[idx];
            const y = buffer[idx + 1];

            let outX = a * x + c * y + tx;
            let outY = b * x + d * y + ty;

            if (outX < minX || outX > maxX || outY < minY || outY > maxY) {
                outX = Math.max(minX, Math.min(maxX, outX));
                outY = Math.max(minY, Math.min(maxY, outY));
                clippedCount++;
            }

            buffer[idx] = outX;
            buffer[idx + 1] = outY;
        }

        if (clippedCount > 0 && targetBounds) {
            this._onClippingDetected(clippedCount, { pairCount, targetBounds });
        }

        return clippedCount;
    }

    /**
     * Verifies INV-TRANSFORM-REVERSIBILITY for a given point and matrix pair.
     * Asserts that applying forward followed by inverse matrix yields original coordinates within 1e-6.
     * @param {number} x - Input X coordinate
     * @param {number} y - Input Y coordinate
     * @param {Float64Array|number[]} forwardMatrix - Forward matrix
     * @param {Float64Array|number[]} inverseMatrix - Inverse matrix
     * @param {number} [tolerance=REVERSIBILITY_TOLERANCE] - Precision tolerance (default 1e-6)
     * @returns {boolean} True if reversible within tolerance
     */
    verifyReversibility(x, y, forwardMatrix, inverseMatrix, tolerance = REVERSIBILITY_TOLERANCE) {
        const fX = forwardMatrix[0] * x + forwardMatrix[2] * y + forwardMatrix[4];
        const fY = forwardMatrix[1] * x + forwardMatrix[3] * y + forwardMatrix[5];

        const revX = inverseMatrix[0] * fX + inverseMatrix[2] * fY + inverseMatrix[4];
        const revY = inverseMatrix[1] * fX + inverseMatrix[3] * fY + inverseMatrix[5];

        const driftX = Math.abs(revX - x);
        const driftY = Math.abs(revY - y);

        const isReversible = driftX <= tolerance && driftY <= tolerance;

        if (!isReversible) {
            this.reversibilityFailures++;
            const reason = `Transform reversibility invariant violated: drift=(${driftX.toExponential(4)}, ${driftY.toExponential(4)}) > tolerance (${tolerance})`;
            if (this.telemetry) {
                this.telemetry.emitFailure('VAL-003', {
                    browserId: this.browserId,
                    original: { x, y },
                    transformed: { fX, fY },
                    reverted: { revX, revY },
                    drift: { driftX, driftY },
                    reason
                });
                this.telemetry.emitEvent('TransformReversibilityFailed', {
                    browserId: this.browserId,
                    payload: {
                        errorCode: 'VAL-003',
                        original: { x, y },
                        transformed: { fX, fY },
                        reverted: { revX, revY },
                        drift: { driftX, driftY },
                        reason
                    }
                });
            }
            throw new Error(`[VAL-003] ${reason}`);
        }

        if (this.telemetry) {
            this.telemetry.emitEvent('TransformReversibilityValidated', {
                browserId: this.browserId,
                payload: {
                    original: { x, y },
                    drift: { driftX, driftY }
                }
            });
        }

        return true;
    }

    /**
     * Handles VAL-004 bounds clipping detection and telemetry reporting.
     * @private
     */
    _onClippingDetected(count, details) {
        this.clippingCount += count;
        if (this.telemetry) {
            this.telemetry.emitFailure('VAL-004', {
                browserId: this.browserId,
                clippedCount: count,
                totalClipped: this.clippingCount,
                details
            });
            this.telemetry.emitEvent('CoordinateTransformationClipped', {
                browserId: this.browserId,
                payload: {
                    errorCode: 'VAL-004',
                    clippedCount: count,
                    totalClipped: this.clippingCount,
                    details
                }
            });
        }
    }
}
