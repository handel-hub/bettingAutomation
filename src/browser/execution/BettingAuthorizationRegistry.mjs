import { logger } from '../../utils/logger.mjs';
import { forensicLogger } from '../forensics/ForensicLogger.mjs';

/**
 * BettingAuthorizationRegistry
 * 
 * Strictly manages which accounts/browsers are currently authorized to begin NEW betting transactions.
 * This is conceptually distinct from execution ownership or browser lifecycle state.
 */
export class BettingAuthorizationRegistry {
    constructor() {
        // Map<browserId, boolean>
        this.permissions = new Map();
    }

    /**
     * Set betting authorization for a specific browser.
     * @param {string} browserId 
     * @param {boolean} isEnabled 
     */
    setAuthorization(browserId, isEnabled) {
        const previous = this.permissions.get(browserId);
        this.permissions.set(browserId, isEnabled);
        
        if (previous !== isEnabled) {
            forensicLogger.log('BETTING_AUTHORIZATION_CHANGED', { 
                browserId, 
                previousState: previous === undefined ? 'UNKNOWN' : (previous ? 'ENABLED' : 'DISABLED'),
                newState: isEnabled ? 'ENABLED' : 'DISABLED'
            });
            logger.info(`[BettingAuthorizationRegistry] Browser [${browserId}] betting authorization set to: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
        }
    }

    /**
     * Explicitly enable a browser.
     * @param {string} browserId 
     */
    enable(browserId) {
        this.setAuthorization(browserId, true);
    }

    /**
     * Explicitly disable a browser.
     * @param {string} browserId 
     */
    disable(browserId) {
        this.setAuthorization(browserId, false);
    }

    /**
     * Check if a browser is authorized to begin a new betting transaction.
     * Fails closed (returns false) if the state is unknown, ensuring absolute safety.
     * @param {string} browserId 
     * @returns {boolean}
     */
    isAuthorized(browserId) {
        const authorized = this.permissions.get(browserId);
        if (authorized === undefined) {
            // Fail closed: Unknown state means DENY.
            return false;
        }
        return authorized;
    }
}
