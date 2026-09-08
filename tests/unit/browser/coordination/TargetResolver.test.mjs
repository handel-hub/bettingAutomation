import { describe, it, expect } from 'vitest';
import { TargetResolver } from '../../../../src/browser/coordination/TargetResolver.mjs';

describe('TargetResolver', () => {
    const mockRegistry = {
        getReadySlaves: () => [{ id: 'slave-1' }, { id: 'slave-2' }],
        getMaster: () => ({ id: 'master' }),
        getAll: () => [{ id: 'master' }, { id: 'slave-1' }, { id: 'slave-2' }],
        get: (target) => target === 'slave-1' ? { id: 'slave-1' } : null
    };

    it('resolves mode ALL to ready slaves', () => {
        const resolver = new TargetResolver(mockRegistry, null);
        const targets = resolver.resolve({ executionMode: 'ALL' });
        expect(targets).toEqual([{ id: 'slave-1' }, { id: 'slave-2' }]);
    });

    it('resolves mode SLAVES_ONLY to ready slaves', () => {
        const resolver = new TargetResolver(mockRegistry, null);
        const targets = resolver.resolve({ executionMode: 'SLAVES_ONLY' });
        expect(targets).toEqual([{ id: 'slave-1' }, { id: 'slave-2' }]);
    });

    it('resolves mode MASTER_ONLY to master', () => {
        const resolver = new TargetResolver(mockRegistry, null);
        const targets = resolver.resolve({ executionMode: 'MASTER_ONLY' });
        expect(targets).toEqual([{ id: 'master' }]);
    });

    it('resolves mode SPECIFIC to target browser', () => {
        const resolver = new TargetResolver(mockRegistry, null);
        const targets = resolver.resolve({ executionMode: 'SPECIFIC', target: 'slave-1' });
        expect(targets).toEqual([{ id: 'slave-1' }]);
    });

    it('resolves mode BROADCAST to all browsers', () => {
        const resolver = new TargetResolver(mockRegistry, null);
        const targets = resolver.resolve({ executionMode: 'BROADCAST' });
        expect(targets).toEqual([{ id: 'master' }, { id: 'slave-1' }, { id: 'slave-2' }]);
    });
});
