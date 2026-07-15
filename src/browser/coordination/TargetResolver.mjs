export class TargetResolver {
    constructor(registry, lockManager) {
        this.registry = registry;
        this.lockManager = lockManager;
    }

    resolve(command, logger) {
        const mode = command.executionMode;
        let targets = [];
        
        switch (mode) {
            case 'SLAVES_ONLY':
                targets = this.registry.getReadySlaves();
                break;
            case 'MASTER_ONLY': {
                const master = this.registry.getMaster();
                targets = master ? [master] : [];
                break;
            }
            case 'SPECIFIC': {
                const browserObj = this.registry.get(command.target);
                targets = browserObj ? [browserObj] : [];
                break;
            }
            case 'BROADCAST':
                targets = this.registry.getAll();
                break;
            default:
                targets = [];
        }

        if (this.lockManager) {
            targets = targets.filter(b => {
                if (b.username && this.lockManager.isLocked(b.username)) {
                    if (logger) logger.warn(`Dropping target [${b.id}] because account ${b.username} is locked.`);
                    return false;
                }
                return true;
            });
        }

        return targets;
    }
}
