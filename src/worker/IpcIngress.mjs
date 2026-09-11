// @ts-check
import EventEmitter from 'node:events';
import { Command } from '../browser/execution/Command.mjs';
import { ExecutionMessageType, createExecutionEnvelope } from './protocol.mjs';

/**
 * Standardized IPC Ingress that routes Control Plane and legacy Launcher commands
 * into the browser execution engine.
 */
export class IpcIngress extends EventEmitter {
    /**
     * @param {any} logger 
     * @param {any} [transport] - SecureIpcClient or process
     */
    constructor(logger, transport = null) {
        super();
        this.logger = logger;
        this.transport = transport;
        this.isStarted = false;
        this.controller = null;
    }

    setTransport(transport) {
        this.transport = transport;
    }

    setController(controller) {
        this.controller = controller;
    }

    /**
     * Sends an execution envelope back to the Control Plane if transport supports it.
     * @param {string} type 
     * @param {any} payload 
     * @param {string} [traceId] 
     */
    sendReply(type, payload, traceId) {
        if (!this.transport) return;

        if (typeof this.transport.sendEnvelope === 'function') {
            this.transport.sendEnvelope(type, payload, traceId);
        } else if (typeof this.transport.send === 'function') {
            this.transport.send({ type, payload, traceId });
        }
    }

    start() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.logger.info('[IpcIngress] Starting Standardized IPC Ingress...');

        const handler = (msg) => {
            if (!msg || typeof msg !== 'object') return;
            this._routeMessage(msg);
        };

