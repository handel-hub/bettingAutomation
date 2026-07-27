import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    ViewportIsomorphicGatingController,
    ISOMORPHISM_TOLERANCE,
    SanraTelemetryCollector
} from '../../src/browser/synchronization/index.mjs';

describe('Stage 2 — Viewport Isomorphic Gating Subsystem (Unit Tests)', () => {
    let telemetry;
    let controller;

    beforeEach(() => {
        telemetry = new SanraTelemetryCollector({ browserId: 'slave-1' });
        controller = new ViewportIsomorphicGatingController('slave-1', null, telemetry);
    });

    it('validates 5-tuple isomorphism within 0.001 tolerance (INV-VP-ISOMORPHISM)', () => {
        const masterViewport = {
            width: 1280,
            height: 720,
            dpr: 2.0,
            orientation: 'landscapePrimary',
            visualScale: 1.0
        };

        // Exact match
        let res = controller.evaluateIsomorphism(masterViewport, {
            width: 1280,
            height: 720,
            dpr: 2.0,
            orientation: 'landscapePrimary',
            visualScale: 1.0
        });
        expect(res.isIsomorphic).toBe(true);

        // Within 0.001 tolerance (e.g. 1280.0005 vs 1280)
        res = controller.evaluateIsomorphism(masterViewport, {
            width: 1280.0005,
            height: 719.9995,
            dpr: 2.0005,
            orientation: { type: 'landscapePrimary', angle: 90 },
            visualScale: 1.0005
        });
        expect(res.isIsomorphic).toBe(true);

        const validEvents = telemetry.getEvents().filter(e => e.eventName === 'ViewportIsomorphismValidated');
        expect(validEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('emits VP-001 on layout dimension or orientation divergence > 0.001', () => {
        const masterViewport = { width: 1280, height: 720, dpr: 1.0, orientation: 'portraitPrimary', visualScale: 1.0 };
        
        // Dimension mismatch
        const resDim = controller.evaluateIsomorphism(masterViewport, {
            width: 1285, // 5px difference!
            height: 720,
            dpr: 1.0,
            orientation: 'portraitPrimary',
            visualScale: 1.0
        });
        expect(resDim.isIsomorphic).toBe(false);
        expect(resDim.failureCode).toBe('VP-001');

        // Orientation mismatch
        const resOrient = controller.evaluateIsomorphism(masterViewport, {
            width: 1280,
            height: 720,
            dpr: 1.0,
            orientation: 'landscapePrimary', // Different orientation!
            visualScale: 1.0
        });
        expect(resOrient.isIsomorphic).toBe(false);
        expect(resOrient.failureCode).toBe('VP-001');

        const failureEvents = telemetry.getEvents().filter(e => e.eventName === 'ViewportIsomorphismFailed');
        expect(failureEvents).toHaveLength(2);
        expect(failureEvents[0].payload.failureCode).toBe('VP-001');
    });

    it('emits VP-003 on DevicePixelRatio divergence > 0.001', () => {
        const masterViewport = { width: 1000, height: 800, dpr: 2.0, orientation: 'portraitPrimary', visualScale: 1.0 };
        const res = controller.evaluateIsomorphism(masterViewport, {
            width: 1000,
            height: 800,
            dpr: 1.0, // DPR mismatch!
            orientation: 'portraitPrimary',
            visualScale: 1.0
        });

        expect(res.isIsomorphic).toBe(false);
        expect(res.failureCode).toBe('VP-003');
        expect(telemetry.getEvents().some(e => e.payload?.errorCode === 'VP-003')).toBe(true);
    });

    it('emits VP-002 on visual viewport scale divergence / zoom mismatch > 0.001', () => {
        const masterViewport = { width: 1000, height: 800, dpr: 1.0, orientation: 'portraitPrimary', visualScale: 1.0 };
        const res = controller.evaluateIsomorphism(masterViewport, {
            width: 1000,
            height: 800,
            dpr: 1.0,
            orientation: 'portraitPrimary',
            visualScale: 1.25 // User zoomed in on Slave!
        });

        expect(res.isIsomorphic).toBe(false);
        expect(res.failureCode).toBe('VP-002');
        expect(telemetry.getEvents().some(e => e.payload?.errorCode === 'VP-002')).toBe(true);
    });

    it('executes 5-tuple CDP locking via Emulation.setDeviceMetricsOverride and setPageScaleFactor', async () => {
        const sendMock = vi.fn().mockResolvedValue({});
        const cdpMock = { send: sendMock };
        const pageMock = {
            context: () => ({
                newCDPSession: vi.fn().mockResolvedValue(cdpMock)
            })
        };

        const targetViewport = {
            width: 1920,
            height: 1080,
            dpr: 2.0,
            orientation: { type: 'landscapePrimary', angle: 0 },
            visualScale: 1.5,
            isMobile: false
        };

        const locked = await controller.lockViewport(pageMock, targetViewport);
        expect(locked).toBe(true);
        expect(sendMock).toHaveBeenCalledWith('Emulation.setDeviceMetricsOverride', {
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2.0,
            mobile: false,
            screenOrientation: { type: 'landscapePrimary', angle: 0 }
        });
        expect(sendMock).toHaveBeenCalledWith('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });

        const lockEvent = telemetry.getEvents().find(e => e.eventName === 'ViewportLockAcquired');
        expect(lockEvent).toBeDefined();
        expect(lockEvent.payload.cdpUsed).toBe(true);
    });

    it('emits VP-004 on CDP locking timeout or error and falls back to standard page resizing', async () => {
        const sendMock = vi.fn().mockRejectedValue(new Error('CDP protocol timeout'));
        const pageMock = {
            context: () => ({
                newCDPSession: vi.fn().mockResolvedValue({ send: sendMock })
            }),
            setViewportSize: vi.fn().mockResolvedValue()
        };

        const locked = await controller.lockViewport(pageMock, { width: 800, height: 600 });
        expect(locked).toBe(true); // Still true because fallback setViewportSize succeeded!
        expect(pageMock.setViewportSize).toHaveBeenCalledWith({ width: 800, height: 600 });

        expect(telemetry.getEvents().some(e => e.payload?.errorCode === 'VP-004')).toBe(true);
    });
});
