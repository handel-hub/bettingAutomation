// @ts-check
import { AutomationController } from '../browser/AutomationController.mjs';
import { IpcIngress } from './IpcIngress.mjs';
import { ExecutionLifecycleManager } from './lifecycle.mjs';
import { SecureIpcClient } from './SecureIpcClient.mjs';
import { ExecutionMessageType } from './protocol.mjs';
import { logger } from '../utils/logger.mjs';

const isControlPlaneManaged = Boolean(process.env.CONTROL_PLANE_PIPE);

if (isControlPlaneManaged) {
    logger.info(`[Execution] Bootstrapping worker under Control Plane orchestration on pipe: ${process.env.CONTROL_PLANE_PIPE}`);

    (async () => {
        let lifecycleManager = new ExecutionLifecycleManager(logger, null);
        let ipcIngress = new IpcIngress(logger);

        try {
            // 1. Read 32-byte session key from stdin
            logger.info('[Execution] Awaiting 32-byte session key via stdin...');
            const sessionKey = await SecureIpcClient.readSessionKeyFromStdin();
            logger.info('[Execution] Acquired session key. Connecting to Control Plane named pipe...');

            // 2. Connect & Authenticate via HMAC-SHA256 handshake
            const ipcClient = new SecureIpcClient(process.env.CONTROL_PLANE_PIPE);
            await ipcClient.connect(sessionKey);
            logger.info('[Execution] Connected and authenticated with Control Plane.');

            // 3. Connect transport to IpcIngress
            ipcIngress.setTransport(ipcClient);

            // 4. Start heartbeat (every 3 seconds) reporting live telemetry
            ipcClient.startHeartbeat(3000, () => ({
                activeBrowsers: lifecycleManager.controller?.getActiveBrowserCount?.() || 0,
                engineStatus: lifecycleManager.isShuttingDown ? 'STOPPING' : (lifecycleManager.controller ? 'READY' : 'INITIALIZING')
            }));

            // 5. Handle lifecycle control envelopes from Control Plane
            ipcClient.on('envelope', async (envelope) => {
                const { type, payload, traceId } = envelope;

                if (type === ExecutionMessageType.INITIALIZE) {
                    const { settings, accounts, proxies, policy } = payload || {};
                    logger.info('[Execution] Received LIFECYCLE:INITIALIZE from Control Plane. Bootstrapping AutomationController...');

                    try {
                        const controller = new AutomationController(settings, accounts, proxies, policy, ipcIngress);
                        lifecycleManager.controller = controller;
                        ipcIngress.setController(controller);

                        ipcIngress.start();
                        await controller.start();

                        logger.info('[Execution] AutomationController bootstrap complete.');
                        ipcClient.sendEnvelope(ExecutionMessageType.STATE_CHANGED, {
                            state: 'READY',
                            message: 'AutomationController initialized and running'
                        }, traceId);
                    } catch (err) {
                        logger.error(`[Execution] Failed to initialize AutomationController: ${err.message}`);
                        ipcClient.sendEnvelope(ExecutionMessageType.STATE_CHANGED, {
                            state: 'ERROR',
                            message: err.message
                        }, traceId);
                    }
                } else if (type === ExecutionMessageType.STOP_CLUSTER) {
                    logger.info('[Execution] Received LIFECYCLE:STOP_CLUSTER from Control Plane. Shutting down...');
                    ipcClient.sendEnvelope(ExecutionMessageType.STATE_CHANGED, {
                        state: 'STOPPED',
                        message: 'Shutdown initiated'
                    }, traceId);
                    await lifecycleManager.shutdown('Control Plane requested STOP_CLUSTER');
                }
            });

            // 6. Handle pipe closure (ACP termination or disconnect)
            ipcClient.on('close', async () => {
                logger.warn('[Execution] Control Plane pipe closed. Initiating shutdown...');
                await lifecycleManager.shutdown('Named pipe closed by Control Plane');
            });

            // Graceful OS signal handling
            process.on('SIGINT', () => lifecycleManager.shutdown('SIGINT received'));
            process.on('SIGTERM', () => lifecycleManager.shutdown('SIGTERM received'));

        } catch (err) {
            logger.error(`[Execution] Fatal bootstrap error: ${err.message}`);
            process.exit(1);
        }
    })();

} else {
    // Mode B: Legacy Launcher Mode (Backward Compatibility)
    logger.info('[Execution] Bootstrapping in standalone/launcher mode.');

    const ipcIngress = new IpcIngress(logger, process);
    ipcIngress.setTransport(process);
    let lifecycleManager = new ExecutionLifecycleManager(logger, null);

    process.on('message', async (msg) => {
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'INITIALIZE') {
            const { settings, accounts, proxies, policy } = msg.payload;
            logger.info('[Execution] Received INITIALIZE from Launcher. Bootstrapping AutomationController...');

            try {
                const controller = new AutomationController(settings, accounts, proxies, policy, ipcIngress);
                lifecycleManager.controller = controller;
                ipcIngress.setController(controller);

                ipcIngress.start();
                await controller.start();
                
                logger.info('[Execution] Bootstrapping complete.');
                if (typeof process.send === 'function') {
                    process.send({ type: 'STATE_UPDATE', state: 'READY' });
                }
            } catch (err) {
                logger.error(`[Execution] Failed to start: ${err.message}`);
                if (typeof process.send === 'function') {
                    process.send({ type: 'FATAL', error: err.message });
                }
                process.exit(1);
            }
        } else if (msg.type === 'CONTROL') {
            if (msg.action === 'SHUTDOWN') {
                await lifecycleManager.shutdown('Launcher requested SHUTDOWN');
            }
        }
    });

    process.on('SIGINT', () => lifecycleManager.shutdown('SIGINT received'));
    process.on('SIGTERM', () => lifecycleManager.shutdown('SIGTERM received'));
}
