import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocatorResolver } from '../../LocatorResolver.mjs';
import { ExecutionContext } from '../../ExecutionContext.mjs';
import { TestHarness } from './TestHarness.mjs';
import featureFlags from '../FeatureFlags.mjs';

describe('Phase 3 — Strict Command-Lifecycle Handle Memoization', () => {
    let mockPage;
    let mockCommand;
    let mockEID;
    let candidates;

    beforeEach(() => {
        featureFlags.resetForTesting({
            LI_EXTENDED_FEATURES: true,
            LI_IDENTITY_DOCUMENT: true,
            LI_SERIALIZE_FEATURES: true,
            LI_BATCH_RESOLVER: true,
            LI_VERIFICATION: false,
            V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED'
        });

        mockPage = TestHarness.createMockPage({
            template: [
                { tagName: 'BUTTON', id: 'btn', text: 'Submit', visible: true }
            ]
        });

        candidates = TestHarness.createCandidates([
            { locator: '#btn', strategy: 'css', rank: 1 }
        ]);

        mockCommand = { id: 'cmd-101', type: 'CLICK', metadata: { msn: 1 } };
        mockEID = { identityHash: 'hash-btn', tag: 'BUTTON', attributes: { id: 'btn' }, text: 'Submit' };
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('should cache successful resolution in executionContext.memoizedResolution', async () => {
        const context = new ExecutionContext(mockCommand);
        const res1 = await LocatorResolver.resolve(mockPage, candidates, 'CLICK', {}, {
            executionContext: context,
            commandId: 'cmd-101',
            sequenceGate: true,
            browserId: 'slave-1',
            identityDocument: mockEID
        });
        expect(res1.success).toBe(true);
        expect(context.memoizedResolution).toBeDefined();
        expect(context.memoizedResolution.commandId).toBe('cmd-101');
        expect(context.memoizedResolution.msn).toBe(1);
    });

    it('should return memoized resolution on second call without re-evaluating DOM', async () => {
        const context = new ExecutionContext(mockCommand);
        const evalSpy = vi.spyOn(mockPage, 'evaluate');

        await LocatorResolver.resolve(mockPage, candidates, 'CLICK', {}, {
            executionContext: context,
            commandId: 'cmd-101',
            sequenceGate: true,
            browserId: 'slave-1',
            identityDocument: mockEID
        });

        const evalCountAfterFirst = evalSpy.mock.calls.length;

        const res2 = await LocatorResolver.resolve(mockPage, candidates, 'CLICK', {}, {
            executionContext: context,
            commandId: 'cmd-101',
            sequenceGate: true,
            browserId: 'slave-1',
            identityDocument: mockEID
        });

        expect(res2.success).toBe(true);
        expect(evalSpy.mock.calls.length).toBe(evalCountAfterFirst);
    });

    it('should evict cache and re-evaluate if slave msn advances', async () => {
        const context = new ExecutionContext(mockCommand);
        const evalSpy = vi.spyOn(mockPage, 'evaluate');

        await LocatorResolver.resolve(mockPage, candidates, 'CLICK', {}, {
            executionContext: context,
            commandId: 'cmd-101',
            sequenceGate: true,
            browserId: 'slave-1',
            identityDocument: mockEID
        });

        const evalCountAfterFirst = evalSpy.mock.calls.length;
        
        context.command.metadata.msn = 2;

        await LocatorResolver.resolve(mockPage, candidates, 'CLICK', {}, {
            executionContext: context,
            commandId: 'cmd-101',
            sequenceGate: true,
            browserId: 'slave-1',
            identityDocument: mockEID
        });

        expect(evalSpy.mock.calls.length).toBeGreaterThan(evalCountAfterFirst);
        expect(context.memoizedResolution.msn).toBe(2);
    });
});
