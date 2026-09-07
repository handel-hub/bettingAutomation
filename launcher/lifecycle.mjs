import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupLifecycle(executionWorker, logger) {
    let isShuttingDown = false;

    function _writeFatalLog(reason, err) {
        try {
            const logPath = path.join(__dirname, '..', 'fatal.log');
            const timestamp = new Date().toISOString();
            const errMsg = err ? (err.stack || err.message || String(err)) : 'Unknown error';
            fs.appendFileSync(logPath, `[${timestamp}] FATAL [${reason}]: ${errMsg}\n`);
        } catch (fsErr) {
            console.error('Failed to write to fatal.log:', fsErr);
        }
    }

    function shutdown(signal) {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info(`Launcher received ${signal}. Sending SHUTDOWN to Execution Plane...`);

        executionWorker.send({ type: 'CONTROL', action: 'SHUTDOWN' });

        const forceExit = setTimeout(() => {
            logger.error('Execution Plane took too long to shutdown, forcing exit.');
            executionWorker.kill('SIGKILL');
            process.exit(1);
        }, 5000);

        executionWorker.once('exit', () => {
            clearTimeout(forceExit);
        });
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
        _writeFatalLog('uncaughtException', err);
        logger.fatal({ err }, `Uncaught Exception: ${err.message}`);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        _writeFatalLog('unhandledRejection', reason);
        logger.fatal({ err: reason }, `Unhandled Rejection: ${reason}`);
        shutdown('unhandledRejection');
    });
}
