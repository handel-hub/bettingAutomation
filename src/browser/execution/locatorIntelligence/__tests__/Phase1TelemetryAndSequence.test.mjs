import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { ActionDispatcher } from '../../ActionDispatcher.mjs';

describe('Phase 1 — Telemetry & Sequence Counter Verification', () => {
    beforeEach(() => {
        TelemetryCollector.reset();
    });

    it('should initialize epochSync metrics in MetricsRegistry and include in snapshot', () => {
        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.epochSync).toBeDefined();
        expect(snapshot.epochSync.injectionSuccess).toBe(0);
        expect(snapshot.epochSync.injectionFailure).toBe(0);
        expect(snapshot.epochSync.injectionRetry).toBe(0);
        expect(snapshot.epochSync.mismatchDetected).toBe(0);
        expect(snapshot.epochSync.skippedStale).toBe(0);
        expect(snapshot.epochSync.skippedTimeout).toBe(0);
        expect(snapshot.epochSync.proceeded).toBe(0);
        expect(snapshot.epochSync.waited).toBe(0);
        expect(snapshot.epochSync.ipcReceived).toBe(0);
        expect(snapshot.epochSync.ipcLost).toBe(0);
        expect(snapshot.epochSync.ipcDuplicatesDropped).toBe(0);
        expect(snapshot.epochSync.ipcOutOfOrder).toBe(0);
        expect(snapshot.epochSync.spaNavigationDetected).toBe(0);
        expect(snapshot.epochSync.averageIpcDeliveryLatency).toBe(0);
        expect(snapshot.epochSync.averageInjectionLatency).toBe(0);
        expect(snapshot.epochSync.averageEpochWaitDuration).toBe(0);
        expect(snapshot.epochSync.averageEpochDrift).toBe(0);
    });

    it('should record epoch injection attempts and latencies', () => {
        TelemetryCollector.recordEpochInjection(true, 15);
        TelemetryCollector.recordEpochInjection(false, 25);
        TelemetryCollector.recordEpochInjectionRetry();

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.injectionSuccess).toBe(1);
        expect(snap.epochSync.injectionFailure).toBe(1);
        expect(snap.epochSync.injectionRetry).toBe(1);
        expect(snap.epochSync.averageInjectionLatency).toBe(20); // (15 + 25) / 2
    });

    it('should record epoch mismatches and drift', () => {
        TelemetryCollector.recordEpochMismatch(3, 1); // drift of 2
        TelemetryCollector.recordEpochMismatch(4, 8); // drift of 4

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.mismatchDetected).toBe(2);
        expect(snap.epochSync.averageEpochDrift).toBe(3); // (2 + 4) / 2
    });

    it('should record epoch decisions and wait durations', () => {
        TelemetryCollector.recordEpochDecision('PROCEED');
        TelemetryCollector.recordEpochDecision('WAIT', 100);
        TelemetryCollector.recordEpochDecision('WAIT', 300);
        TelemetryCollector.recordEpochDecision('SKIP', 0, 'Command epoch 2 is behind slave epoch 3');
        TelemetryCollector.recordEpochDecision('SKIP', 0, 'Slave failed to navigate within 2000ms');

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.proceeded).toBe(1);
        expect(snap.epochSync.waited).toBe(2);
        expect(snap.epochSync.skippedStale).toBe(1);
        expect(snap.epochSync.skippedTimeout).toBe(1);
        expect(snap.epochSync.averageEpochWaitDuration).toBe(200); // (100 + 300) / 2
    });

    it('should record IPC delivery telemetry (received, latency, lost, duplicate, out of order)', () => {
        TelemetryCollector.recordIpcDelivery(5);
        TelemetryCollector.recordIpcDelivery(15);
        TelemetryCollector.recordIpcLost();
        TelemetryCollector.recordIpcLost();
        TelemetryCollector.recordIpcDuplicate();
        TelemetryCollector.recordIpcOutOfOrder();

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.ipcReceived).toBe(2);
        expect(snap.epochSync.averageIpcDeliveryLatency).toBe(10); // (5 + 15) / 2
        expect(snap.epochSync.ipcLost).toBe(2);
        expect(snap.epochSync.ipcDuplicatesDropped).toBe(1);
        expect(snap.epochSync.ipcOutOfOrder).toBe(1);
    });

    it('should record SPA navigations', () => {
        TelemetryCollector.recordSpaNavigation('pushState');
        TelemetryCollector.recordSpaNavigation('replaceState');

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.spaNavigationDetected).toBe(2);
    });

    it('should reset all epochSync metrics on reset()', () => {
        TelemetryCollector.recordEpochInjection(true, 50);
        TelemetryCollector.recordIpcLost();
        TelemetryCollector.recordEpochDecision('PROCEED');

        TelemetryCollector.reset();

        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.injectionSuccess).toBe(0);
        expect(snap.epochSync.ipcLost).toBe(0);
        expect(snap.epochSync.proceeded).toBe(0);
        expect(snap.epochSync.averageInjectionLatency).toBe(0);
    });

    it('should include window.__ANTIGRAVITY_SEQ__ and sequenceNumber in ActionDispatcher injected script', async () => {
        const dispatcher = new ActionDispatcher({});
        await dispatcher.buildInjectedScript();
        const script = dispatcher.cachedScriptContent;

        expect(script).toContain('window.__ANTIGRAVITY_SEQ__ = 0;');
        expect(script).toContain('sequenceNumber: ++window.__ANTIGRAVITY_SEQ__,');
    });
});
