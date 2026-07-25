import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { LocatorResolver } from './LocatorResolver.mjs';
import { pageStateMonitor } from './locatorIntelligence/resolution/PageStateMonitor.mjs';
import featureFlags from './locatorIntelligence/FeatureFlags.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { DeadlineBudget } from './time/DeadlineBudget.mjs';
import { 
    LocatorResolutionError, 
    OverlayInterceptionError, 
    ElementDetachedError, 
    PlaywrightTimeoutError,
    GlobalTimeoutError,
    StaleEpochError,
    QueueDeadlineExceededError
} from './errors.mjs';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
        this.MAX_EXECUTION_RETRIES = 3;
        this.attachedPages = new WeakSet();
    }

    async _executeWithRecovery(command, page, interactionType, actionFn, browserObj = null, deadlineBudget = null) {
        let attempts = 0;
        const locators = command.payload.locators || [];

        while (attempts < this.MAX_EXECUTION_RETRIES) {
            attempts++;
            if (deadlineBudget) {
                deadlineBudget.checkOrThrow('ActionSimulator');
            }
            
            // Phase 2 & 15: Resolve (Decoupled & Shadow Mode)
            let result;
            if (featureFlags.isEnabled('LI_SHADOW_MODE')) {
                // In shadow mode, we would run the legacy resolver to drive the physical action,
                // and the new resolver to gather comparison metrics.
                // For now, we simulate this by running the current resolver as 'legacy' and logging.
                result = await LocatorResolver.resolve(page, locators, interactionType, undefined, {
                    browserId: browserObj?.id || command.metadata?.browserId || command.target,
                    commandEpoch: command.metadata?.captureEpoch ?? command.metadata?.navigation?.epoch,
                    epochGate: this.epochGate,
                    shadowPath: command.payload.shadowPath || [],
                    deadlineBudget
                });
                
                const shadowResult = await LocatorResolver.resolve(page, locators, interactionType, undefined, {
                    browserId: browserObj?.id || command.metadata?.browserId || command.target,
                    commandEpoch: command.metadata?.captureEpoch ?? command.metadata?.navigation?.epoch,
                    epochGate: this.epochGate,
                    shadowPath: command.payload.shadowPath || [],
                    identityDocument: command.metadata?.identityDocument,
                    deadlineBudget
                });
                
                TelemetryCollector.recordShadowMode(command.id, {
                    legacySuccess: result.success,
                    newSuccess: shadowResult.success,
                    legacyLocator: result.locator,
                    newLocator: shadowResult.locator,
                    newConfidence: shadowResult.similarity?.overallScore || 0
                });
            } else {
                result = await LocatorResolver.resolve(page, locators, interactionType, undefined, {
                    browserId: browserObj?.id || command.metadata?.browserId || command.target,
                    commandEpoch: command.metadata?.captureEpoch ?? command.metadata?.navigation?.epoch,
                    epochGate: this.epochGate,
                    shadowPath: command.payload.shadowPath || [],
                    identityDocument: command.metadata?.identityDocument,
                    deadlineBudget
                });
            }
            
            if (!result.success) {
                if (result.failureReason && result.failureReason.includes('StaleEpochError')) {
                    const error = new StaleEpochError(result.failureReason);
                    error.addChain(`[LF-604] Epoch mismatch during execution attempt ${attempts}`);
                    throw error;
                }
                if (result.failureReason && result.failureReason.includes('LF-702')) {
                    const error = new QueueDeadlineExceededError(result.failureReason);
                    throw error;
                }
                // If it fails to resolve, throw the timeout error up without catching in local loop
                const error = new GlobalTimeoutError(result.failureReason);
                error.addChain(`[LF-504] Resolution failed during execution attempt ${attempts}`);
                throw error;
            }

            // Phase 3: Physical Execution
            const execStart = Date.now();
            try {
                await actionFn(result.playwrightLocator);
                
                // Success - Log Execution metrics separate from Resolution metrics
                logger.info(`[ActionSimulator] Execution Success | Action: ${interactionType} | Exec Duration: ${Date.now() - execStart}ms | Retries: ${attempts - 1}`);
                return result; // return the resolution info so caller can log the used locator
                
            } catch (err) {
                if (err instanceof QueueDeadlineExceededError || err instanceof GlobalTimeoutError || err instanceof StaleEpochError || err instanceof LocatorResolutionError) {
                    throw err; // Terminal synchronization errors must not be caught and retried locally
                }
                const errMessage = err.message || '';
                let automationError;

                // Playwright Interception & Detachment mapping
                if (errMessage.includes('is intercepted by') || errMessage.includes('covered by')) {
                    automationError = new OverlayInterceptionError(errMessage);
                } else if (errMessage.includes('Target closed') || errMessage.includes('Node is detached') || errMessage.includes('DOMElement is no longer attached')) {
                    automationError = new ElementDetachedError(errMessage);
                } else if (errMessage.includes('Timeout')) {
                    automationError = new PlaywrightTimeoutError(errMessage);
                } else {
                    // Unknown Playwright error - throw it immediately to avoid infinite loops on syntax errors
                    throw err;
                }

                logger.warn(`[ActionSimulator] ${automationError.code} Execution failed on attempt ${attempts}: ${automationError.message}. Triggering re-resolution.`);
                
                if (attempts >= this.MAX_EXECUTION_RETRIES) {
                    automationError.addChain(`[LF-505] Max execution retries (${this.MAX_EXECUTION_RETRIES}) reached for Action: ${interactionType}`);
                    throw automationError;
                }

                // Cooldown before retrying full resolution loop
                if (deadlineBudget) {
                    deadlineBudget.checkOrThrow('ActionSimulator');
                }
                await new Promise(r => setTimeout(r, 150));
            }
        }
    }

    _advanceSlaveEpoch(browserId, url, trigger) {
        try {
            let epochUpdated = false;
            if (this.registry && typeof this.registry.getState === 'function') {
                const state = this.registry.getState(browserId);
                const oldEpoch = state ? (state.navigationEpoch || 0) : 0;
                if (state && state.url !== url && url !== 'about:blank') {
                    this.registry.updateUrl(browserId, url);
                } else if (state) {
                    state.navigationEpoch = oldEpoch + 1;
                    state.url = url;
                    if (typeof this.registry.emit === 'function') {
                        this.registry.emit('StateUpdated', { browserId, state });
                    }
                }
                const newEpoch = state ? (state.navigationEpoch || 0) : 0;
                if (newEpoch > oldEpoch) {
                    epochUpdated = true;
                }
            }
            if (this.epochGate) {
                const currentGateEpoch = this.epochGate.getCurrentEpoch(browserId);
                const registryState = (this.registry && typeof this.registry.getState === 'function') ? this.registry.getState(browserId) : null;
                const targetEpoch = registryState ? (registryState.navigationEpoch || 0) : (currentGateEpoch + 1);
                if (currentGateEpoch < targetEpoch) {
                    while (this.epochGate.getCurrentEpoch(browserId) < targetEpoch) {
                        this.epochGate.incrementEpoch(browserId, url);
                    }
                }
            }
            TelemetryCollector.recordSpaNavigation(trigger);
        } catch (e) {
            logger.warn(`[ActionSimulator] Error advancing slave epoch for [${browserId}]: ${e.message}`);
        }
    }

    async attachSlave(browserObj) {
        if (!browserObj || !browserObj.page) return;
        const { id, page } = browserObj;
        if (this.attachedPages.has(page)) return;
        this.attachedPages.add(page);

        if (this.registry && typeof this.registry.getState === 'function') {
            this.registry.getState(id);
        }

        try {
            await page.exposeBinding('__notifySlaveNavigation', async ({ frame }, navEvent) => {
                if (typeof frame.parentFrame === 'function' && frame.parentFrame()) return;
                this._advanceSlaveEpoch(id, navEvent.url, navEvent.type);
            }).catch(() => {});

            page.on('framenavigated', (frame) => {
                if (typeof frame.parentFrame === 'function' ? !frame.parentFrame() : true) {
                    const url = typeof frame.url === 'function' ? frame.url() : frame.url;
                    this._advanceSlaveEpoch(id, url, 'framenavigated');
                }
            });

            const slaveScript = `
                (() => {
                    if (window.__ANTIGRAVITY_SLAVE_NAV_ATTACHED__) return;
                    window.__ANTIGRAVITY_SLAVE_NAV_ATTACHED__ = true;
                    const notify = (type, url) => {
                        if (window.__notifySlaveNavigation) {
                            window.__notifySlaveNavigation({ type, url, timestamp: Date.now() }).catch(() => {});
                        }
                    };
                    const origPush = history.pushState;
                    history.pushState = function(...args) {
                        const res = origPush.apply(this, args);
                        notify('pushState', location.href);
                        return res;
                    };
                    const origReplace = history.replaceState;
                    history.replaceState = function(...args) {
                        const res = origReplace.apply(this, args);
                        notify('replaceState', location.href);
                        return res;
                    };
                    window.addEventListener('popstate', () => notify('popstate', location.href));
                })();
            `;
            await page.addInitScript(slaveScript).catch(() => {});
            if (!page.isClosed || !page.isClosed()) {
                await page.evaluate(slaveScript).catch(() => {});
            }
        } catch (e) {
            logger.warn(`[ActionSimulator] Error attaching slave navigation listeners for [${id}]: ${e.message}`);
        }
    }

    async execute(browserObj, command, options = {}) {
        const startTime = Date.now();
        const { id, page } = browserObj;
        const deadlineBudget = options.deadlineBudget || DeadlineBudget.fromCommand(command, 1500);

        try {
            deadlineBudget.checkOrThrow('ActionSimulator');
        } catch (err) {
            logger.warn(`[Interaction Failure] Command ${command?.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ABORTED`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
        
        // Ensure PageStateMonitor is attached to this page to track DOM mutations
        await pageStateMonitor.attach(page).catch(() => {});
        
        await this.attachSlave(browserObj);

        // Task T14: Pre-Execution Epoch Verification
        if (featureFlags.isEnabled('LI_EPOCH_GATING') && this.epochGate && command) {
            const commandEpoch = command.metadata?.captureEpoch ?? command.metadata?.navigation?.epoch;
            if (commandEpoch !== undefined && commandEpoch !== null && commandEpoch !== 0) {
                const decisionObj = await this.epochGate.evaluateAsync(id, commandEpoch, 2000);
                if (decisionObj.decision === 'SKIP') {
                    TelemetryCollector.recordEpochSkip();
                    const err = new StaleEpochError(`[LF-604] StaleEpochError: Pre-execution check failed - ${decisionObj.reason}`);
                    logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ABORTED`);
                    this.emit('ActionFailure', { id, command, error: err });
                    return false;
                }
            }
        }

        const lifecycle = 'EXECUTING';
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - command.creationTime}ms | Lifecycle: ${lifecycle}`);
        try {
            let usedLocatorInfo = null;
            const { type, payload } = command;
            const locators = payload.locators || [];

            // Perform actions using the new decoupled recovery loop
            if (type === 'CLICK' || type === 'click') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'click', async (loc) => await loc.click(), browserObj, deadlineBudget);
            } else if (type === 'DOUBLE_CLICK' || type === 'dblclick') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'dblclick', async (loc) => await loc.dblclick(), browserObj, deadlineBudget);
            } else if (type === 'DRAG') {
                const path = payload.path || [];
                if (path.length > 0) {
                    if (locators.length > 0) {
                        usedLocatorInfo = await this._executeWithRecovery(command, page, 'drag start', async (loc) => await loc.hover(), browserObj, deadlineBudget);
                    }
                    await page.mouse.move(path[0].x, path[0].y);
                    await page.mouse.down();
                    for (let i = 1; i < path.length; i++) {
                        await page.mouse.move(path[i].x, path[i].y);
                    }
                    await page.mouse.up();
                }
            } else if (type === 'SCROLL' || type === 'wheel') {
                const dx = payload.deltas ? payload.deltas.deltaX : payload.deltaX;
                const dy = payload.deltas ? payload.deltas.deltaY : payload.deltaY;
                await page.mouse.wheel(dx, dy);
            } else if (type === 'INPUT' || type === 'input') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'input', async (loc) => {
                    await loc.fill('');
                    if (payload.delay) {
                        await loc.pressSequentially(payload.value, { delay: payload.delay });
                    } else {
                        await loc.fill(payload.value);
                    }
                }, browserObj, deadlineBudget);
            } else if (type === 'KEYBOARD' || type === 'keyboard') {
                if (locators.length > 0) {
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'keyboard', async (loc) => {
                        await loc.focus();
                        await page.keyboard.press(payload.key);
                    }, browserObj, deadlineBudget);
                } else {
                    await page.keyboard.press(payload.key);
                }
            } else if (type === 'HOVER') {
                await page.mouse.move(payload.coordinates.x, payload.coordinates.y);
            } 
            // Legacy v2 types for fallback
            else if (type === 'pointermove') {
                await page.mouse.move(payload.x, payload.y);
            } else if (type === 'pointerdown') {
                if (locators.length > 0) {
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'pointerdown', async (loc) => await loc.hover(), browserObj, deadlineBudget);
                }
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.down();
            } else if (type === 'pointerup') {
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.up();
            } else if (type === 'focus') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'focus', async (loc) => await loc.focus(), browserObj, deadlineBudget);
            } else if (type === 'blur') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'blur', async (loc) => await loc.blur(), browserObj, deadlineBudget);
            } else if (type === 'window_scroll') {
                await page.evaluate(({x, y}) => window.scrollTo(x, y), { x: payload.scrollX, y: payload.scrollY });
            } else if (type === 'element_scroll') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'element_scroll', async (loc) => {
                    await loc.evaluate((node, data) => {
                        node.scrollTop = data.scrollTop;
                        node.scrollLeft = data.scrollLeft;
                    }, { scrollTop: payload.scrollTop, scrollLeft: payload.scrollLeft });
                }, browserObj, deadlineBudget);
            } else if (type === 'navigate') {
                await page.goto(payload.url, { waitUntil: 'domcontentloaded' });
            } else if (type === 'add_style') {
                await page.addStyleTag({ content: payload.content });
            }
            
            const lifecycle = 'COMPLETED';
            const locatorStr = usedLocatorInfo ? ` | Used Locator: [${usedLocatorInfo.strategy}] ${usedLocatorInfo.locator}` : '';
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Total Time: ${Date.now() - startTime}ms${locatorStr} | Lifecycle: ${lifecycle}`);

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            const lifecycle = 'FAILED';
            
            if (err instanceof QueueDeadlineExceededError || err instanceof GlobalTimeoutError || err instanceof OverlayInterceptionError || err instanceof ElementDetachedError || err instanceof PlaywrightTimeoutError || err instanceof LocatorResolutionError || err instanceof StaleEpochError) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
                return false;
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
