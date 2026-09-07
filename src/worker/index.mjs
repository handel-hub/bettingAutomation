import { AutomationController } from '../browser/AutomationController.mjs';
import { IpcIngress } from './IpcIngress.mjs';
import { ExecutionLifecycleManager } from './lifecycle.mjs';
import { logger } from '../utils/logger.mjs';

const ipcIngress = new IpcIngress(logger);

let lifecycleManager = new ExecutionLifecycleManager(logger, null);

process.on('message', async (msg) => {
    if (msg.type === 'INITIALIZE') {
        const { settings, accounts, proxies, policy } = msg.payload;
        
        logger.info('[Execution] Received INITIALIZE from Launcher. Bootstrapping AutomationController...');

        try {
            const controller = new AutomationController(settings, accounts, proxies, policy, ipcIngress);
            lifecycleManager.controller = controller;

            ipcIngress.start();
            await controller.start();
            
            logger.info('[Execution] Bootstrapping complete.');
            process.send({ type: 'STATE_UPDATE', state: 'READY' });
        } catch (err) {
            logger.error(`[Execution] Failed to start: ${err.message}`);
            process.send({ type: 'FATAL', error: err.message });
            process.exit(1);
        }
    } else if (msg.type === 'CONTROL') {
        if (msg.action === 'SHUTDOWN') {
            await lifecycleManager.shutdown('Launcher requested SHUTDOWN');
        }
    }
});
