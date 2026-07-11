import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../config.mjs';
import { CashoutWorkflow } from '../workflows/index.mjs';

export class WorkflowEngine {
    constructor(lockManager, registry) {
        this.lockManager = lockManager;
        this.registry = registry;
        
        try {
            const selectorsPath = path.resolve(process.cwd(), 'sequences', 'selectors.json');
            this.selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));
            logger.info('WorkflowEngine: Loaded selectors.json successfully.');
        } catch (err) {
            logger.error(`WorkflowEngine: Failed to load selectors.json: ${err.message}`);
            this.selectors = {};
        }

        if (!this.selectors.cashout) {
            logger.fatal('selectors.json is missing a "cashout" section — cashout workflow cannot function. Fix sequences/selectors.json before starting.');
            process.exit(1);
        }

        this.workflows = {
            'cashout': new CashoutWorkflow(this.selectors.cashout)
        };
    }

    async execute(command, targetBrowsers) {
        const workflow = this.workflows[command.type];
        
        if (!workflow) {
            logger.error(`WorkflowEngine: No workflow registered for type '${command.type}'`);
            return;
        }

        logger.info(`Executing workflow '${command.type}' on ${targetBrowsers.length} target(s)...`);

        const promises = targetBrowsers.map(async (b) => {
            try {
                await workflow.execute(b, command.payload, this.lockManager, this.registry);
            } catch (err) {
                logger.error(`WorkflowEngine: Unhandled error in '${command.type}' on [${b.id}]: ${err.message}`);
            }
        });

        await Promise.allSettled(promises);
        logger.info(`Workflow '${command.type}' execution complete.`);
    }
}