        if (this.transport && typeof this.transport.on === 'function') {
            this.transport.on('message', handler);
            this.transport.on('envelope', handler);
        } else {
            process.on('message', handler);
        }
    }

    /**
     * Internal router for standardized ExecutionEnvelopes and legacy messages.
     * @param {any} msg 
     * @private
     */
    _routeMessage(msg) {
        const type = msg.type;
        const payload = msg.payload || {};
        const traceId = msg.traceId;

        switch (type) {
            // 1. Tactical Bet Placement
            case ExecutionMessageType.PLACE_BET:
            case 'PLACE_BET': {
                const operationId = payload.operationId || msg.operationId;
                if (operationId) {
                    this.sendReply(ExecutionMessageType.OPERATION_ACK, { operationId, status: 'IN_FLIGHT' }, traceId);
                }

                const command = new Command({
                    category: 'Workflow',
                    type: 'placebet',
                    payload: payload,
                    source: 'ControlPlane',
                    traceId: traceId,
                    runId: operationId,
                    executionMode: payload.executionMode || 'UNIQUE_ACCOUNTS_ONLY'
                });
                this.emit('Command', command);
                this.logger.info(`[IpcIngress] Routed TACTICAL:PLACE_BET (op: ${operationId})`);
                break;
            }

            // 2. Tactical Cashout
            case ExecutionMessageType.CASH_OUT:
            case 'CASH_OUT': {
                const operationId = payload.operationId || msg.operationId;
                if (operationId) {
                    this.sendReply(ExecutionMessageType.OPERATION_ACK, { operationId, status: 'IN_FLIGHT' }, traceId);
                }

                const command = new Command({
                    category: 'Workflow',
                    type: 'cashout',
                    payload: payload,
                    source: 'ControlPlane',
                    traceId: traceId,
                    runId: operationId,
                    executionMode: payload.executionMode || 'UNIQUE_ACCOUNTS_ONLY'
                });
                this.emit('Command', command);
                this.logger.info(`[IpcIngress] Routed TACTICAL:CASH_OUT (op: ${operationId})`);
                break;
            }

            // 3. Tactical Validation
            case ExecutionMessageType.VALIDATE:
            case 'VALIDATE': {
                const command = new Command({
                    category: 'Execution',
                    type: 'macro',
                    payload: { seqNum: payload.seqNum || '1', validateOnly: true },
                    source: 'ControlPlane',
                    traceId: traceId,
                    executionMode: 'ALL'
                });
                this.emit('Command', command);
                this.logger.info('[IpcIngress] Routed TACTICAL:VALIDATE');
                break;
            }

            // 4. Dynamic Bet Cycle Toggle
            case ExecutionMessageType.SET_BET_CYCLE:
            case 'SET_BET_CYCLE': {
                const { targetBrowserId, isEnabled } = payload;
                const command = new Command({
                    category: 'Control',
                    type: 'SET_BETTING_AUTHORIZATION',
                    payload: { targetBrowserId, isEnabled },
                    source: 'ControlPlane',
                    traceId: traceId
                });
                this.emit('Command', command);
                this.logger.info(`[IpcIngress] Routed SET_BET_CYCLE for [${targetBrowserId}] -> ${isEnabled}`);
                break;
            }

            // 5. Dynamic Fleet Operations
            case ExecutionMessageType.ACTIVATE_ACCOUNT:
            case 'ACTIVATE_ACCOUNT': {
                this.emit('ActivateAccount', payload);
                const account = payload.account || payload;
                this.logger.info(`[IpcIngress] Received ACTIVATE_ACCOUNT for user: ${account?.username}`);
                if (this.controller?.activateAccount) {
                    this.controller.activateAccount(account, payload.proxyUrl)
                        .then((slave) => {
                            this.sendReply(ExecutionMessageType.BROWSER_STATUS, {
                                accountId: payload.accountId || slave?.id,
                                username: account?.username,
                                status: 'READY'
                            }, traceId);
                        })
                        .catch((err) => {
                            this.logger.error(`[IpcIngress] Failed to activate account: ${err.message}`);
                            this.sendReply(ExecutionMessageType.BROWSER_STATUS, {
                                accountId: payload.accountId,
                                username: account?.username,
                                status: 'ERROR',
                                error: err.message
                            }, traceId);
                        });
                }
                break;
            }

            case ExecutionMessageType.DEACTIVATE_ACCOUNT:
            case 'DEACTIVATE_ACCOUNT': {
                this.emit('DeactivateAccount', payload);
                const idOrUser = payload.accountId || payload.username || payload.targetBrowserId;
                this.logger.info(`[IpcIngress] Received DEACTIVATE_ACCOUNT for id: ${idOrUser}`);
                if (this.controller?.deactivateAccount) {
                    this.controller.deactivateAccount(idOrUser)
                        .then((ok) => {
                            this.sendReply(ExecutionMessageType.BROWSER_STATUS, {
                                accountId: payload.accountId,
                                status: ok ? 'TERMINATED' : 'NOT_FOUND'
                            }, traceId);
                        })
                        .catch((err) => {
                            this.logger.error(`[IpcIngress] Failed to deactivate account: ${err.message}`);
                            this.sendReply(ExecutionMessageType.BROWSER_STATUS, {
                                accountId: payload.accountId,
                                status: 'ERROR',
                                error: err.message
                            }, traceId);
                        });
                }
                break;
            }

            case ExecutionMessageType.UPDATE_POLICY:
            case 'UPDATE_POLICY': {
                this.emit('UpdatePolicy', payload);
                const target = payload.accountId || payload.target || payload.browserId || 'ALL';
                const operationId = payload.operationId || msg.operationId;
                this.logger.info(`[IpcIngress] Received UPDATE_POLICY: ${payload.category} (target: ${target})`);
                if (this.controller?.policyManager?.updatePolicy) {
                    this.controller.policyManager.updatePolicy({
                        target,
                        category: payload.category,
                        values: payload.values
                    });
                }
                if (operationId) {
                    this.sendReply(ExecutionMessageType.OPERATION_ACK, {
                        operationId,
                        operation: 'UPDATE_POLICY',
                        target,
                        status: 'APPLIED'
                    }, traceId);
                }
                break;
            }

            // 6. Legacy Workflows (Backward Compatibility)
            case 'TRIGGER_WORKFLOW': {
                const command = new Command({
                    category: 'Workflow',
                    type: payload.workflow,
                    payload: payload,
                    source: 'Launcher',
                    executionMode: payload.executionMode || 'UNIQUE_ACCOUNTS_ONLY'
                });
                this.emit('Command', command);
                this.logger.info(`[IpcIngress] Received legacy workflow trigger: ${payload.workflow}`);
                break;
            }

            case 'RUN_MACRO': {
                const command = new Command({
                    category: 'Execution',
                    type: 'macro',
                    payload: payload,
                    source: 'Launcher',
                    executionMode: payload.executionMode || 'ALL'
                });
                this.emit('Command', command);
                this.logger.info(`[IpcIngress] Received legacy macro trigger: ${payload.seqNum}`);
                break;
            }

            default:
                this.logger.debug(`[IpcIngress] Unhandled message type: ${type}`);
                break;
        }
    }
}
