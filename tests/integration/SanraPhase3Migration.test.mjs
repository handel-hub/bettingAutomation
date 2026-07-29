import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { rkp } from '../../src/rkp/RuntimeKnowledgePlatform.mjs';
import { logger } from '../../src/config.mjs';
import { CommandRouter } from '../../src/browser/CommandRouter.mjs';
import { TelemetryCollector } from '../../src/browser/execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { SynchronizationManager } from '../../src/browser/synchronization/SynchronizationManager.mjs';
import { SynchronizationTelemetry } from '../../src/browser/synchronization/telemetry/SynchronizationTelemetry.mjs';
import { SynchronizationTimeline } from '../../src/browser/synchronization/telemetry/SynchronizationTimeline.mjs';
import { attachSyncTelemetryAdapter } from '../../src/rkp/integration/SyncTelemetryAdapter.mjs';
import { BrowserStateRegistry } from '../../src/browser/synchronization/BrowserStateRegistry.mjs';
import { attachBrowserLifecycleAdapter } from '../../src/rkp/integration/BrowserLifecycleAdapter.mjs';

describe('Phase 3 Legacy Integration & Strangler Migration', () => {
    beforeAll(async () => {
        process.env.RKP_ENABLED = 'true';
        process.env.RKP_PINO_DUAL_WRITE = 'true';
        process.env.RKP_IPC_HEADERS = 'true';
        await rkp.init();
    });

    afterAll(() => {
        if (rkp.scheduler) {
            rkp.scheduler.stop();
        }
    });

    beforeEach(() => {
        // Clear the ledger/ring buffer before each test
        // By redefining it or reinitializing
        rkp.ringBuffer.buffer = [];
        rkp.ringBuffer.head = 0;
        rkp.ringBuffer.tail = 0;
        rkp.ringBuffer.isFull = false;
        rkp.ledger.lsnCounter = 0;
    });

    it('Stage 1: Pino Integration (Dual-Write Adapter)', async () => {
        logger.info('Test Info Message');
        logger.warn({ someContext: true }, 'Test Warn Message');
        logger.error('Test Error Message');
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const snapshot = rkp.ringBuffer.snapshot();
        expect(snapshot.length).toBeGreaterThanOrEqual(3);
        
        const infoFact = snapshot.find(f => f.type === 'LogFact' && f.level === 'info');
        const warnFact = snapshot.find(f => f.type === 'LogFact' && f.level === 'warn');
        const errorFact = snapshot.find(f => f.type === 'LogFact' && f.level === 'error');
        
        expect(infoFact).toBeDefined();
        expect(warnFact).toBeDefined();
        expect(errorFact).toBeDefined();
        expect(infoFact.message).toBe('Test Info Message');
    });

    it('Stage 2: Command Router (HLC/Correlation Headers)', async () => {
        const router = new CommandRouter();
        
        // Success
        try {
            await router.route({
                category: 'Configuration',
                type: 'UPDATE_CONFIG',
                id: 'cmd-123',
                timestamp: Date.now(),
                payload: { setting: true }
            }, {
                'X-RKP-Trace-Id': 'trace-abc',
                'X-RKP-Span-Id': 'span-def'
            });
        } catch (err) {}
        
        // Failure
        try {
            await router.route({
                id: 'cmd-456'
            }, {
                'X-RKP-Trace-Id': 'trace-xyz'
            });
        } catch (err) {}
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const snapshot = rkp.ringBuffer.snapshot();
        
        const decisionFact = snapshot.find(f => f.type === 'Decision' && f.actionTaken === 'RouteCommand');
        expect(decisionFact).toBeDefined();
        expect(decisionFact.traceId).toBe('trace-abc');
        expect(decisionFact.spanId).toBe('span-def');
        
        const rejectionFact = snapshot.find(f => f.type === 'Decision' && f.actionTaken === 'RejectCommand' && f.traceId === 'trace-xyz');
        expect(rejectionFact).toBeDefined();
    });

    it('Stage 3: Locator Intelligence (Observers)', async () => {
        // Assume TelemetryCollector's adapter is already attached via RuntimeKnowledgePlatform.mjs
        TelemetryCollector.recordLifecycleEvent({
            traceId: 'tr-abc',
            spanId: 'sp-xyz',
            stageName: 'RESOLUTION',
            stageSequence: 1,
            epoch: 5,
            interactionType: 'CLICK'
        });
        
        TelemetryCollector.recordLifecycleEvent({
            traceId: 'tr-abc',
            spanId: 'sp-xyz2',
            stageName: 'EVALUATION',
            validationResult: 'FAIL_LF_404',
            errorDetails: { message: 'Element not found', errorCode: 'LF-404' }
        });
        
        TelemetryCollector.flush();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const snapshot = rkp.ringBuffer.snapshot();
        
        const decisionFact = snapshot.find(f => f.type === 'Decision' && f.actionTaken === 'CLICK');
        expect(decisionFact).toBeDefined();
        expect(decisionFact.evidence.metrics.stageSequence).toBe(1);
        
        const failureFact = snapshot.find(f => f.type === 'Failure' && f.errorCode === 'LF-404');
        expect(failureFact).toBeDefined();
    });

    it('Stage 4: Synchronization Engine (Zero-Allocation Adapters)', async () => {
        const syncManager = new SynchronizationManager({}, {});
        const telemetry = new SynchronizationTelemetry();
        const timeline = new SynchronizationTimeline();
        syncManager.setTelemetry(telemetry);
        syncManager.setTimeline(timeline);
        
        attachSyncTelemetryAdapter(syncManager);
        
        syncManager.telemetry.recordBarrier(150, true);
        syncManager.timeline.record({
            type: 'BarrierPassed',
            browserId: 'browser-1',
            satisfied: true
        });
        syncManager.telemetry.recordRecovery({
            status: 'SUCCESS',
            elapsed: 450
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const snapshot = rkp.ringBuffer.snapshot();
        
        const barrierWait = snapshot.find(f => f.type === 'Measurement' && f.metricName === 'BarrierWaitTime');
        expect(barrierWait).toBeDefined();
        expect(barrierWait.value).toBe(150);
        
        const timelineDecision = snapshot.find(f => f.type === 'Decision' && f.actionTaken === 'BarrierPassed');
        expect(timelineDecision).toBeDefined();
        
        const recoveryDecision = snapshot.find(f => f.type === 'Decision' && f.actionTaken === 'ExecuteRecovery');
        expect(recoveryDecision).toBeDefined();
    });

    it('Stage 5: Browser Runtime (Lifecycle Facts)', async () => {
        const registry = new BrowserStateRegistry({
            standbyPool: {
                acquireStandby: async () => ({ id: 'standby-01', context: {}, page: {} }),
                dispose: async () => {}
            }
        });
        
        attachBrowserLifecycleAdapter(registry);
        
        registry.register('browser-01', 'slave', {}, {}, {});
        registry.update('browser-01', { lifecycleState: 'READY', url: 'https://example.com' });
        
        await registry.failover('browser-01', 'https://example.com/retry');
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const snapshot = rkp.ringBuffer.snapshot();
        
        const stateFacts = snapshot.filter(f => f.type === 'State' && f.traceId === 'browser-browser-01');
        expect(stateFacts.length).toBeGreaterThan(0);
        
        const failoverFact = snapshot.find(f => f.type === 'Failure' && f.errorCode === 'WORKER_FAILOVER');
        expect(failoverFact).toBeDefined();
        expect(failoverFact.errorMessage).toContain('standby-01');
    });
});
