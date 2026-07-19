import { RecoveryPlan } from './RecoveryPlan.mjs';
import { BrowserStateRegistry } from '../BrowserStateRegistry.mjs';

export class RecoveryCoordinator {
    async recover(snapshot, failedCapability) {
        let attempts = (snapshot.recoveryState.attempts || 0) + 1;
        BrowserStateRegistry.update(snapshot.browserId, {
            recoveryState: { attempts, lastRecovery: Date.now() }
        });

        let strategy = 'SOFT_RESET';
        let escalateTo = 'HARD_RESET';
        
        if (snapshot.consistency < 30) {
            strategy = 'BROWSER_RESTART';
            escalateTo = null;
        } else if (attempts === 2) {
            strategy = 'HARD_RESET';
            escalateTo = 'DEPENDENCY_CASCADE';
        } else if (attempts === 3) {
            strategy = 'DEPENDENCY_CASCADE';
            escalateTo = 'PAGE_RELOAD';
        } else if (attempts === 4) {
            strategy = 'PAGE_RELOAD';
            escalateTo = 'BROWSER_RESTART';
        } else if (attempts >= 5) {
            strategy = 'BROWSER_RESTART';
            escalateTo = null;
        }

        return new RecoveryPlan({
            strategy,
            targets: [failedCapability],
            reason: `Capability ${failedCapability} failed. Attempt: ${attempts}`,
            maxAttempts: 5,
            escalateTo
        });
    }
}
