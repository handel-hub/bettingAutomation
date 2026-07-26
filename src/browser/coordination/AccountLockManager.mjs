import { logger } from '../../config.mjs';

export class AccountLockManager {
    constructor(options = {}) {
        // Map of username -> { timestamp, ttl }
        this.locks = new Map();
        this.TTL_MS = options.ttlMs ?? 30000; // default 30 seconds
    }

    /**
     * Acquires a lock for the given username.
     * @param {string} username 
     * @param {string|null} [holder=null]
     * @param {number|null} [ttlMs=null]
     */
    acquireLock(username, holder = null, ttlMs = null) {
        const ttl = ttlMs ?? this.TTL_MS;
        this.locks.set(username, { holder, timestamp: Date.now(), ttl });
        logger.info(`[LockManager] Acquired lock for account: ${username} by ${holder} (TTL: ${ttl}ms)`);
    }

    /**
     * Atomically checks and acquires the lock if available or re-entrant by same holder.
     * @param {string} username 
     * @param {string|null} [holder=null]
     * @param {number|null} [ttlMs=null]
     * @returns {boolean} True if lock acquired or re-entered, false if already locked by someone else.
     */
    tryAcquireLock(username, holder = null, ttlMs = null) {
        if (this.isLocked(username)) {
            const lock = this.locks.get(username);
            if (holder !== null && lock && lock.holder === holder) {
                lock.timestamp = Date.now();
                return true;
            }
            return false;
        }
        this.acquireLock(username, holder, ttlMs);
        return true;
    }

    tryAcquire(username, holder = null, ttlMs = null) {
        return this.tryAcquireLock(username, holder, ttlMs);
    }

    /**
     * Checks if the username is currently locked. Auto-expires stale locks.
     * @param {string} username 
     * @returns {boolean}
     */
    isLocked(username) {
        if (!this.locks.has(username)) return false;

        const lock = this.locks.get(username);
        if (Date.now() - lock.timestamp > lock.ttl) {
            logger.warn(`[LockManager] Lock for ${username} exceeded TTL (${lock.ttl}ms). Auto-releasing stale lock.`);
            this.locks.delete(username);
            return false;
        }

        return true;
    }

    /**
     * Refreshes an existing lock for the given username.
     * @param {string} username 
     */
    refreshLock(username) {
        if (this.locks.has(username)) {
            const lock = this.locks.get(username);
            lock.timestamp = Date.now();
        }
    }

    /**
     * Releases the lock for the given username if holder matches or no holder specified.
     * @param {string} username 
     * @param {string|null} [holder=null]
     */
    releaseLock(username, holder = null) {
        if (this.locks.has(username)) {
            const lock = this.locks.get(username);
            if (holder !== null && lock.holder !== null && lock.holder !== holder) {
                logger.warn(`[LockManager] Denied release of lock ${username} by mismatched holder ${holder} (owner: ${lock.holder})`);
                return false;
            }
            this.locks.delete(username);
            logger.info(`[LockManager] Released lock for account: ${username}`);
            return true;
        }
        return false;
    }

    release(username, holder = null) {
        return this.releaseLock(username, holder);
    }
}
