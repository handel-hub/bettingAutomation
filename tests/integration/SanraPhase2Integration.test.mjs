import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    ViewportCapabilityProvider,
    BrowserStateRegistry,
    SynchronizationManager,
    SanraTelemetryCollector,
    Capabilities
} from '../../src/browser/synchronization/index.mjs';

describe('Stage 2 — Viewport Isomorphic Gating Subsystem Integration Test', () => {
    let registry;
    let syncManager;
    let telemetry;
    let provider;

    beforeEach(() => {
        registry = new BrowserStateRegistry();
        telemetry = new SanraTelemetryCollector({ browserId: 'slave-1' });
        syncManager = new SynchronizationManager(registry, null);
        syncManager.setTelemetry(telemetry);
        provider = new ViewportCapabilityProvider(registry, syncManager);
    });

    it('automatically enforces 5-tuple CDP locking and evaluates isomorphism during waitFor() readiness check', async () => {
        const sendMock = vi.fn().mockResolvedValue({});
        const cdpMock = { send: sendMock };

        // Mock Playwright Page
        const pageMock = {
            context: () => ({
                newCDPSession: vi.fn().mockResolvedValue(cdpMock)
            }),
            exposeFunction: vi.fn().mockResolvedValue(),
            addInitScript: vi.fn().mockResolvedValue(),
            evaluate: vi.fn().mockImplementation(async () => {
                // After locking is called, return updated isomorphic dimensions
                if (sendMock.mock.calls.length > 0) {
                    return {
                        layoutViewportWidth: 1440,
                        layoutViewportHeight: 900,
                        dpr: 2.0,
                        orientation: 'landscapePrimary',
                        visualViewportScale: 1.0
                    };
                }
                // Initial divergent state before locking
                return {
                    layoutViewportWidth: 1024,
                    layoutViewportHeight: 768,
                    dpr: 1.0,
                    orientation: 'portraitPrimary',
                    visualViewportScale: 1.0
                };
            }),
            setViewportSize: vi.fn().mockResolvedValue()
        };

        // 1. Initialize provider for slave-1
        await provider.initialize('slave-1', pageMock);

        // 2. Simulate Master command requesting execution with 5-tuple viewport metadata
        const syncContext = {
            browserId: 'slave-1',
            context: {
                metadata: {
                    viewport: {
                        width: 1440,
                        height: 900,
                        dpr: 2.0,
                        orientation: 'landscapePrimary',
                        visualScale: 1.0
                    }
                }
            }
        };

        // 3. Execute waitFor() -> provider should trigger wait strategy AND isomorphic gating enforcement!
        const result = await provider.waitFor(syncContext);
        expect(result.status).toBe('SATISFIED');
        expect(result.capability).toBe(Capabilities.VIEWPORT_READY);

        // 4. Verify CDP 5-tuple lock was executed to correct initial divergence
        expect(sendMock).toHaveBeenCalledWith('Emulation.setDeviceMetricsOverride', expect.objectContaining({
            width: 1440,
            height: 900,
            deviceScaleFactor: 2.0,
            screenOrientation: { type: 'landscapePrimary', angle: 0 }
        }));

        // 5. Verify telemetry emitted ViewportLockAcquired and ViewportIsomorphismValidated
        const events = telemetry.getEvents();
        expect(events.some(e => e.eventName === 'ViewportLockAcquired')).toBe(true);
        expect(events.some(e => e.eventName === 'ViewportIsomorphismValidated')).toBe(true);
    });

    it('rejects waitFor() with structured failure taxonomy code when isomorphism cannot be achieved', async () => {
        // Mock Page where locking fails and dimensions remain divergent
        const pageMock = {
            context: () => ({
                newCDPSession: vi.fn().mockRejectedValue(new Error('CDP unavailable'))
            }),
            exposeFunction: vi.fn().mockResolvedValue(),
            addInitScript: vi.fn().mockResolvedValue(),
            evaluate: vi.fn().mockResolvedValue({
                layoutViewportWidth: 800,
                layoutViewportHeight: 600,
                dpr: 1.0,
                orientation: 'portraitPrimary',
                visualViewportScale: 1.0
            }),
            setViewportSize: vi.fn().mockResolvedValue()
        };

        await provider.initialize('slave-1', pageMock);

        const syncContext = {
            browserId: 'slave-1',
            context: {
                metadata: {
                    viewport: {
                        width: 1920,
                        height: 1080,
                        dpr: 2.0,
                        orientation: 'landscapePrimary',
                        visualScale: 1.0
                    }
                }
            }
        };

        // Expect waitFor to reject with VP-001 (Layout Non-Isomorphism Detected)
        await expect(provider.waitFor(syncContext)).rejects.toThrow(/\[VP-001\] Layout dimensions mismatch/);

        const failureEvents = telemetry.getEvents().filter(e => e.eventName === 'ViewportIsomorphismFailed');
        expect(failureEvents.length).toBeGreaterThanOrEqual(1);
        expect(failureEvents[0].payload.failureCode).toBe('VP-001');
    });
});
