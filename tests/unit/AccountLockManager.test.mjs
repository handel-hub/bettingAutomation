import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountLockManager } from '../../src/browser/coordination/AccountLockManager.mjs';

describe('AccountLockManager', () => {
    let lockManager;

    beforeEach(() => {
        lockManager = new AccountLockManager();
        vi.useFakeTimers();
    });

    it('should acquire lock for a free account', () => {
        const result = lockManager.tryAcquire('account1', 'holder1');
        expect(result).toBe(true);
        expect(lockManager.isLocked('account1')).toBe(true);
    });

    it('should deny lock if already held by another holder', () => {
        lockManager.tryAcquire('account1', 'holder1');
        const result = lockManager.tryAcquire('account1', 'holder2');
        expect(result).toBe(false);
    });

    it('should allow re-entrant acquisition by the same holder', () => {
        lockManager.tryAcquire('account1', 'holder1');
        const result = lockManager.tryAcquire('account1', 'holder1');
        expect(result).toBe(true);
    });

    it('should release lock if holder matches', () => {
        lockManager.tryAcquire('account1', 'holder1');
        lockManager.releaseLock('account1', 'holder1');
        expect(lockManager.isLocked('account1')).toBe(false);
    });

    it('should not release lock if holder mismatches', () => {
        lockManager.tryAcquire('account1', 'holder1');
        lockManager.releaseLock('account1', 'holder2');
        expect(lockManager.isLocked('account1')).toBe(true);
    });

    it('should auto-expire lock after TTL', () => {
        lockManager.tryAcquire('account1', 'holder1');
        expect(lockManager.isLocked('account1')).toBe(true);

        // Fast forward time past 5 minutes (300,000ms)
        vi.advanceTimersByTime(300001);

        expect(lockManager.isLocked('account1')).toBe(false);
        const result = lockManager.tryAcquire('account1', 'holder2');
        expect(result).toBe(true);
    });
});
