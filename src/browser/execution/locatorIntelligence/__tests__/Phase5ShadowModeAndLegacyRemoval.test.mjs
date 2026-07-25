import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionDispatcher } from '../../ActionDispatcher.mjs';
import { EpochGate } from '../resolution/EpochGate.mjs';
import { BrowserStateRegistry } from '../../../synchronization/BrowserStateRegistry.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { logger } from '../../../../config.mjs';

describe('Phase 5: Final Cutover & Legacy Removal (Client Epoch Permanence & Deadlock Elimination)', () => {
    let dispatcher;
    let registry;
    let epochGate;
    let mockMasterPage;
    let warnSpy;
    let emittedCommands;

    beforeEach(() => {
        vi.restoreAllMocks();
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        featureFlags.resetForTesting({ LI_EPOCH_GATING: true });
        TelemetryCollector.reset();

        registry = new BrowserStateRegistry();
        epochGate = new EpochGate();
        dispatcher = new ActionDispatcher({}, registry);
        emittedCommands = [];
        dispatcher.on('Command', (cmd) => emittedCommands.push(cmd));

        mockMasterPage = {
            url: vi.fn().mockReturnValue('http://example.com/master/page3'),
            isClosed: vi.fn().mockReturnValue(false),
            addInitScript: vi.fn().mockResolvedValue(undefined),
            evaluate: vi.fn().mockResolvedValue(undefined),
            exposeFunction: vi.fn().mockResolvedValue(undefined),
            exposeBinding: vi.fn().mockResolvedValue(undefined),
            on: vi.fn(),
            parentFrame: vi.fn().mockReturnValue(null)
        };

        const masterState = registry.getState('master');
        masterState.url = 'http://example.com/master/page3';
        masterState.navigationEpoch = 3;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('T18: Should permanently use client-asserted captureEpoch when present in payload', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);
        const bindingCall = mockMasterPage.exposeBinding.mock.calls.find(call => call[0] === 'dispatchExecutionEvent');
        const dispatchExecutionEvent = bindingCall[1];

        // Simulate interaction with client-asserted epoch 2, while server masterState is at epoch 3
        const eventData = {
            type: 'CLICK',
            tag: 'button',
            id: 'btn-submit',
            class: 'primary',
            selector: '#btn-submit',
            payload: {
                interactionId: 'int-001',
                captureEpoch: 2, // Client epoch is 2
                captureTime: Date.now() - 15
            }
        };

        await dispatchExecutionEvent({ frame: mockMasterPage }, eventData);

        // Verify command queue received command with client epoch 2
        const command = emittedCommands.shift();
        expect(command).toBeDefined();
        expect(command.metadata.captureEpoch).toBe(2);
        expect(command.metadata.navigation.epoch).toBe(2);
    });

    it('T18: Should assign epoch 0 when payload lacks captureEpoch (disabling epoch gating for legacy v2 payloads)', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);
        const bindingCall = mockMasterPage.exposeBinding.mock.calls.find(call => call[0] === 'dispatchExecutionEvent');
        const dispatchExecutionEvent = bindingCall[1];

        const eventData = {
            type: 'HOVER',
            tag: 'div',
            id: 'menu',
            class: '',
            selector: '#menu',
            payload: {
                interactionId: 'int-003'
                // No captureEpoch provided (legacy v2 payload)
            }
        };

        await dispatchExecutionEvent({ frame: mockMasterPage }, eventData);

        const command = emittedCommands.shift();
        expect(command.metadata.captureEpoch).toBe(0); // Default to 0 for legacy payloads
    });

    it('T15 & T18: Deadlock Elimination - Navigation-triggering click must not be blocked by its own epoch', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);
        const bindingCall = mockMasterPage.exposeBinding.mock.calls.find(call => call[0] === 'dispatchExecutionEvent');
        const dispatchExecutionEvent = bindingCall[1];

        // 1. Setup slave browser at epoch 3
        epochGate.epochs.set('slave-1', { value: 3, url: 'http://example.com/slave/page3', timestamp: Date.now() });

        // 2. User clicks a button on master during epoch 3. The click initiates a navigation.
        // In the browser, __ANTIGRAVITY_EPOCH__ was 3 when the click event occurred.
        const clickEvent = {
            type: 'CLICK',
            tag: 'a',
            id: 'nav-link',
            class: '',
            selector: '#nav-link',
            payload: {
                interactionId: 'int-nav-click',
                captureEpoch: 3
            }
        };

        // 3. While IPC is in flight, the navigation completes on master, advancing server epoch to 4!
        const masterState = registry.getState('master');
        masterState.navigationEpoch = 4;

        // 4. ActionDispatcher receives the click IPC payload after server epoch became 4.
        await dispatchExecutionEvent({ frame: mockMasterPage }, clickEvent);
        const command = emittedCommands.shift();

        // 5. In legacy system (server-assigned), command would receive epoch 4.
        // In new cutover system, command permanently receives client epoch 3!
        expect(command.metadata.captureEpoch).toBe(3);

        // 6. When Scheduler evaluates command against slave-1 (at epoch 3), EpochGate returns PROCEED!
        const decision = await epochGate.evaluateAsync('slave-1', command.metadata.captureEpoch, 1000);
        expect(decision.decision).toBe('PROCEED');
        expect(decision.reason).toContain('match');
    });
});
