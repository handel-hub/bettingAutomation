const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { logger } = require('./config');

class SequenceEngine {
    constructor(settings, slavePages) {
        this.triggers = settings.Triggers || {};
        this.slavePages = slavePages;
        this.sequencesDir = path.join(__dirname, '..', 'sequences');
        this.hotkeyMap = {};
        this.validateKey = (this.triggers.hotkey_validate || 'v').toLowerCase();
        this.validationMode = false;
        
        // Parse configured hotkeys (e.g. hotkey_1 = 1)
        for (const [key, value] of Object.entries(this.triggers)) {
            if (key.startsWith('hotkey_') && key !== 'hotkey_validate') {
                const seqNum = key.split('_')[1];
                this.hotkeyMap[value.toLowerCase()] = seqNum;
            }
        }
    }

    loadSequence(seqNum) {
        const seqFile = path.join(this.sequencesDir, `seq_${seqNum}.json`);
        if (fs.existsSync(seqFile)) {
            try {
                return JSON.parse(fs.readFileSync(seqFile, 'utf-8'));
            } catch (err) {
                logger.error(`Error parsing ${seqFile}:`, err.message);
            }
        } else {
            logger.warn(`Sequence file seq_${seqNum}.json not found!`);
        }
        return null;
    }

    async validateSequence(sequence) {
        logger.info('Performing Dry Run validation across all slave pages...');
        const results = await Promise.all(this.slavePages.map(async (page, index) => {
            try {
                for (const action of sequence) {
                    if (action.selector) {
                        const count = await page.locator(action.selector).count();
                        if (count === 0) {
                            throw new Error(`Selector not found: ${action.selector}`);
                        }
                    }
                }
                return { slaveId: index, isValid: true };
            } catch (err) {
                return { slaveId: index, isValid: false, error: err.message };
            }
        }));

        const failed = results.filter(r => !r.isValid);
        if (failed.length > 0) {
            logger.warn('Validation FAILED on following slaves:');
            failed.forEach(f => logger.warn(`Slave ${f.slaveId}: ${f.error}`));
            return false;
        }

        logger.info('Validation SUCCESS: All slaves are ready for the sequence.');
        return true;
    }

    async executeSequence(sequence) {
        logger.info('Executing sequence with zero latency...');
        // Zero-latency simultaneous execution
        const executionPromises = this.slavePages.map(async (page) => {
            for (const action of sequence) {
                try {
                    if (action.type === 'click') {
                        await page.click(action.selector, { timeout: 2000 });
                    } else if (action.type === 'input') {
                        await page.fill(action.selector, action.value, { timeout: 2000 });
                    }
                } catch (err) {
                    logger.error(`Execution error on slave: ${err.message}`);
                }
            }
        });

        await Promise.allSettled(executionPromises);
        logger.info('Sequence execution complete.');
    }

    startTerminalListener() {
        if (this.triggers.trigger_type !== 'terminal') return;
        
        logger.info('Starting Terminal Hotkey Listener...');
        logger.info(`Press '${this.validateKey}' to enter Validation Mode (Dry Run) for the next sequence hotkey pressed.`);
        
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        process.stdin.on('keypress', async (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            }
            
            const input = key.name ? key.name.toLowerCase() : String(str).toLowerCase();
            
            if (input === this.validateKey) {
                this.validationMode = true;
                logger.info(`[Validation Mode ON] Waiting for sequence hotkey to validate...`);
                return;
            } 
            
            if (this.hotkeyMap[input]) {
                const seqNum = this.hotkeyMap[input];
                const sequence = this.loadSequence(seqNum);
                if (!sequence) {
                    this.validationMode = false;
                    return;
                }

                if (this.validationMode) {
                    logger.info(`Validating Sequence ${seqNum}...`);
                    await this.validateSequence(sequence);
                    this.validationMode = false;
                } else {
                    logger.info(`Executing Sequence ${seqNum}...`);
                    await this.executeSequence(sequence);
                }
            }
        });
    }
}

module.exports = { SequenceEngine };
