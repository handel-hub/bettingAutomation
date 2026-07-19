import EventEmitter from 'node:events';
import { CapabilityRegistry } from '../CapabilityRegistry.mjs';
import { Command } from '../../execution/Command.mjs';

export class RecoveryActionExecutor extends EventEmitter {
    constructor() {
        super();
    }

    async execute(plan, syncContext) {
        const { strategy, targets } = plan;
        
        switch (strategy) {
            case 'SOFT_RESET':
            case 'HARD_RESET':
            case 'DEPENDENCY_CASCADE':
                for (const target of targets) {
                    const provider = CapabilityRegistry.getProvider(target);
                    if (provider) {
                        await provider.invalidate(syncContext);
                    }
                }
                break;
            case 'PAGE_RELOAD':
                this.emit('Command', new Command({
                    category: 'Navigation',
                    type: 'PAGE_RELOAD',
                    target: syncContext.browserId,
                    source: 'RecoveryActionExecutor'
                }));
                break;
            case 'BROWSER_RESTART':
                this.emit('Command', new Command({
                    category: 'Recovery',
                    type: 'HEAL_REQUESTED',
                    target: syncContext.browserId,
                    source: 'RecoveryActionExecutor'
                }));
                break;
            default:
                break;
        }
    }
}
