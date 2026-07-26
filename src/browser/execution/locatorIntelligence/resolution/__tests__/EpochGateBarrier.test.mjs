import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EpochGate } from '../EpochGate.mjs';
import { ExecutionScheduler } from '../../../ExecutionScheduler.mjs';
import { Command } from '../../../Command.mjs';
import { StaleEpochError } from '../../../errors.mjs';
import featureFlags from '../../FeatureFlags.mjs';
import { TelemetryCollector } from '../../telemetry/TelemetryCollector.mjs';

describe('Milestone 4: Atomic Navigation Epoch Synchronization & Barrier Gating', () => {
    let epochGate;

    beforeEach(() => {
        epochGate = new EpochGate();
        featureFlags.resetForTesting({ LI_EPOCH_GATING: true });
    });

    afterEach(() => {
        featureFlags.resetForTesting({ LI_EPOCH_GATING: false });
        vi.restoreAllMocks();
    });

    it('returns BUFFER_COMMAND / WAIT when command epoch is ahead of slave epoch and sets gated state', () => {
        epochGate.onPhysicalNavComplete('slave-1', 1, 'http://example.com/page1');
        expect(epochGate.isGated('slave-1')).toBe(false);

        const decision = epochGate.evaluate('slave-1', 2);
        expect(decision.decision).toBe('WAIT');
        expect(decision.action).toBe('BUFFER_COMMAND');
        expect(epochGate.isGated('slave-1')).toBe(true);
    });

    it('returns PURGE_STALE / SKIP with LF-604 when command epoch is behind slave epoch', () => {
        epochGate.onPhysicalNavComplete('slave-1', 5, 'http://example.com/page5');
        
        const recordSpy = vi.spyOn(TelemetryCollector, 'recordEpochMismatch').mockImplementation(() => {});
        const decision = epochGate.evaluate('slave-1', 3);
        
        expect(decision.decision).toBe('SKIP');
        expect(decision.action).toBe('PURGE_STALE');
        expect(decision.errorCode).toBe('LF-604');
        expect(recordSpy).toHaveBeenCalledWith(3, 5);
    });

    it('onPhysicalNavComplete stamps epoch, clears gated state, and emits ACK_epoch', () => {
        const ackSpy = vi.fn();
        const changedSpy = vi.fn();
        epochGate.on('ACK_epoch', ackSpy);
        epochGate.on('EpochChanged', changedSpy);

        // Put into gated state first
        epochGate.evaluate('slave-2', 3);
        expect(epochGate.isGated('slave-2')).toBe(true);

        const result = epochGate.onPhysicalNavComplete('slave-2', 3, 'http://example.com/page3');
        expect(result.decision).toBe('PROCEED');
        expect(result.action).toBe('UNLOCK_EXECUTION');
        expect(epochGate.isGated('slave-2')).toBe(false);
        expect(ackSpy).toHaveBeenCalledWith({ browserId: 'slave-2', epoch: 3, url: 'http://example.com/page3' });
        expect(changedSpy).toHaveBeenCalledWith({ browserId: 'slave-2', epoch: 3, url: 'http://example.com/page3' });
    });

    it('event-driven waitForEpochAlignment unblocks immediately upon physical nav completion', async () => {
        epochGate.onPhysicalNavComplete('slave-3', 1, 'http://example.com/page1');
        
        const waitPromise = epochGate.waitForEpochAlignment('slave-3', 2, 2000);
        
        // Simulate physical nav completing in 20ms
        setTimeout(() => {
            epochGate.onPhysicalNavComplete('slave-3', 2, 'http://example.com/page2');
        }, 20);

        const start = Date.now();
        const result = await waitPromise;
        const duration = Date.now() - start;

        expect(result.decision).toBe('PROCEED');
        expect(result.action).toBe('UNLOCK_EXECUTION');
        expect(duration).toBeLessThan(500); // Fast event-driven resolution
    });

    it('ExecutionScheduler purges stale commands with LF-604 and emits ActionFailure', async () => {
        const mockSimulator = {
            emit: vi.fn(),
            epochGate
        };
        const mockRegistry = {
            get: vi.fn().mockReturnValue({ page: { url: () => 'http://example.com/page5' } }),
            on: vi.fn()
        };
        const mockSyncManager = {};

        const scheduler = new ExecutionScheduler(mockSimulator, mockRegistry, mockSyncManager, epochGate);
        epochGate.onPhysicalNavComplete('slave-4', 5, 'http://example.com/page5');

        const staleCommand = new Command({
            id: 'cmd-stale',
            type: 'CLICK',
            target: '#btn',
            metadata: {
                captureEpoch: 2
            }
        });

        // Enqueue command with captureEpoch 2 against slave at epoch 5
        scheduler.enqueue({ id: 'slave-4' }, staleCommand);

        // Allow async drain to process
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockSimulator.emit).toHaveBeenCalledWith('ActionFailure', expect.objectContaining({
            id: 'slave-4',
            command: expect.objectContaining({ id: 'cmd-stale' }),
            error: expect.any(StaleEpochError)
        }));
        const emittedError = mockSimulator.emit.mock.calls[0][1].error;
        expect(emittedError.code).toBe('LF-604');

        scheduler.dispose();
    });
});
