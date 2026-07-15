import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../config.mjs';
import { Command } from './Command.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MacroEngine {
    constructor(simulator, scheduler) {
        this.simulator = simulator;
        this.scheduler = scheduler;
        this.sequencesDir = path.join(__dirname, '..', '..', '..', 'sequences');
    }

    async loadSequence(name) {
        const safeName = path.basename(name);
        const fileName = (safeName.startsWith('seq_') || safeName === 'startup') ? `${safeName}.json` : `seq_${safeName}.json`;
        const seqFile = path.join(this.sequencesDir, fileName);
        try {
            const rawSequence = JSON.parse(await fsPromises.readFile(seqFile, 'utf-8'));
            return rawSequence.map(action => new Command({
                category: 'Execution',
                type: action.type,
                payload: action,
                source: `MacroEngine [${name}]`,
                executionMode: 'SLAVES_ONLY'
            }));
        } catch (err) {
            if (err.code !== 'ENOENT') {
                logger.error(`Error parsing ${seqFile}:`, err.message);
            }
        }
        return null;
    }

    async validate(commands, readyBrowsers) {
        logger.info('Validating macro across ready slaves...');
        const results = await Promise.all(readyBrowsers.map(async (b) => {
            try {
                for (const command of commands) {
                    if (command.payload.selector) {
                        const locator = b.page.locator(command.payload.selector);
                        const count = await locator.count();
                        if (count === 0) throw new Error(`Selector not found: ${command.payload.selector}`);
                        if (command.type === 'click' || command.type === 'input') {
                            const visible = await locator.first().isVisible();
                            if (!visible) throw new Error(`Selector present but not visible: ${command.payload.selector}`);
                        }
                    }
                }
                return { id: b.id, isValid: true };
            } catch (err) {
                return { id: b.id, isValid: false, error: err.message };
            }
        }));

        const failed = results.filter(r => !r.isValid);
        if (failed.length > 0) {
            logger.warn('Validation FAILED on following slaves:');
            failed.forEach(f => logger.warn(`[${f.id}]: ${f.error}`));
            return false;
        }
        logger.info('Validation SUCCESS.');
        return true;
    }

    async execute(commands, targetBrowsers) {
        logger.info('Executing macro...');
        const executionPromises = targetBrowsers.map(async (b) => {
            for (const command of commands) {
                this.scheduler.enqueue(b, command);
                await this.scheduler.waitForIdle(b.id);
            }
        });
        await Promise.allSettled(executionPromises);
    }
}
