import readline from 'node:readline';

const WORKFLOW_HOTKEY_KEYS = ['cashout', 'placebet'];

export function attachCommandReceiver(settings, executionWorker, logger) {
    const triggers = settings.Triggers || {};
    if (triggers.trigger_type !== 'terminal') return;

    const validateKey = (triggers.hotkey_validate || 'v').toLowerCase();
    const bindings = new Map();

    const _bind = (char, binding) => {
        if (bindings.has(char)) {
            logger.error(`Hotkey conflict for '${char}'`);
        }
        bindings.set(char, binding);
    };

    _bind(validateKey, { kind: 'validate' });

    for (const workflowName of WORKFLOW_HOTKEY_KEYS) {
        const configKey = `hotkey_${workflowName}`;
        const char = triggers[configKey];
        if (char) _bind(char.toLowerCase(), { kind: 'workflow', name: workflowName });
    }

    for (const [key, value] of Object.entries(triggers)) {
        if (key.startsWith('hotkey_') && key !== 'hotkey_validate'
            && !WORKFLOW_HOTKEY_KEYS.some(w => key === `hotkey_${w}`)) {
            const seqNum = key.split('_')[1];
            _bind(value.toLowerCase(), { kind: 'macro', seqNum });
        }
    }

    logger.info('Starting Terminal Command Receiver...');
    logger.info(`Press '${validateKey}' to enter Validation Mode for the next sequence.`);

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    let validationMode = false;
    let validationTimeoutId = null;

    process.stdin.on('keypress', (str, key) => {
        if (key && key.ctrl && key.name === 'c') {
            process.kill(process.pid, 'SIGINT');
            return;
        }

        const input = key && key.name ? key.name.toLowerCase() : String(str).toLowerCase();
        const binding = bindings.get(input);
        if (!binding) return;

        if (binding.kind === 'validate') {
            if (validationMode) {
                validationMode = false;
                clearTimeout(validationTimeoutId);
                logger.info(`[Validation Mode OFF] Canceled.`);
            } else {
                validationMode = true;
                validationTimeoutId = setTimeout(() => {
                    logger.info(`[Validation Mode OFF] Timed out.`);
                    validationMode = false;
                }, 4000);
                logger.info(`[Validation Mode ON] Waiting for macro hotkey...`);
            }
            return;
        }

        if (binding.kind === 'workflow') {
            executionWorker.send({
                type: 'TRIGGER_WORKFLOW',
                payload: {
                    workflow: binding.name,
                    executionMode: 'UNIQUE_ACCOUNTS_ONLY'
                }
            });
            logger.info(`[Terminal] Triggered '${binding.name}' workflow.`);
            validationMode = false;
            clearTimeout(validationTimeoutId);
            return;
        }

        if (binding.kind === 'macro') {
            executionWorker.send({
                type: 'RUN_MACRO',
                payload: { seqNum: binding.seqNum, validateOnly: validationMode },
                executionMode: 'ALL'
            });
            logger.info(`[Terminal] Triggered macro '${binding.seqNum}'.`);
            validationMode = false;
            clearTimeout(validationTimeoutId);
            return;
        }
    });
}
