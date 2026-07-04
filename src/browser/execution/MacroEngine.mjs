import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../config.mjs';
import { Command } from './Command.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MacroEngine {
    constructor(simulator) {
        this.simulator = simulator;
        this.sequencesDir = path.join(__dirname, '..', '..', '..', 'sequences');
    }

    loadSequence(name) {
        const fileName = (name.startsWith('seq_') || name === 'startup') ? `${name}.json` : `seq_${name}.json`;
        const seqFile = path.join(this.sequencesDir, fileName);
        if (fs.existsSync(seqFile)) {
            try {
                const rawSequence = JSON.parse(fs.readFileSync(seqFile, 'utf-8'));
                return rawSequence.map(action => new Command({
                    type: action.type,
                    payload: action,
                    source: `MacroEngine [${name}]`,
                    executionMode: 'SLAVES_ONLY'
                }));
            } catch (err) {
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
                        const count = await b.page.locator(command.payload.selector).count();
                        if (count === 0) throw new Error(`Selector not found: ${command.payload.selector}`);
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
                const success = await this.simulator.execute(b, command);
                if (!success) break;
            }
        });
        await Promise.allSettled(executionPromises);
    }
}
