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
     */
    acquireLock(username, ttlMs = null) {
        const ttl = ttlMs ?? this.TTL_MS;
        this.locks.set(username, { timestamp: Date.now(), ttl });
        logger.info(`[LockManager] Acquired lock for account: ${username} (TTL: ${ttl}ms)`);
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
     * Releases the lock for the given username.
     * @param {string} username 
     */
    releaseLock(username) {
        if (this.locks.has(username)) {
            this.locks.delete(username);
            logger.info(`[LockManager] Released lock for account: ${username}`);
        }
    }
}
