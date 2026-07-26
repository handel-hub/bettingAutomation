import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { ExecutionScheduler } from '../../ExecutionScheduler.mjs';
import { Command } from '../../Command.mjs';
import { EpochGate } from '../resolution/EpochGate.mjs';
import featureFlags from '../FeatureFlags.mjs';

describe('Phase 5 — Task 5.3: EpochGating Integration', () => {
    beforeEach(() => {
        featureFlags.resetForTesting({V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED'});
    });

    afterEach(() => {
        featureFlags.resetForTesting();
        vi.restoreAllMocks();
    });

    it('LocatorResolver.resolve should abort immediately with LF-604 StaleEpochError if command epoch is behind slave epoch', async () => {
        const epochGate = new EpochGate();
        epochGate.incrementEpoch('slave-1', 'http://example.com/page1');
        epochGate.incrementEpoch('slave-1', 'http://example.com/page2'); // slave is at epoch 2

        const mockPage = {
            locator: vi.fn()
        };

        const candidates = [
            { locator: '#btn', strategy: 'css', rank: 1 }
        ];

        const result = await LocatorResolver.resolve(mockPage, candidates, 'click', undefined, {
            browserId: 'slave-1',
            commandEpoch: 1, // behind slave epoch 2
            epochGate
        });

        expect(result.success).toBe(false);
        expect(result.failureReason).toContain('[LF-604] StaleEpochError');
        expect(result.failureReason).toContain('is behind slave epoch');
        expect(mockPage.locator).not.toHaveBeenCalled();
    });

    it('LocatorResolver.resolve should proceed when LI_EPOCH_GATING is disabled even if epoch is mismatched', async () => {
        featureFlags.resetForTesting({ LI_EPOCH_GATING: false, V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED' });
        const epochGate = new EpochGate();
        epochGate.incrementEpoch('slave-1', 'http://example.com/page1');
        epochGate.incrementEpoch('slave-1', 'http://example.com/page2'); // slave is at epoch 2

        const mockLocator = {
            count: vi.fn().mockResolvedValue(1),
            first: vi.fn().mockReturnThis(),
            isVisible: vi.fn().mockResolvedValue(true),
            isEnabled: vi.fn().mockResolvedValue(true)
        };

        const mockPage = {
            locator: vi.fn().mockReturnValue(mockLocator)
        };

        const candidates = [
            { locator: '#btn', strategy: 'css', rank: 1 }
        ];

        const result = await LocatorResolver.resolve(mockPage, candidates, 'click', undefined, {
            browserId: 'slave-1',
            commandEpoch: 1, // mismatched, but flag is disabled
            epochGate
        });

        expect(result.success).toBe(true);
        expect(mockPage.locator).toHaveBeenCalledWith('#btn');
    });

    it('ExecutionScheduler._drain should skip stale commands via EpochGate without calling simulator.execute', async () => {
        const epochGate = new EpochGate();
        epochGate.incrementEpoch('slave-1', 'http://example.com/page1');
        epochGate.incrementEpoch('slave-1', 'http://example.com/page2'); // slave is at epoch 2

        const mockSimulator = {
            execute: vi.fn().mockResolvedValue(true),
            emit: vi.fn()
        };

        const mockRegistry = {
            get: vi.fn().mockReturnValue({ page: {} }),
            on: vi.fn()
        };

        const scheduler = new ExecutionScheduler(mockSimulator, mockRegistry, null, epochGate);

        const staleCommand = new Command({
            id: 'cmd-stale',
            type: 'CLICK',
            target: 'slave-1',
            payload: { locators: [{ locator: '#old', strategy: 'css' }] },
            metadata: {
                captureEpoch: 1 // behind slave epoch 2
            }
        });

        scheduler.enqueue({ id: 'slave-1' }, staleCommand);

        await scheduler.waitForIdle('slave-1');

        expect(mockSimulator.execute).not.toHaveBeenCalled();
        scheduler.dispose();
    });
});
