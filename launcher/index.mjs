import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, logger } from './config.mjs';
import { ProxyManager } from './proxies.mjs';
import { loadStrategyPolicy } from './strategy.mjs';
import { attachCommandReceiver } from './input.mjs';
import { setupLifecycle } from './lifecycle.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    logger.info('Starting Application Shell (Launcher)...');

    // 1. Gather all configuration
    const { settings, accounts, proxies: rawProxies } = await loadConfig();
    
    // 2. Network Validation
    const proxyManager = new ProxyManager(rawProxies, settings);
    await proxyManager.validateProxies();
    const validProxies = proxyManager.getValidProxies();

    // 3. Strategy Parsing
    const policy = loadStrategyPolicy();

    // 4. Spawn Execution Plane
    const executionPath = path.join(__dirname, '..', 'src', 'worker', 'index.mjs');
    logger.info(`Forking Execution Plane: ${executionPath}`);
    const executionWorker = fork(executionPath, [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    // 5. Send Initialization Data
    executionWorker.send({
        type: 'INITIALIZE',
        payload: {
            settings,
            accounts,
            proxies: validProxies,
            policy
        }
    });

    executionWorker.on('error', (err) => {
        logger.fatal({ err }, `Execution Worker failed to spawn or encountered process error: ${err.message}`);
        process.exit(1);
    });

    executionWorker.on('message', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'STATE_UPDATE') {
            logger.info(`Execution State: ${msg.state}`);
        } else if (msg.type === 'FATAL') {
            logger.fatal(`Execution Error: ${msg.error}`);
            process.exit(1);
        } else if (msg.type === 'TACTICAL:OPERATION_RESULT' || msg.type === 'OPERATION_RESULT') {
            logger.info(`[Launcher] Operation Result: ${JSON.stringify(msg.payload || {})}`);
        } else if (msg.type) {
            logger.info(`[Launcher] Worker Event [${msg.type}]`);
        }
    });

    executionWorker.on('exit', (code, signal) => {
        logger.info(`Execution Plane exited with code ${code} (signal: ${signal}). Launcher shutting down.`);
        process.exit(code || 0);
    });

    // 6. Connect TTY Inputs
    attachCommandReceiver(settings, executionWorker, logger);

    // 7. Connect Application Lifecycle (SIGINT)
    setupLifecycle(executionWorker, logger);
}

main().catch(err => {
    console.error('Fatal launcher error:', err);
    process.exit(1);
});
