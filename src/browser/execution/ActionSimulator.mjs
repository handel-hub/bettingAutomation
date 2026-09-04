import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { LocatorResolver } from './LocatorResolver.mjs';
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
    GenerationScriptMissingError,
    TerminalExecutionError,
    UncertainStateError
} from './errors.mjs';

export class ActionSimulator extends EventEmitter {
    constructor(runOrchestrator = null) {
        super();
        this.runOrchestrator = runOrchestrator;
        this.MAX_EXECUTION_RETRIES = 3;
        this.attachedPages = new WeakSet();
    }

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
        let result = null;

        while (attempts < this.MAX_EXECUTION_RETRIES) {
            attempts++;
            if (deadlineBudget) {
                deadlineBudget.checkOrThrow('ActionSimulator');
            }
            
            // Phase 2: Hybrid Resolution (Fast Path -> Fallback Path)
            const resolveOpts = {
                browserId: browserObj?.id || command.metadata?.browserId || command.target,
                msn: command.metadata?.msn || command.payload?.msn,
                shadowPath: command.payload?.shadowPath || [],
                identityDocument: command.payload?.identityDocument || command.metadata?.identityDocument,
                playwrightSelector: command.payload?.playwrightSelector || command.metadata?.playwrightSelector || command.payload?.selector,
                deadlineBudget,
                traceId: command.traceId || command.payload?.traceId,
                eidHash: command.eidHash || command.payload?.eidHash,
                commandId: command.id,
                interactionId: command.payload?.interactionId,
                executionContext
            };

            const playwrightSelector = command.payload?.playwrightSelector || command.metadata?.playwrightSelector || command.payload?.selector;

            const evalId = command.metadata?.shadowEvaluationId || command.traceId;

            if (playwrightSelector) {
                try {
                    logger.info({ event: 'PLAYWRIGHT_LOCATOR_RESOLUTION_START', shadowEvaluationId: evalId, commandId: command.id, locator: playwrightSelector }, `[ActionSimulator] Starting fast path locator resolution.`);
                    // Fast Path: Try Playwright native strict selector first
                    const loc = page.locator(playwrightSelector);
                    // Fast fail to ensure it's attached and strict mode passes (can be overridden by payload)
                    const waitTimeout = command.payload?.locatorTimeout || command.metadata?.locatorTimeout || 500;
                    await loc.waitFor({ state: 'attached', timeout: waitTimeout });
                    
                    logger.info({ event: 'PLAYWRIGHT_LOCATOR_RESOLUTION_SUCCESS', shadowEvaluationId: evalId, commandId: command.id, locator: playwrightSelector }, `[ActionSimulator] Fast path locator resolution successful.`);
                    result = {
                        success: true,
                        playwrightLocator: loc,
                        locator: { value: playwrightSelector, strategy: 'playwright' },
                        isFallback: false
                    };
                } catch (err) {
                    logger.info({ event: 'PLAYWRIGHT_LOCATOR_RESOLUTION_FAILURE', shadowEvaluationId: evalId, commandId: command.id, error: err.message, locator: playwrightSelector }, `[ActionSimulator] Fast path strict locator failed: ${err.message}.`);
                    result = null;
                }
            }

            if (!result && resolveOpts.identityDocument) {
                // Fallback Path: Probabilistic Ranking
                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'ASSIGNED',
                        newState: 'LOCATOR_STARTED',
                        eventName: 'LOCATOR_STARTED',
                        owner: 'ActionSimulator',
                        browserId: resolveOpts.browserId
                    });
                }).catch(() => {});

                // We pass an empty locators array; LocatorResolver will pull candidates based on the identityDocument
                result = await LocatorResolver.resolve(page, [], interactionType, undefined, resolveOpts);

                import('./telemetry/ObservabilityCollector.mjs').then(({ observabilityCollector }) => {
                    observabilityCollector.emitTransition({
                        commandId: command.id || command.commandId,
                        traceId: command.traceId || null,
                        interactionId: command.interactionId || null,
                        prevState: 'LOCATOR_STARTED',
                        newState: 'LOCATOR_FINISHED',
                        eventName: 'LOCATOR_FINISHED',
                        owner: 'ActionSimulator',
                        browserId: resolveOpts.browserId,
                        metadata: { success: result?.success }
                    });
                }).catch(() => {});
            }
            
            if (!result || !result.success) {
                const failureReason = result?.failureReason || 'Fast path and fallback path both failed.';
                if (failureReason.includes('LF-702')) {
                    const error = new QueueDeadlineExceededError(failureReason);
                    throw error;
                }
                const error = new GlobalTimeoutError(failureReason);
                error.addChain(`[LF-504] Resolution failed during execution attempt ${attempts}`);
                throw error;
            }

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

                const evalId = command.metadata?.shadowEvaluationId || command.traceId;
                logger.info({ event: 'PLAYWRIGHT_INPUT_START', shadowEvaluationId: evalId, commandId: command.id, actionType: interactionType }, `[ActionSimulator] Executing Playwright actuation.`);
                
                try {
                    await actionFn(result.playwrightLocator);
                    logger.info({ event: 'PLAYWRIGHT_INPUT_SUCCESS', shadowEvaluationId: evalId, commandId: command.id, actionType: interactionType, durationMs: Date.now() - execStart }, `[ActionSimulator] Playwright actuation successful.`);
                } catch (actionErr) {
                    logger.info({ event: 'PLAYWRIGHT_INPUT_FAILURE', shadowEvaluationId: evalId, commandId: command.id, error: actionErr.message, actionType: interactionType }, `[ActionSimulator] Playwright actuation failed: ${actionErr.message}`);
                    throw actionErr;
                }
                
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

                if (automationError instanceof PlaywrightTimeoutError && command.idempotent === false) {
                    throw new UncertainStateError(`[LF-306] Timeout on non-idempotent command: ${automationError.message}`);
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
        const type = command?.type || 'UNKNOWN';
        const evalId = command?.metadata?.shadowEvaluationId || command?.traceId;

        if (page && !page.__forensicsAttached) {
            page.__forensicsAttached = true;
            page.on('console', msg => {
                const text = msg.text();
                if (text.startsWith('FORENSIC_LOG:')) {
                    try {
                        const { evt, meta, ts } = JSON.parse(text.slice(13));
                        import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                            forensicLogger.log(evt, { ...meta, browserTimestamp: ts });
                        }).catch(()=>{});
                    } catch(e){}
                }
            });
        }

        if (command) {
            import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                forensicLogger.log('ACTION_SIMULATOR_START', {
                    commandId: command.id,
                    commandType: type,
                    source: command.source,
                    accountId: id,
                    browserId: id,
                    GES: command.ges,
                    cycleId: command.cycleId,
                    preparationId: command.metadata?.shadowEvaluationId || null
                });
            }).catch(()=>{});
        }

        logger.info({ event: 'ACTION_SIMULATOR_RECEIVED', shadowEvaluationId: evalId, commandId: command?.id, browserId: id, commandType: type }, `[ActionSimulator] Received command ${command?.id} [${type}] for execution.`);
        
        // Transactional Safety Guard (Phase 1)
        if (command && command.idempotent === false) {
            if (!this.runOrchestrator) {
                logger.error(`[Security] Simulator lacks RunOrchestrator to validate transactional command ${command.id}`);
                return false;
            }
            if (!this.runOrchestrator.validateActiveCycle(command.cycleId)) {
                const err = new Error(`Transaction Rejected: Command lacks valid cycle lease.`);
                logger.error(`[Security] [${id}] Rejected command ${command.id}. ${err.message}`);
                this.emit('ActionFailure', { id, command, error: err });
                return false;
            }
        }

        const deadlineBudget = options.deadlineBudget || DeadlineBudget.fromCommand(command, 1500);

        try {
            deadlineBudget.checkOrThrow('ActionSimulator');
        } catch (err) {
            logger.warn(`[Interaction Failure] Command ${command?.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ABORTED`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
        
        await this.injectOverlayScript(page);
        const lifecycle = 'EXECUTING';
        
        // Print Semantics and Latency for Observability
        const pwSelector = command.payload?.playwrightSelector || command.metadata?.playwrightSelector || command.payload?.selector || 'NONE';
        const eid = command.payload?.identityDocument || command.metadata?.identityDocument;
        const tag = eid?.tag || 'unknown';
        const role = eid?.role || 'unknown';
        let text = 'none';
        if (eid?.text) {
            text = typeof eid.text === 'string' ? eid.text.trim().slice(0, 30).replace(/\n/g, ' ') : String(eid.text).slice(0, 30);
        }
        
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - (command.creationTime || startTime)}ms | Lifecycle: ${lifecycle}`);
        logger.info(`  --> [Semantics] Playwright Selector: ${pwSelector}`);
        if (eid) {
            logger.info(`  --> [Semantics] Identity Doc: <${tag} role="${role}"> "${text}" (Hash: ${eid.identityHash?.slice(0,8)})`);
        } else {
            logger.info(`  --> [Semantics] Identity Doc: NONE (Legacy/Macro execution)`);
        }
        
        try {
            let usedLocatorInfo = null;
            const { type, payload } = command;
            const locators = payload.locators || [];

            // Perform actions using the new decoupled recovery loop
            const getTimeout = (budget) => budget ? Math.max(10, budget.timeRemaining()) : 30000;
            const tOpts = { timeout: getTimeout(deadlineBudget) };
            
            // Bypass Playwright's actionability visibility/overlay checks for internal workflows.
            // This is required because BetCycle injects an __auto_lock overlay to prevent user interference,
            // which would otherwise block Playwright's own simulated clicks.
            if (command.source === 'BetCycle') {
                tOpts.force = true;
            }

            if (type === 'EVENT_BURST') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'event_burst', async (loc) => {
                    const events = payload.events || ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'];
                    await loc.evaluate((el, evs) => {
                        evs.forEach(evName => {
                            if (evName.startsWith('touch')) {
                                // Must use real TouchEvent for mobile Vue.js components
                                el.dispatchEvent(new TouchEvent(evName, { bubbles: true, cancelable: true }));
                            } else if (evName.startsWith('mouse') || evName === 'click') {
                                el.dispatchEvent(new MouseEvent(evName, { bubbles: true, cancelable: true, view: window }));
                            } else {
                                el.dispatchEvent(new Event(evName, { bubbles: true }));
                            }
                        });
                    }, events);
                }, browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'MACRO_DELAY') {
                await new Promise(r => setTimeout(r, payload.ms || 250));
            } else if (type === 'ATOMIC_PLACE_BET') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'atomic_place', async (loc) => {
                    import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                        forensicLogger.log('ATOMIC_PLACE_BET_START', { commandId: command.id });
                    }).catch(()=>{});

                    await loc.evaluate((wrapEl, data) => {
                        const forensic = (evt, meta) => console.log('FORENSIC_LOG:' + JSON.stringify({ evt, meta, ts: performance.now() }));
                        
                        // 1. VERIFY ODDS & STAKE NATIVELY
                        const confirmBtn = document.querySelector(data.confirmSelector);
                        const isConfirmScreen = confirmBtn && confirmBtn.getBoundingClientRect().height > 0;

                        const oddsEl = document.querySelector(data.oddsSelector);
                        let currentOdds = null;
                        if (oddsEl) {
                            const text = oddsEl.innerText || oddsEl.textContent || '';
                            currentOdds = parseFloat(text);
                        }
                        forensic('ATOMIC_ODDS_READ', { expectedOdds: data.expectedOdds, actualOdds: currentOdds });
                        forensic('ATOMIC_ODDS_COMPARISON', { match: currentOdds === data.expectedOdds });
                        
                        let actualStake = null;
                        let rawVal = null;
                        if (isConfirmScreen && data.confirmStakeSelector) {
                            const confStakeEl = document.querySelector(data.confirmStakeSelector);
                            if (confStakeEl) {
                                rawVal = confStakeEl.innerText || confStakeEl.textContent || '';
                                actualStake = parseFloat(rawVal.replace(/[^\d.]/g, ''));
                            }
                        } else {
                            const stakeEl = document.querySelector(data.stakeSelector) || document.querySelector('.m-input') || document.querySelector('input[type="number"]');
                            if (stakeEl) {
                                rawVal = stakeEl.value !== undefined ? stakeEl.value : (stakeEl.innerText || stakeEl.textContent || '');
                                actualStake = parseFloat(rawVal.replace(/[^\d.]/g, ''));
                            }
                        }
                        
                        forensic('ATOMIC_STAKE_READ', { expectedStake: data.expectedStake, actualStake, rawVal });

                        if (currentOdds !== data.expectedOdds) {
                            forensic('ATOMIC_RESULT', { result: 'ABORTED_ODDS' });
                            throw new Error(`[ATOMIC-ABORT] Expected odds ${data.expectedOdds} but found ${currentOdds}`);
                        }

                        if (actualStake !== data.expectedStake) {
                            forensic('ATOMIC_RESULT', { result: 'ABORTED_STAKE' });
                            throw new Error(`[ATOMIC-ABORT] Expected stake ${data.expectedStake} but found ${actualStake} in the DOM`);
                        }
                        
                        // INJECT CMS STATE TRACKER BEFORE CLICK
                        window.__cmsTracker = { log: [], processingSeen: false };
                        const cmsObserver = new MutationObserver((mutations) => {
                            for (let m of mutations) {
                                // 1. DETECT APPEARANCE (Node added to DOM)
                                if (m.type === 'childList' && m.addedNodes.length > 0) {
                                    m.addedNodes.forEach(n => {
                                        if (n.nodeType === 1) {
                                            const keys = [...n.querySelectorAll('[data-cms-key]'), n].filter(i => i.hasAttribute && i.hasAttribute('data-cms-key'));
                                            keys.forEach(k => {
                                                const key = k.getAttribute('data-cms-key');
                                                window.__cmsTracker.log.push({ key, time: Date.now(), event: 'added' });
                                                if (key === 'submitting' || key.includes('process') || key.includes('loading') || key.includes('confirm')) {
                                                    window.__cmsTracker.processingSeen = true;
                                                }
                                                if (key === 'submitting') {
                                                    console.log(`%c >>> SUBMITTING STARTED: ${new Date().toLocaleTimeString()}`, "color: white; background: #27ae60; font-weight: bold; padding: 4px; border-radius: 3px;");
                                                }
                                            });
                                        }
                                    });
                                }

                                // 2. DETECT DISAPPEARANCE (Node removed from DOM)
                                if (m.type === 'childList' && m.removedNodes.length > 0) {
                                    m.removedNodes.forEach(n => {
                                        if (n.nodeType === 1) {
                                            const keys = [...n.querySelectorAll('[data-cms-key]'), n].filter(i => i.hasAttribute && i.hasAttribute('data-cms-key'));
                                            keys.forEach(k => {
                                                const key = k.getAttribute('data-cms-key');
                                                window.__cmsTracker.log.push({ key, time: Date.now(), event: 'removed' });
                                                if (key === 'submitting') {
                                                    console.log(`%c <<< SUBMITTING FINISHED: ${new Date().toLocaleTimeString()}`, "color: white; background: #c0392b; font-weight: bold; padding: 4px; border-radius: 3px;");
                                                }
                                            });
                                        }
                                    });
                                }
                                
                                // 3. DETECT ATTRIBUTE CHANGE
                                if (m.type === 'attributes' && m.attributeName === 'data-cms-key') {
                                    const newKey = m.target.getAttribute('data-cms-key');
                                    if (newKey) {
                                        window.__cmsTracker.log.push({ key: newKey, time: Date.now(), event: 'attr_added' });
                                        if (newKey === 'submitting' || newKey.includes('process') || newKey.includes('loading') || newKey.includes('confirm')) {
                                            window.__cmsTracker.processingSeen = true;
                                        }
                                        if (newKey === 'submitting') {
                                            console.log(`%c >>> SUBMITTING STARTED (Attribute): ${new Date().toLocaleTimeString()}`, "color: white; background: #27ae60; font-weight: bold;");
                                        }
                                    } else if (m.oldValue) {
                                        window.__cmsTracker.log.push({ key: m.oldValue, time: Date.now(), event: 'attr_removed' });
                                        if (m.oldValue === 'submitting') {
                                            console.log(`%c <<< SUBMITTING FINISHED (Attribute): ${new Date().toLocaleTimeString()}`, "color: white; background: #c0392b; font-weight: bold;");
                                        }
                                    }
                                }
                            }
                        });

                        console.log("%c Life-Cycle Tracker Active: Monitoring 'submitting' appearance/disappearance...", "color: white; background: #2c3e50; padding: 4px;");
                        cmsObserver.observe(document.body, { 
                            childList: true, 
                            subtree: true, 
                            attributes: true, 
                            attributeOldValue: true,
                            attributeFilter: ['data-cms-key'] 
                        });
                        // Let it run for 10 seconds, then disconnect to prevent memory leaks
                        setTimeout(() => {
                            cmsObserver.disconnect();
                            console.log("%c Life-Cycle Tracker Disconnected.", "color: white; background: #7f8c8d; padding: 4px;");
                        }, 10000);

                        // 2. CHECK DOM STATE
                        const placeBtn = wrapEl.querySelector(data.placeBetSelector) || document.querySelector(data.placeBetSelector);
                        
                        // STATE A: WE ARE ALREADY ON THE CONFIRM SCREEN
                        if (isConfirmScreen) {
                            forensic('ATOMIC_CLICK', { target: 'Confirm (Already Advanced)' });
                            confirmBtn.click();
                        } 
                        // STATE B: WE ARE ON THE PLACE BET SCREEN
                        else if (placeBtn && placeBtn.getBoundingClientRect().height > 0) {
                            forensic('ATOMIC_CLICK', { target: 'Primary' });
                            placeBtn.click();
                            
                            // Setup an ultra-fast observer to click Confirm the millisecond it appears
                            if (data.confirmSelector) {
                                const wrap = wrapEl || document.body;
                                const observer = new MutationObserver((mutations, obs) => {
                                    const newConfirmBtn = document.querySelector(data.confirmSelector);
                                    if (newConfirmBtn && newConfirmBtn.getBoundingClientRect().height > 0) {
                                        newConfirmBtn.click();
                                        obs.disconnect();
                                    }
                                });
                                
                                observer.observe(wrap, {
                                    childList: true, 
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ['style', 'class']
                                });
                                
                                // Auto-disconnect after 2.5 seconds to prevent memory leaks 
                                setTimeout(() => observer.disconnect(), 2500);
                            }
                        } 
                        // STATE C: FATAL UI DESYNC
                        else {
                            throw new Error("[ATOMIC-ABORT] Neither Place Bet nor Confirm buttons are visible.");
                        }
                    }, command.payload);
                }, browserObj, deadlineBudget, options.executionContext);
            } else if (type === 'CLICK' || type === 'click') {
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
                const scrollMeta = command.metadata?.scroll;
                if (scrollMeta && (scrollMeta.rhoX !== undefined && scrollMeta.rhoY !== undefined)) {
                    await page.evaluate(async ({rhoX, rhoY, containerId}) => {
                        let target = document.documentElement;
                        if (containerId && containerId !== 'window') {
                            if (containerId.includes('=')) {
                                target = document.querySelector(`[${containerId}]`);
                            } else {
                                target = document.querySelector(containerId); // e.g. path
                            }
                        }
                        
                        if (target) {
                            const limitX = Math.max(0, target.scrollWidth - target.clientWidth);
                            const limitY = Math.max(0, target.scrollHeight - target.clientHeight);
                            
                            if (target === document.documentElement) {
                                window.scrollTo({
                                    left: rhoX !== undefined && limitX > 0 ? Math.round(rhoX * limitX) : window.pageXOffset,
                                    top: rhoY !== undefined && limitY > 0 ? Math.round(rhoY * limitY) : window.pageYOffset,
                                    behavior: 'instant'
                                });
                            } else {
                                const opts = { behavior: 'instant' };
                                if (rhoX !== undefined && limitX > 0) opts.left = Math.round(rhoX * limitX);
                                if (rhoY !== undefined && limitY > 0) opts.top = Math.round(rhoY * limitY);
                                if (opts.left !== undefined || opts.top !== undefined) {
                                    target.scrollTo(opts);
                                }
                            }
                        }
                    }, { rhoX: scrollMeta.rhoX, rhoY: scrollMeta.rhoY, containerId: scrollMeta.containerId });
                } else {
                    const dx = payload.deltas ? payload.deltas.deltaX : payload.deltaX;
                    const dy = payload.deltas ? payload.deltas.deltaY : payload.deltaY;
                    await page.mouse.wheel(dx, dy);
                }
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
                if (payload.playwrightSelector || payload.identityDocument) {
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'hover', async (loc) => await loc.hover(tOpts), browserObj, deadlineBudget, options.executionContext);
                } else if (payload.coordinates) {
                    await page.mouse.move(payload.coordinates.x, payload.coordinates.y);
                }
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
                await page.evaluate(({x, y}) => window.scrollTo({ left: x, top: y, behavior: 'instant' }), { x: payload.scrollX, y: payload.scrollY });
            } else if (type === 'element_scroll') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'element_scroll', async (loc) => {
                    await loc.evaluate((node, data) => {
                        node.scrollTo({
                            top: data.scrollTop,
                            left: data.scrollLeft,
                            behavior: 'instant'
                        });
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
            
            const executeEndMs = Date.now();
            const lifecycle = 'COMPLETED';
            const locatorStr = usedLocatorInfo ? ` | Used Locator: [${usedLocatorInfo.strategy}] ${usedLocatorInfo.locator}` : '';
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Total Time: ${executeEndMs - startTime}ms${locatorStr} | Lifecycle: ${lifecycle}`);

            if (command.captureTime && (type === 'SCROLL' || type === 'wheel')) {
                const captureToExecuteMs = executeEndMs - command.captureTime;
                logger.info(`[Phase 1 Instrumentation] capture_to_execute_ms = ${captureToExecuteMs}ms (Command: ${command.id})`);
            }



            if (command) {
                import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                    forensicLogger.log('ACTION_SIMULATOR_SUCCESS', {
                        commandId: command.id,
                        accountId: id,
                        duration: Date.now() - startTime
                    });
                    forensicLogger.log('ACTION_SIMULATOR_END', {
                        commandId: command.id,
                        accountId: id,
                        result: 'SUCCESS'
                    });
                }).catch(()=>{});
            }

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            const lifecycle = 'FAILED';
            
            if (command) {
                import('../forensics/ForensicLogger.mjs').then(({ forensicLogger }) => {
                    forensicLogger.log('ACTION_SIMULATOR_FAILURE', {
                        commandId: command.id,
                        accountId: id,
                        error: err.message,
                        duration: Date.now() - startTime
                    });
                    forensicLogger.log('ACTION_SIMULATOR_END', {
                        commandId: command.id,
                        accountId: id,
                        result: 'FAILURE'
                    });
                }).catch(()=>{});
            }

            if (err instanceof UncertainStateError) {
                logger.warn(`[Interaction Uncertain] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: UNCERTAIN`);
                this.emit('ActionUncertain', { id, command, error: err });
                throw err;
            }

            if (err instanceof QueueDeadlineExceededError || err instanceof GlobalTimeoutError || err instanceof OverlayInterceptionError || err instanceof ElementDetachedError || err instanceof PlaywrightTimeoutError || err instanceof LocatorResolutionError) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
                throw new TerminalExecutionError(err.message);
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
            this.emit('ActionFailure', { id, command, error: err });
            throw new TerminalExecutionError(err.message);
        }
    }
}
