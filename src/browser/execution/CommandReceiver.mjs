import readline from 'node:readline';
import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { Command } from './Command.mjs';

const WORKFLOW_HOTKEY_KEYS = ['cashout'];

export class CommandReceiver extends EventEmitter {
    constructor(settings) {
        super();
        this.triggers = settings.Triggers || {};
        this.validateKey = (this.triggers.hotkey_validate || 'v').toLowerCase();

        this.bindings = new Map();
        this._bind(this.validateKey, { kind: 'validate' });

        for (const workflowName of WORKFLOW_HOTKEY_KEYS) {
            const configKey = `hotkey_${workflowName}`;
            const char = this.triggers[configKey];
            if (char) this._bind(char.toLowerCase(), { kind: 'workflow', name: workflowName });
        }

        for (const [key, value] of Object.entries(this.triggers)) {
            if (key.startsWith('hotkey_') && key !== 'hotkey_validate'
                && !WORKFLOW_HOTKEY_KEYS.some(w => key === `hotkey_${w}`)) {
                const seqNum = key.split('_')[1];
                this._bind(value.toLowerCase(), { kind: 'macro', seqNum });
            }
        }
        
        this.validationTimeoutId = null;
    }

    _bind(char, binding) {
        if (this.bindings.has(char)) {
            const existing = this.bindings.get(char);
            throw new Error(
                `Hotkey conflict: '${char}' is bound to both ` +
                `${this._describe(existing)} and ${this._describe(binding)}. ` +
                `Fix settings.ini before starting.`
            );
        }
        this.bindings.set(char, binding);
    }

    _describe(binding) {
        if (binding.kind === 'validate') return 'validation mode';
        if (binding.kind === 'workflow') return `workflow '${binding.name}'`;
        return `macro sequence ${binding.seqNum}`;
    }

    armValidationTimeout(resetCallback) {
        this.clearValidationTimeout();
        this.validationTimeoutId = setTimeout(() => {
            logger.info(`[Validation Mode OFF] Timed out.`);
            resetCallback();
        }, 4000);
    }

    clearValidationTimeout() {
        if (this.validationTimeoutId) {
            clearTimeout(this.validationTimeoutId);
            this.validationTimeoutId = null;
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
            const binding = this.bindings.get(input);
            if (!binding) return;
            
            if (binding.kind === 'validate') {
                if (validationMode) {
                    validationMode = false;
                    this.clearValidationTimeout();
                    logger.info(`[Validation Mode OFF] Canceled.`);
                } else {
                    validationMode = true;
                    this.armValidationTimeout(() => { validationMode = false; });
                    logger.info(`[Validation Mode ON] Waiting for macro hotkey...`);
                }
                return;
            } 
            
            if (binding.kind === 'workflow') {
                const command = new Command({
                    category: 'Workflow',
                    type: binding.name,
                    payload: {},
                    source: 'Terminal',
                    executionMode: 'UNIQUE_ACCOUNTS_ONLY'
                });
                this.emit('Command', command);
                logger.info(`[Terminal] Triggered '${binding.name}' workflow.`);
                this.clearValidationTimeout();
                validationMode = false;
                return;
            }
            
            if (binding.kind === 'macro') {
                const command = new Command({
                    category: 'Execution',
                    type: 'macro',
                    payload: { seqNum: binding.seqNum, validateOnly: validationMode },
                    source: 'Terminal',
                    executionMode: 'ALL'
                });
                this.emit('Command', command);
                this.clearValidationTimeout();
                validationMode = false;
            }
        });
    }
}
