import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';

import { pageStateMonitor } from './locatorIntelligence/resolution/PageStateMonitor.mjs';
import featureFlags from './locatorIntelligence/FeatureFlags.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { DeadlineBudget } from './time/DeadlineBudget.mjs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
    LocatorResolutionError, 
    OverlayInterceptionError, 
    ElementDetachedError, 
    PlaywrightTimeoutError,
    GlobalTimeoutError,
    QueueDeadlineExceededError,
    CandidateGenerationError,
    GenerationScriptMissingError
} from './errors.mjs';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
        this.MAX_EXECUTION_RETRIES = 3;
        this.attachedPages = new WeakSet();
    }

    // Removed _ensureGenerationScriptInjected - Playwright's coreBundle auto-injects its own InjectedScript.

    async injectOverlayScript(page) {
        if (!this.attachedPages.has(page)) {
            this.attachedPages.add(page);
            try {
                const overlayConfigPath = path.join(__dirname, '..', '..', '..', 'config', 'overlays.json');
                const overlayData = JSON.parse(await fsPromises.readFile(overlayConfigPath, 'utf8'));
                
                const overlayScript = `
                    (function() {
                        const overlays = ${JSON.stringify(overlayData.overlays)};
                        
                        function checkAndDismiss(root) {
                            for (const overlay of overlays) {
                                const elements = root.querySelectorAll ? root.querySelectorAll(overlay.locator) : [];
                                for (const el of elements) {
                                    if (el && el.offsetParent !== null && !el.dataset.aoisClicked) {
                                        console.log('[AOIS-NATIVE] Slave sub-millisecond interception of overlay:', overlay.name);
                                        el.dataset.aoisClicked = "true";
                                        el.click();
                                        setTimeout(() => { if (el) delete el.dataset.aoisClicked; }, 1000);
                                    }
                                }
                            }
                        }

                        // Initial check
                        checkAndDismiss(document);

                        // Native sub-millisecond DOM mutation observation
                        const observer = new MutationObserver((mutations) => {
                            let shouldCheck = false;
                            for (const m of mutations) {
                                if (m.addedNodes.length > 0 || m.attributeName === 'class' || m.attributeName === 'style') {
                                    shouldCheck = true;
                                    break;
                                }
                            }
                            if (shouldCheck) {
                                checkAndDismiss(document);
                            }
                        });
                        
                        const targetNode = document.documentElement || document;
                        observer.observe(targetNode, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['class', 'style', 'display']
                        });
                    })();
                `;
                await page.addInitScript(overlayScript);
                await page.evaluate(overlayScript).catch(() => {});
                logger.info(`[AOIS] Slave natively intercepting ${overlayData.overlays.length} overlays via MutationObserver.`);
            } catch (e) {
                logger.warn(`[AOIS] Failed to load overlays.json on Slave: ${e.message}`);
            }
        }
    }

    async _executeWithRecovery(command, page, interactionType, actionFn, browserObj = null, deadlineBudget = null, executionContext = null) {
        if (page && !this.attachedPages.has(page)) {
            this.attachedPages.add(page);
            import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                const bId = browserObj?.id || command.target || 'unknown';
                if (featureFlags.isEnabled('FEATURE_TRACE_CDP_NETWORK')) {
                    try {
                        page.context().newCDPSession(page).then(cdp => {
                            cdp.send('Network.enable').catch(() => {});
                            cdp.on('Network.requestWillBeSent', (e) => {
                                if (e.type === 'Document' || e.type === 'XHR' || e.type === 'Fetch') {
                                    observabilityCollector.emitTransition({
                                        commandId: 'async-network',
                                        traceId: null,
                                        prevState: 'NETWORK_IDLE',
                                        newState: 'NETWORK_REQUEST',
                                        eventName: 'CDP_REQUEST',
                                        owner: 'Playwright',
                                        browserId: bId,
                                        metadata: { url: e.request.url, type: e.type }
                                    });
                                }
                            });
                        }).catch(() => {});
                    } catch (e) {
                        logger.warn(`[ActionSimulator] Failed to attach CDP session: ${e.message}`);
                    }
                }

                page.on('framenavigated', (frame) => {
                    if (frame === page.mainFrame()) {
                        observabilityCollector.emitTransition({ commandId: 'async-nav', traceId: null, prevState: 'ANY', newState: 'NAVIGATED', eventName: 'FRAME_NAVIGATED', owner: 'Playwright', browserId: bId, metadata: { url: frame.url() } });
                    }
                });
                page.on('load', () => {
                    observabilityCollector.emitTransition({ commandId: 'async-nav', traceId: null, prevState: 'ANY', newState: 'LOADED', eventName: 'PAGE_LOAD', owner: 'Playwright', browserId: bId });
                });
            }).catch(() => {});
        }

        let attempts = 0;
        const selector = command.payload.playwrightSelector;
        if (!selector) {
            throw new Error(`[LF-501] No playwrightSelector found in command payload`);
        }

        while (attempts < this.MAX_EXECUTION_RETRIES) {
            attempts++;
            if (deadlineBudget) {
                deadlineBudget.checkOrThrow('ActionSimulator');
            }
            
            // Phase 2: Resolve natively via Playwright
            import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'ASSIGNED',
                    newState: 'LOCATOR_STARTED',
                    eventName: 'LOCATOR_STARTED',
                    owner: 'ActionSimulator',
                    browserId: browserObj?.id || command.target || 'slave'
                });
            }).catch(() => {});

            const playwrightLocator = page.locator(selector);

            import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                observabilityCollector.emitTransition({
                    commandId: command.id || command.commandId,
                    traceId: command.traceId || null,
                    interactionId: command.interactionId || null,
                    prevState: 'LOCATOR_STARTED',
                    newState: 'LOCATOR_FINISHED',
                    eventName: 'LOCATOR_FINISHED',
                    owner: 'ActionSimulator',
                    browserId: browserObj?.id || command.target || 'slave',
                    metadata: { success: true }
                });
            }).catch(() => {});

            // Phase 3: Physical Execution
            const execStart = Date.now();
            try {
                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'LOCATOR_FINISHED',
                        newState: 'PLAYWRIGHT_BEGIN',
                        eventName: 'PLAYWRIGHT_BEGIN',
                        owner: 'ActionSimulator',
                        browserId: browserObj?.id || command.target || 'slave'
                    });
                }).catch(() => {});

                await actionFn(playwrightLocator);
                
                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'PLAYWRIGHT_BEGIN',
                        newState: 'PLAYWRIGHT_END',
                        eventName: 'PLAYWRIGHT_END',
                        owner: 'ActionSimulator',
                        browserId: browserObj?.id || command.target || 'slave',
                        metadata: { success: true }
                    });
                }).catch(() => {});

                const execDur = Date.now() - execStart;
                const eid = command.payload?.identityDocument || command.metadata?.identityDocument;
                TelemetryCollector.recordLifecycleEvent({
                    traceId: command.traceId || command.payload?.traceId || 'tr-unknown',
                    spanId: 'sp-14-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    parentSpanId: 'sp-13-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    stageSequence: 14,
                    stageName: 'PHYSICAL_PLAYWRIGHT_EXECUTION',
                    component: 'ActionSimulator.mjs',
                    method: '_executeWithRecovery',
                    timestamp: Date.now(),
                    browserId: browserObj?.id || command.target || 'slave',
                    interactionId: command.payload?.interactionId || 'ia-unknown',
                    commandId: command.id,
                    interactionType,
                    stageDurationMs: execDur,
                    eidPresent: !!eid,
                    eidHash: command.eidHash || TelemetryCollector.computeEIDHash(eid),
                    validationResult: 'PASS'
                });

                // Success - Log Execution metrics separate from Resolution metrics
                logger.info(`[ActionSimulator] [Cmd: ${command.id}] Execution Success | Action: ${interactionType} | Exec Duration: ${execDur}ms | Retries: ${attempts - 1}`);
                return result; // return the resolution info so caller can log the used locator
                
            } catch (err) {
                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'PLAYWRIGHT_BEGIN',
                        newState: 'PLAYWRIGHT_END',
                        eventName: 'PLAYWRIGHT_END',
                        owner: 'ActionSimulator',
                        browserId: browserObj?.id || command.target || 'slave',
                        metadata: { success: false, error: err.message }
                    });
                }).catch(() => {});
                
                const execDur = Date.now() - execStart;
                const eid = command.payload?.identityDocument || command.metadata?.identityDocument;
                let valRes14 = 'FAIL_AUTOMATION';
                if (err && err.code && String(err.code).startsWith('LF-')) {
                    valRes14 = `FAIL_${String(err.code).replace('-', '')}`;
                } else if (err && err.message && err.message.includes('LF-')) {
                    const match = err.message.match(/\[(LF-\d+)\]/);
                    if (match) valRes14 = `FAIL_${match[1].replace('-', '')}`;
                }
                TelemetryCollector.recordLifecycleEvent({
                    traceId: command.traceId || command.payload?.traceId || 'tr-unknown',
                    spanId: 'sp-14-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    parentSpanId: 'sp-13-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    stageSequence: 14,
                    stageName: 'PHYSICAL_PLAYWRIGHT_EXECUTION',
                    component: 'ActionSimulator.mjs',
                    method: '_executeWithRecovery',
                    timestamp: Date.now(),
                    browserId: browserObj?.id || command.target || 'slave',
                    interactionId: command.payload?.interactionId || 'ia-unknown',
                    commandId: command.id,
                    interactionType,
                    stageDurationMs: execDur,
                    eidPresent: !!eid,
                    eidHash: command.eidHash || TelemetryCollector.computeEIDHash(eid),
                    validationResult: valRes14,
                    errorDetails: { errorCode: valRes14.replace('FAIL_', ''), errorMessage: err.message || String(err) }
                });

                if (err instanceof QueueDeadlineExceededError || err instanceof GlobalTimeoutError || err instanceof LocatorResolutionError) {
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

                logger.warn(`[ActionSimulator] [Cmd: ${command.id}] ${automationError.code} Execution failed on attempt ${attempts}: ${automationError.message}. Triggering re-resolution.`);
                
                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'EXECUTING',
                        newState: 'RECOVERING',
                        eventName: 'SIMULATOR_RECOVERING',
                        owner: 'ActionSimulator',
                        browserId: browserObj?.id || command.target || 'slave',
                        metadata: { attempt: attempts, error: automationError.code }
                    });
                }).catch(() => {});
                
                TelemetryCollector.recordLifecycleEvent({
                    traceId: command.traceId || command.payload?.traceId || 'tr-unknown',
                    spanId: 'sp-retry-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    parentSpanId: 'sp-14-' + (browserObj?.id || command.target || 'unknown').slice(0, 4),
                    stageSequence: 14.5,
                    stageName: 'PHYSICAL_PLAYWRIGHT_RETRY',
                    component: 'ActionSimulator.mjs',
                    method: '_executeWithRecovery',
                    timestamp: Date.now(),
                    browserId: browserObj?.id || command.target || 'slave',
                    commandId: command.id,
                    interactionType,
                    attempt: attempts,
                    remainingRetries: this.MAX_EXECUTION_RETRIES - attempts,
                    timeRemaining: deadlineBudget ? deadlineBudget.timeRemaining() : null,
                    mappedError: automationError ? automationError.code : 'UNKNOWN'
                });


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
        
        await this.injectOverlayScript(page);
        const lifecycle = 'EXECUTING';
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - command.creationTime}ms | Lifecycle: ${lifecycle}`);
        try {
            let usedLocatorInfo = null;
            const { type, payload } = command;
            const locators = payload.locators || [];

            // Perform actions using the new decoupled recovery loop
            const getTimeout = (budget) => budget ? Math.max(10, budget.timeRemaining()) : 30000;
            const tOpts = { timeout: getTimeout(deadlineBudget) };

            if (type === 'CLICK' || type === 'click') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'click', async (loc) => await loc.click(tOpts), browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'DOUBLE_CLICK' || type === 'dblclick') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'dblclick', async (loc) => await loc.dblclick(tOpts), browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'DRAG') {
                const path = payload.path || [];
                if (path.length > 0) {
                    if (locators.length > 0) {
                        usedLocatorInfo = await this._executeWithRecovery(command, page, 'drag start', async (loc) => await loc.hover(tOpts), browserObj, deadlineBudget, options.executionContext);
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
                    await loc.fill('', tOpts);
                    if (payload.delay) {
                        await loc.pressSequentially(payload.value, { delay: payload.delay, ...tOpts });
                    } else {
                        await loc.fill(payload.value, tOpts);
                    }
                }, browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'KEYBOARD' || type === 'keyboard') {
                if (locators.length > 0) {
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'keyboard', async (loc) => {
                        await loc.focus(tOpts);
                        await page.keyboard.press(payload.key);
                    }, browserObj, deadlineBudget, options.executionContext);
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
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'pointerdown', async (loc) => await loc.hover(tOpts), browserObj, deadlineBudget, options.executionContext);
                }
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.down();
            } else if (type === 'pointerup') {
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.up();
            } else if (type === 'focus') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'focus', async (loc) => await loc.focus(tOpts), browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'blur') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'blur', async (loc) => await loc.blur(tOpts), browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'window_scroll') {
                await page.evaluate(({x, y}) => window.scrollTo(x, y), { x: payload.scrollX, y: payload.scrollY });
            } else if (type === 'element_scroll') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'element_scroll', async (loc) => {
                    await loc.evaluate((node, data) => {
                        node.scrollTop = data.scrollTop;
                        node.scrollLeft = data.scrollLeft;
                    }, { scrollTop: payload.scrollTop, scrollLeft: payload.scrollLeft });
                }, browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'navigate') {
                const navClass = command.navClass || payload.navClass || 'PRIMARY_NAV';
                if (navClass !== 'PRIMARY_NAV' && navClass !== 'CORRECTIVE_NAV') {
                    logger.info(`[ActionSimulator] Ignoring navigate command with navClass: ${navClass}`);
                    return true;
                }

                const { url, causality, navType } = payload;
                logger.info(`[ActionSimulator] Received Navigation command: ${url} (Causality: ${causality}, NavType: ${navType}, NavClass: ${navClass})`);
                
                if (causality === 'browser_initiated' || navType === 'external') {
                    logger.info(`[ActionSimulator] Executing immediate navigation override: ${url} (${causality})`);
                    await page.goto(url, { waitUntil: 'domcontentloaded', ...tOpts });
                } else if (navType === 'reload') {
                    logger.info(`[ActionSimulator] Executing immediate reload`);
                    await page.reload({ waitUntil: 'domcontentloaded', ...tOpts });
                } else if (navType === 'traverse') {
                    logger.info(`[ActionSimulator] Executing immediate traverse to: ${url}`);
                    await page.goto(url, { waitUntil: 'domcontentloaded', ...tOpts });
                } else if (causality === 'page_initiated' && (navType === 'push' || navType === 'replace')) {
                    logger.info(`[ActionSimulator] Asserting native route via waitForURL: ${url}`);
                    try {
                        await page.waitForURL(url, { timeout: 30000 });
                        logger.info(`[ActionSimulator] Native routing successful: ${url}`);
                    } catch (e) {
                        // SPEC-04: If we timed out waiting for the URL, check if we're already there.
                        // A preceding CLICK might have already completed the navigation.
                        if (page.url() === url) {
                            logger.info(`[ActionSimulator] Synthetic navigation to ${url} timed out, but page is already at target URL. Proceeding.`);
                            // Success bypass - do not throw
                        } else {
                            throw e; // genuine failure
                        }
                    }
                } else {
                    // Fallback for any unexpected types
                    await page.goto(url, { waitUntil: 'domcontentloaded', ...tOpts });
                }
            } else if (type === 'add_style') {
                await page.addStyleTag({ content: payload.content });
            }
            
            const lifecycle = 'COMPLETED';
            const locatorStr = usedLocatorInfo ? ` | Used Locator: [${usedLocatorInfo.strategy}] ${usedLocatorInfo.locator}` : '';
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Total Time: ${Date.now() - startTime}ms${locatorStr} | Lifecycle: ${lifecycle}`);



            if (this.registry) {
                this.registry.incrementSlaveGes(id);
            }

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            const lifecycle = 'FAILED';
            
            if (err instanceof QueueDeadlineExceededError || err instanceof GlobalTimeoutError || err instanceof OverlayInterceptionError || err instanceof ElementDetachedError || err instanceof PlaywrightTimeoutError || err instanceof LocatorResolutionError) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
                return false;
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
