import { loadConfig, logger } from './src/config.mjs';
import { ProxyManager, StealthEngine } from './src/detection/index.mjs';
import { AutomationController } from './src/browser/AutomationController.mjs';

async function main() {
    logger.info('Starting Betting Automation System (v2 Architecture)...');

    const { settings, accounts, proxies } = loadConfig();
    
    // Initialize Detection Subsystem (Independent)
    const proxyManager = new ProxyManager(proxies, settings);
    await proxyManager.validateProxies();

    const stealthEngine = new StealthEngine(settings);

    // Initialize the Automation Controller
    const controller = new AutomationController(settings, accounts, proxyManager, stealthEngine);

    try {
        await controller.start();
    } catch (err) {
        logger.error('Fatal error during startup:', err.message);
        process.exit(1);
    }
}

main();
