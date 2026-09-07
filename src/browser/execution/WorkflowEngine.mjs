import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { logger } from '../../utils/logger.mjs';
import { AutomationRun } from '../workflows/AutomationRun.mjs';
import { SportyBetAdapter } from '../adapters/sportybet/SportyBetAdapter.mjs';

export class WorkflowEngine {
    constructor({ lockManager, registry, policyManager, simulator, runOrchestrator, bettingAuthorizationRegistry }) {
        this.lockManager = lockManager;
        this.registry = registry;
        this.policyManager = policyManager;
        this.simulator = simulator;
        this.runOrchestrator = runOrchestrator;
        this.bettingAuthorizationRegistry = bettingAuthorizationRegistry;
        
        try {
            const selectorsPath = path.resolve(__dirname, '..', '..', '..', 'sequences', 'selectors.json');
            this.selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));
            logger.info('WorkflowEngine: Loaded selectors.json successfully.');
        } catch (err) {
            logger.error(`WorkflowEngine: Failed to load selectors.json: ${err.message}`);
            this.selectors = {};
        }

        // Keep active runs mapped by their RunId
        this.activeRuns = new Map();
    }

    async execute(command, targetBrowsers) {
        if (command.type !== 'placebet') {
            logger.error(`WorkflowEngine: Unsupported workflow type '${command.type}'`);
            return;
        }

        logger.info(`[WorkflowEngine] Starting AutomationRun on ${targetBrowsers.length} target(s)...`);

        const promises = targetBrowsers.map(async (b) => {
            let runId;
            if (this.runOrchestrator) {
                const existingRun = this.runOrchestrator.activeRuns.get(b.id);
                if (existingRun) {
                    runId = existingRun.runId;
                } else {
                    const lease = this.runOrchestrator.acquireOwnership(b.id, command.source || 'WORKFLOW');
                    if (!lease) {
                        logger.warn(`[WorkflowEngine] Skipping [${b.id}]: could not acquire execution ownership.`);
                        return;
                    }
                    runId = lease.runId;
                }
            } else {
                runId = command.runId;
            }

            if (!runId) {
                logger.error(`[WorkflowEngine] Cannot execute placebet on [${b.id}] without a valid runId.`);
                return;
            }

            try {
                this.registry.updateState(b.id, 'Busy');
                
                // AutomationRun instantiated per-target
                const adapter = new SportyBetAdapter();
                const run = new AutomationRun(
                    runId,
                    b.id,
                    this.policyManager,
                    adapter,
                    this.simulator,
                    this.runOrchestrator,
                    this.bettingAuthorizationRegistry
                );

                this.activeRuns.set(b.id, run);

                // Start the run execution loop
                const result = await run.start(b);
                
                logger.info(`[WorkflowEngine] AutomationRun [${runId}] on [${b.id}] terminated with status: ${result.status} after ${result.cycles} cycles.`);
                
                if (this.runOrchestrator) {
                    if (result.status === 'UNCERTAIN') {
                        // Phase 6: Handoff to Reconciliation
                        // Do NOT release ownership. The account must remain locked.
                        this.runOrchestrator.markUncertain(b.id);
                    } else {
                        // Status is COMPLETED or ABORTED
                        this.runOrchestrator.releaseOwnership(b.id, result.status);
                    }
                }

            } catch (err) {
                logger.error(`[WorkflowEngine] Unhandled error in AutomationRun [${runId}] on [${b.id}]: ${err.message}`);
                // On total crash, default to uncertain to prevent double-spending
                if (this.runOrchestrator) {
                    this.runOrchestrator.markUncertain(b.id);
                }
            } finally {
                this.activeRuns.delete(b.id);
                
                const currentState = this.registry.get(b.id);
                if (currentState && currentState.state === 'Busy') {
                    this.registry.updateState(b.id, 'Ready');
                }
            }
        });

        await Promise.allSettled(promises);
    }
}
