import { describe, it, expect, beforeEach } from 'vitest';
import {
    CoordinateTransformEngine,
    REVERSIBILITY_TOLERANCE,
    SanraTelemetryCollector
} from '../../src/browser/synchronization/index.mjs';

describe('Stage 3 — Coordinate Transform & Projection Engine (Unit Tests)', () => {
    let telemetry;
    let engine;

    beforeEach(() => {
        telemetry = new SanraTelemetryCollector({ browserId: 'slave-1' });
        engine = new CoordinateTransformEngine('slave-1', telemetry);
    });

    it('computes accurate forward and inverse projection matrices for visual viewport pinch zoom and offset', () => {
        const masterViewport = {
            width: 1920,
            height: 1080,
            visualScale: 1.0,
            visualOffsetX: 0,
            visualOffsetY: 0
        };

        // Slave is zoomed in 2x and panned to (100, 50)
        const slaveViewport = {
            width: 1920,
            height: 1080,
            visualScale: 2.0,
            visualOffsetX: 100,
            visualOffsetY: 50
        };

        const fwdMatrix = engine.computeMatrix(masterViewport, slaveViewport, 'visual');
        const invMatrix = engine.computeInverseMatrix(fwdMatrix);

        // Point (500, 500) on Master Visual Viewport
        // In normalized layout ratios: rhoX = 500/1920, rhoY = 500/1080
        // On Slave Visual Viewport: x' = ((500/1920)*1920 - 100) * 2 = (500 - 100) * 2 = 800
        // y' = (500 - 50) * 2 = 900
        const pt = engine.transformPoint(500, 500, fwdMatrix);
        expect(pt.x).toBeCloseTo(800, 5);
        expect(pt.y).toBeCloseTo(900, 5);
        expect(pt.clipped).toBe(false);

        // Verify reversibility back to Master
        const revPt = engine.transformPoint(pt.x, pt.y, invMatrix);
        expect(revPt.x).toBeCloseTo(500, 6);
        expect(revPt.y).toBeCloseTo(500, 6);
    });

    it('enforces INV-TRANSFORM-REVERSIBILITY within 1e-6 tolerance across scaled/zoomed viewports', () => {
        const masterViewport = { width: 1440, height: 900, dpr: 2.0, visualScale: 1.25, visualOffsetX: 10, visualOffsetY: 20 };
        const slaveViewport = { width: 1024, height: 768, dpr: 1.5, visualScale: 1.75, visualOffsetX: 50, visualOffsetY: 30 };

        const fwd = engine.computeMatrix(masterViewport, slaveViewport, 'visual');
        const inv = engine.computeInverseMatrix(fwd);

        const isReversible = engine.verifyReversibility(350.1234, 420.5678, fwd, inv);
        expect(isReversible).toBe(true);

        const events = telemetry.getEvents().filter(e => e.eventName === 'TransformReversibilityValidated');
        expect(events).toHaveLength(1);
    });

    it('throws VAL-003 and emits telemetry when transform reversibility invariant is violated', () => {
        const fwd = new Float64Array([2.0, 0, 0, 3.0, 10, 20]);
        // Intentionally corrupted inverse matrix
        const corruptedInv = new Float64Array([0.1, 0, 0, 0.1, 0, 0]);

        expect(() => engine.verifyReversibility(100, 100, fwd, corruptedInv)).toThrow(/\[VAL-003\] Transform reversibility invariant violated/);

        const failEvents = telemetry.getEvents().filter(e => e.eventName === 'TransformReversibilityFailed');
        expect(failEvents).toHaveLength(1);
        expect(failEvents[0].payload.errorCode).toBe('VAL-003');
    });

    it('enforces VAL-004 bounds clipping and emits CoordinateTransformationClipped telemetry', () => {
        const fwd = new Float64Array([1.0, 0, 0, 1.0, 500, 500]); // Translates +500px
        const targetBounds = { width: 800, height: 600 };

        // Point (400, 200) -> translates to (900, 700), which exceeds target Bounds (800, 600)
        const pt = engine.transformPoint(400, 200, fwd, targetBounds);
        expect(pt.x).toBe(800); // Clamped to max X
        expect(pt.y).toBe(600); // Clamped to max Y
        expect(pt.clipped).toBe(true);

        const clipEvents = telemetry.getEvents().filter(e => e.eventName === 'CoordinateTransformationClipped');
        expect(clipEvents).toHaveLength(1);
        expect(clipEvents[0].payload.errorCode).toBe('VAL-004');
        expect(clipEvents[0].payload.clippedCount).toBe(1);
    });

    it('performs zero-allocation in-place buffer transforms on coordinate arrays', () => {
        // Create 4 coordinate pairs: (0,0), (100,100), (500,500), (-50,-50)
        const buffer = new Float64Array([0, 0, 100, 100, 500, 500, -50, -50]);
        const matrix = new Float64Array([2.0, 0, 0, 2.0, 10, 10]); // Scale 2x, translate +10
        const bounds = { minX: 0, minY: 0, maxX: 600, maxY: 600 };

        const clippedCount = engine.transformBufferInPlace(buffer, 0, 4, matrix, bounds);

        // (0,0) -> (10,10)
        expect(buffer[0]).toBe(10);
        expect(buffer[1]).toBe(10);

        // (100,100) -> (210,210)
        expect(buffer[2]).toBe(210);
        expect(buffer[3]).toBe(210);

        // (500,500) -> (1010,1010) -> clamped to (600,600)
        expect(buffer[4]).toBe(600);
        expect(buffer[5]).toBe(600);

        // (-50,-50) -> (-90,-90) -> clamped to (0,0)
        expect(buffer[6]).toBe(0);
        expect(buffer[7]).toBe(0);

        expect(clippedCount).toBe(2); // (500,500) and (-50,-50) were clipped!
    });
});
