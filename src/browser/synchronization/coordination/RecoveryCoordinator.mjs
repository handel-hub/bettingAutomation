import { RecoveryPlan } from './RecoveryPlan.mjs';
import { logger } from '../../../utils/logger.mjs';
import { Capabilities } from '../capabilities.mjs';

export class RecoveryCoordinator {
    constructor(registry) {
        this.registry = registry;
    }

    async recover(snapshot, failedCapability) {
        let attempts = (snapshot.recoveryState.attempts || 0) + 1;
        this.registry.update(snapshot.browserId, {
            recoveryState: { attempts, lastRecovery: Date.now() }
        });

        const isScroll = failedCapability === Capabilities.SCROLL_READY || failedCapability === 'SCROLL_READY';

        let strategy = 'SOFT_RESET';
        let escalateTo = 'HARD_RESET';
        
        if (snapshot.consistency < 30 && !isScroll) {
            strategy = 'BROWSER_RESTART';
            escalateTo = null;
        } else if (attempts === 2) {
            strategy = 'HARD_RESET';
            escalateTo = 'DEPENDENCY_CASCADE';
        } else if (attempts === 3) {
            strategy = 'DEPENDENCY_CASCADE';
            escalateTo = isScroll ? null : 'PAGE_RELOAD';
        } else if (attempts === 4) {
            if (isScroll) {
                strategy = 'DEPENDENCY_CASCADE';
                escalateTo = null;
            } else {
                strategy = 'PAGE_RELOAD';
                escalateTo = 'BROWSER_RESTART';
            }
        } else if (attempts >= 5) {
            if (isScroll) {
                strategy = 'DEPENDENCY_CASCADE';
                escalateTo = null;
            } else {
                strategy = 'BROWSER_RESTART';
                escalateTo = null;
            }
        }

        logger.info(`[Telemetry] {"event":"RECOVERY_STRATEGY_SELECTED","attempts":${attempts},"strategy":"${strategy}","consistencyScore":${snapshot.consistency}}`);
        logger.info(`[Telemetry] {"event":"SYNC_ESCALATION","browserId":"${snapshot.browserId}","strategy":"${strategy}","attempt":${attempts},"consistency":${snapshot.consistency}}`);

        return new RecoveryPlan({
            strategy,
            targets: [failedCapability],
            reason: `Capability ${failedCapability} failed. Attempt: ${attempts}`,
            maxAttempts: 5,
            escalateTo
        });
    }
}
