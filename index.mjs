import { loadConfig, logger } from './src/config.mjs';
import { ProxyManager, StealthEngine } from './src/detection/index.mjs';
import { AutomationController } from './src/browser/AutomationController.mjs';

async function main() {
    logger.info('Starting Betting Automation System (v2 Architecture)...');

    const { settings, accounts, proxies } = await loadConfig();
    
    // Initialize Detection Subsystem (Independent)
    const proxyManager = new ProxyManager(proxies, settings);
    await proxyManager.validateProxies();

    const stealthEngine = new StealthEngine(settings);

    // Initialize the Automation Controller
    const controller = new AutomationController(settings, accounts, proxyManager, stealthEngine);

    try {
        await controller.start();
        
        // --- Graceful Teardown Hooks ---
        let isShuttingDown = false;
        const shutdown = async (signal) => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            logger.info(`Received ${signal}. Starting teardown...`);
            
            const forceExit = setTimeout(() => {
                logger.error('Shutdown took too long, forcing exit.');
                process.exit(1);
            }, 5000);
            
            await controller.stop();
            clearTimeout(forceExit);
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('uncaughtException', async (err) => {
            logger.error({ err }, `Uncaught Exception: ${err.message}`);
            await shutdown('uncaughtException');
        });
        
    } catch (err) {
        logger.error({ err }, `Fatal error during startup: ${err.message}`);
        process.exit(1);
    }
}

main();
