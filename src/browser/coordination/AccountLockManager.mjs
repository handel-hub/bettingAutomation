import { logger } from '../../config.mjs';

export class AccountLockManager {
    constructor() {
        // Map of username -> timestamp
        this.locks = new Map();
        this.TTL_MS = 30000; // 30 seconds
    }

    /**
     * Acquires a lock for the given username.
     * @param {string} username 
     */
    acquireLock(username) {
        this.locks.set(username, Date.now());
        logger.info(`[LockManager] Acquired lock for account: ${username}`);
    }

    /**
     * Checks if the username is currently locked. Auto-expires stale locks.
     * @param {string} username 
     * @returns {boolean}
     */
    isLocked(username) {
        if (!this.locks.has(username)) return false;

        const timestamp = this.locks.get(username);
        if (Date.now() - timestamp > this.TTL_MS) {
            logger.warn(`[LockManager] Lock for ${username} exceeded TTL. Auto-releasing stale lock.`);
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
            this.locks.set(username, Date.now());
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
