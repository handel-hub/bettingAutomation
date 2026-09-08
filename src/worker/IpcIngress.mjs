import EventEmitter from 'node:events';
import { Command } from '../browser/execution/Command.mjs';

export class IpcIngress extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.isStarted = false;
    }

    start() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.logger.info('Starting IPC Ingress...');

        process.on('message', (msg) => {
            if (!msg || typeof msg !== 'object') return;

            if (msg.type === 'TRIGGER_WORKFLOW') {
                const command = new Command({
                    category: 'Workflow',
                    type: msg.payload.workflow,
                    payload: {},
                    source: 'Launcher',
                    executionMode: msg.payload.executionMode || 'UNIQUE_ACCOUNTS_ONLY'
                });
                this.emit('Command', command);
                this.logger.info(`[IPC] Received workflow trigger: ${msg.payload.workflow}`);
            } else if (msg.type === 'RUN_MACRO') {
                const command = new Command({
                    category: 'Execution',
                    type: 'macro',
                    payload: msg.payload,
                    source: 'Launcher',
                    executionMode: msg.payload.executionMode || 'ALL'
                });
                this.emit('Command', command);
                this.logger.info(`[IPC] Received macro trigger: ${msg.payload.seqNum}`);
            }
        });
    }
}
