import EventEmitter from 'node:events';
import { logger } from '../../../config.mjs';
import featureFlags from '../../execution/locatorIntelligence/FeatureFlags.mjs';

export class CDPMutex extends EventEmitter {
    constructor() {
        super();
        this.locks = new Map(); // Map<browserId, { timeoutId, context, onTargetClosed }>
        this.TTL_MS = 5000;
    }

    /**
     * Attempts to acquire a recovery lock for the given browser ID.
     * Binds to the context's 'close' event for eager lock release.
     * @param {string} browserId - The ID of the browser/worker.
     * @param {Object} context - The Playwright context object.
     * @returns {boolean} True if the lock was successfully acquired, false if it is already locked.
     */
    async acquireRecoveryLock(browserId, context) {
        if (!featureFlags.isEnabled('FLAG_ENABLE_CDP_MUTEX')) {
            return true;
        }

        if (this.locks.has(browserId)) {
            logger.debug(`[CDPMutex] Lock acquisition rejected (already locked): ${browserId}`);
            return false;
        }

        const onTargetClosed = () => {
            logger.warn(`[CDPMutex] TargetClosedError detected on ${browserId}, eagerly releasing lock`);
            this.releaseRecoveryLock(browserId);
        };

        if (context && typeof context.on === 'function') {
            context.on('close', onTargetClosed);
        }

        const timeoutId = setTimeout(() => {
            logger.warn(`[CDPMutex] TTL expired for ${browserId}, releasing lock to prevent deadlock`);
            this.releaseRecoveryLock(browserId);
        }, this.TTL_MS);

        this.locks.set(browserId, {
            timeoutId,
            context,
            onTargetClosed
        });

        logger.info(`[CDPMutex] Recovery lock acquired for ${browserId}`);
        return true;
    }

    /**
     * Releases the recovery lock for the given browser ID.
     * @param {string} browserId - The ID of the browser/worker.
     */
    releaseRecoveryLock(browserId) {
        const lock = this.locks.get(browserId);
        if (lock) {
            clearTimeout(lock.timeoutId);
            
            if (lock.context && typeof lock.context.off === 'function') {
                lock.context.off('close', lock.onTargetClosed);
            } else if (lock.context && typeof lock.context.removeListener === 'function') {
                lock.context.removeListener('close', lock.onTargetClosed);
            }
            
            this.locks.delete(browserId);
            logger.info(`[CDPMutex] Recovery lock released for ${browserId}`);
            this.emit('RecoveryLockReleased', { browserId });
        }
    }
}
