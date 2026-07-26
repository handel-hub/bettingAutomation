import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionSimulator } from '../../ActionSimulator.mjs';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { EpochGate } from '../resolution/EpochGate.mjs';
import { BrowserStateRegistry } from '../../../synchronization/BrowserStateRegistry.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { StaleEpochError } from '../../errors.mjs';

describe('Phase 4: Slave Browser Epoch Synchronization & Execution Gating', () => {
    let simulator;
    let registry;
    let epochGate;
    let mockPage;

    beforeEach(() => {
        vi.restoreAllMocks();
        featureFlags.resetForTesting({V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED'});
        TelemetryCollector.reset();

        registry = new BrowserStateRegistry();
        epochGate = new EpochGate();
        simulator = new ActionSimulator();
        simulator.registry = registry;
        simulator.epochGate = epochGate;

        // Connect registry to epochGate just like ExecutionScheduler does
        registry.on('StateUpdated', ({ browserId, state }) => {
            if (state && state.url && state.url !== 'about:blank') {
                const rec = epochGate.getEpochRecord(browserId);
                if (rec.url !== state.url || (state.navigationEpoch !== undefined && state.navigationEpoch > rec.value)) {
                    while (epochGate.getCurrentEpoch(browserId) < (state.navigationEpoch || (rec.value + 1))) {
                        epochGate.incrementEpoch(browserId, state.url);
                    }
                }
            }
        });

        mockPage = {
            url: vi.fn().mockReturnValue('http://example.com/slave/initial'),
            isClosed: vi.fn().mockReturnValue(false),
            exposeBinding: vi.fn().mockResolvedValue(undefined),
            on: vi.fn(),
            addInitScript: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn().mockResolvedValue(undefined),
            mouse: {
                move: vi.fn().mockResolvedValue(undefined),
                down: vi.fn().mockResolvedValue(undefined),
                up: vi.fn().mockResolvedValue(undefined),
                wheel: vi.fn().mockResolvedValue(undefined)
            },
            keyboard: {
                press: vi.fn().mockResolvedValue(undefined)
            }
        };

        // Initialize registry state for slave
        const slaveState = registry.getState('slave-1');
        slaveState.url = 'http://example.com/slave/initial';
        slaveState.navigationEpoch = 1;
        epochGate.epochs.set('slave-1', { value: 1, url: 'http://example.com/slave/initial', timestamp: Date.now() });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('T12 & T13: attachSlave should expose __notifySlaveNavigation binding, register framenavigated, and inject script', async () => {
        const browserObj = { id: 'slave-1', page: mockPage };
        await simulator.attachSlave(browserObj);

        expect(mockPage.exposeBinding).toHaveBeenCalledWith('__notifySlaveNavigation', expect.any(Function));
        expect(mockPage.on).toHaveBeenCalledWith('framenavigated', expect.any(Function));
        expect(mockPage.addInitScript).toHaveBeenCalledTimes(1);
        expect(mockPage.evaluate).toHaveBeenCalledTimes(1);

        // Verify idempotency via WeakSet
        await simulator.attachSlave(browserObj);
        expect(mockPage.exposeBinding).toHaveBeenCalledTimes(1);
    });

    it('T12 & T13: Navigation bindings and events should advance slave epoch and ignore subframes', async () => {
        const browserObj = { id: 'slave-1', page: mockPage };
        await simulator.attachSlave(browserObj);

        const bindingHandler = mockPage.exposeBinding.mock.calls.find(call => call[0] === '__notifySlaveNavigation')[1];
        const frameNavHandler = mockPage.on.mock.calls.find(call => call[0] === 'framenavigated')[1];

        const initialEpoch = epochGate.getCurrentEpoch('slave-1');
        expect(initialEpoch).toBe(1);

        // 1. Simulate subframe navigation (should be ignored)
        const subFrame = { parentFrame: () => ({ id: 'main' }), url: () => 'http://example.com/widget' };
        await bindingHandler({ frame: subFrame }, { type: 'pushState', url: 'http://example.com/widget' });
        frameNavHandler(subFrame);
        expect(epochGate.getCurrentEpoch('slave-1')).toBe(1);

        // 2. Simulate main frame SPA navigation
        const mainFrame = { parentFrame: () => null, url: () => 'http://example.com/slave/page2' };
        await bindingHandler({ frame: mainFrame }, { type: 'pushState', url: 'http://example.com/slave/page2' });
        expect(epochGate.getCurrentEpoch('slave-1')).toBe(2);
        expect(registry.getState('slave-1').navigationEpoch).toBe(2);

        // 3. Simulate main frame traditional navigation
        const mainFrame2 = { parentFrame: () => null, url: () => 'http://example.com/slave/page3' };
        frameNavHandler(mainFrame2);
        expect(epochGate.getCurrentEpoch('slave-1')).toBe(3);
        expect(registry.getState('slave-1').navigationEpoch).toBe(3);

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.epochSync.proceeded).toBeGreaterThanOrEqual(0);
    });

    it('T14: Pre-Execution Epoch Verification should proceed when command epoch matches slave epoch', async () => {
        const browserObj = { id: 'slave-1', page: mockPage };
        const command = {
            id: 'cmd-100',
            type: 'HOVER',
            payload: { coordinates: { x: 10, y: 20 } },
            metadata: { captureEpoch: 1 }
        };

        const result = await simulator.execute(browserObj, command);
        expect(result).toBe(true);
        expect(mockPage.mouse.move).toHaveBeenCalledWith(10, 20);
    });

    it('T14: Pre-Execution Epoch Verification should abort with StaleEpochError [LF-604] when command epoch is stale', async () => {
        const browserObj = { id: 'slave-1', page: mockPage };
        // Advance slave epoch to 3
        epochGate.epochs.set('slave-1', { value: 3, url: 'http://example.com/slave/page3', timestamp: Date.now() });

        const command = {
            id: 'cmd-stale',
            type: 'HOVER',
            payload: { coordinates: { x: 10, y: 20 } },
            metadata: { captureEpoch: 1 } // Stale! 1 < 3
        };

        const failureSpy = vi.fn();
        simulator.on('ActionFailure', failureSpy);

        const result = await simulator.execute(browserObj, command);
        expect(result).toBe(false);
        expect(mockPage.mouse.move).not.toHaveBeenCalled();

        expect(failureSpy).toHaveBeenCalledTimes(1);
        const err = failureSpy.mock.calls[0][0].error;
        expect(err).toBeInstanceOf(StaleEpochError);
        expect(err.message).toContain('[LF-604]');
        expect(err.message).toContain('is behind slave epoch');

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.execution.epochSkips).toBe(1);
        expect(snapshot.epochSync.mismatchDetected).toBe(1);
        expect(snapshot.epochSync.skippedStale).toBe(1);
    });

    it('T15: Pre-Resolution Epoch Check in LocatorResolver should abort resolution immediately if command epoch is stale', async () => {
        const candidates = [{ locator: '#btn', strategy: 'css', rank: 1 }];
        epochGate.epochs.set('slave-1', { value: 5, url: 'http://example.com/slave/page5', timestamp: Date.now() });

        const result = await LocatorResolver.resolve(mockPage, candidates, 'click', undefined, {
            browserId: 'slave-1',
            commandEpoch: 2, // Stale! 2 < 5
            epochGate
        });

        expect(result.success).toBe(false);
        expect(result.failureReason).toContain('[LF-604]');
        expect(result.failureReason).toContain('StaleEpochError');
        expect(result.resolutionCycles).toBe(0);

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.execution.epochSkips).toBeGreaterThanOrEqual(1);
    });

    it('Observability: EpochGate decisions should record accurate metrics in TelemetryCollector', () => {
        const dec1 = epochGate.evaluate('slave-1', 1); // Proceed
        expect(dec1.decision).toBe('PROCEED');

        epochGate.epochs.set('slave-1', { value: 2, url: 'http://example.com/slave/page2', timestamp: Date.now() });
        const dec2 = epochGate.evaluate('slave-1', 1); // Skip (mismatch)
        expect(dec2.decision).toBe('SKIP');

        const snapshot = TelemetryCollector.snapshot();
        expect(snapshot.epochSync.proceeded).toBe(1);
        expect(snapshot.epochSync.mismatchDetected).toBe(1);
        expect(snapshot.epochSync.skippedStale).toBe(1);
    });
});
