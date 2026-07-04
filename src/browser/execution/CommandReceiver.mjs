import readline from 'node:readline';
import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { Command } from './Command.mjs';

export class CommandReceiver extends EventEmitter {
    constructor(settings) {
        super();
        this.triggers = settings.Triggers || {};
        this.hotkeyMap = {};
        this.validateKey = (this.triggers.hotkey_validate || 'v').toLowerCase();
        
        for (const [key, value] of Object.entries(this.triggers)) {
            if (key.startsWith('hotkey_') && key !== 'hotkey_validate') {
                const seqNum = key.split('_')[1];
                this.hotkeyMap[value.toLowerCase()] = seqNum;
            }
        }
    }

    start() {
        if (this.triggers.trigger_type !== 'terminal') return;
        
        logger.info('Starting Command Receiver...');
        logger.info(`Press '${this.validateKey}' to enter Validation Mode for the next sequence.`);
        
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);

        let validationMode = false;

        process.stdin.on('keypress', (str, key) => {
            if (key && key.ctrl && key.name === 'c') {
                process.exit();
            }
            
            const input = key && key.name ? key.name.toLowerCase() : String(str).toLowerCase();
            
            if (input === this.validateKey) {
                validationMode = true;
                logger.info(`[Validation Mode ON] Waiting for macro hotkey...`);
                return;
            } 
            
            if (this.hotkeyMap[input]) {
                const seqNum = this.hotkeyMap[input];
                const command = new Command({
                    category: 'Execution',
                    type: 'macro',
                    payload: { seqNum, validateOnly: validationMode },
                    source: 'Terminal',
                    executionMode: 'ALL'
                });
                this.emit('Command', command);
                validationMode = false;
            }
        });
    }
}
