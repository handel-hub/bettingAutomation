import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProcessLifecycleManager {
    constructor(logger, controller) {
        this.logger = logger;
        this.controller = controller;
        this.isShuttingDown = false;
        
        this._bindProcessEvents();
    }

    _writeFatalLog(reason, err) {
        try {
            const logPath = path.join(__dirname, '..', 'fatal.log');
            const timestamp = new Date().toISOString();
            const errMsg = err ? (err.stack || err.message || String(err)) : 'Unknown error';
            fs.appendFileSync(logPath, `[${timestamp}] FATAL [${reason}]: ${errMsg}\n`);
        } catch (fsErr) {
            // Cannot do much if writing to fatal.log fails during a fatal crash
            console.error('Failed to write to fatal.log:', fsErr);
        }
    }

    _bindProcessEvents() {
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));

        process.on('uncaughtException', async (err) => {
            this._writeFatalLog('uncaughtException', err);
            this.logger.error({ err }, `Uncaught Exception: ${err.message}`);
            await this.shutdown('uncaughtException');
        });

        process.on('unhandledRejection', async (reason, promise) => {
            this._writeFatalLog('unhandledRejection', reason);
            this.logger.error({ err: reason }, `Unhandled Rejection: ${reason}`);
            await this.shutdown('unhandledRejection');
        });
    }

    async shutdown(signal) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        this.logger.info(`Received ${signal}. Starting centralized teardown...`);
        
        const forceExit = setTimeout(() => {
            this.logger.error('Shutdown took too long, forcing exit.');
            process.exit(1);
        }, 5000);
        
        try {
            if (this.controller) {
                await this.controller.stop();
            }
        } catch (err) {
            this.logger.error(`Error during controller stop: ${err.message}`);
            this._writeFatalLog('shutdown_error', err);
        } finally {
            clearTimeout(forceExit);
            process.exit(signal === 'uncaughtException' || signal === 'unhandledRejection' ? 1 : 0);
        }
    }
}
