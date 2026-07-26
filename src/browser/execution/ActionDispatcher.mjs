import { logger } from '../../config.mjs';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
import crypto from 'node:crypto';
import { Command } from './Command.mjs';
import { FramePathBuilder } from '../synchronization/providers/frame/FramePathBuilder.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';
import featureFlags from './locatorIntelligence/FeatureFlags.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ActionDispatcher extends EventEmitter {
    constructor(settings, registry) {
        super();
        this.registry = registry;
        this.memorySettings = settings.Memory || {};
        
        this.sequenceFile = path.join(__dirname, '..', '..', '..', 'sequences', 'startup.json');
        this.actions = [];
        this.saveTimeout = null;
        this.isSaving = false;
        this.savePending = false;

        process.on('SIGINT', () => this.flushSync());
        process.on('beforeExit', () => this.flushSync());
    }

    async init() {
        if (fs.existsSync(this.sequenceFile)) {
            try { this.actions = JSON.parse(await fsPromises.readFile(this.sequenceFile, 'utf-8')); } catch(e) {}
        }
        await this.buildInjectedScript();
    }

    async buildInjectedScript() {
        const pipelineFiles = [
            'FeatureFlags.mjs',
            'models/ValidationResult.mjs',
            'models/RankingResult.mjs',
            'models/LocatorCandidate.mjs',
            'models/ElementIdentityDocument.mjs',
            'models/ScoringVector.mjs',
            'engine/PipelineContext.mjs',
            'engine/PipelineStep.mjs',
            'extraction/FeatureExtractor.mjs',
            'extraction/IdentityDocumentBuilder.mjs',
            'generation/strategies/DataAttributeStrategy.mjs',
            'generation/strategies/TextStrategy.mjs',
            'generation/strategies/AriaStrategy.mjs',
            'generation/strategies/RoleStrategy.mjs',
            'generation/strategies/SemanticClassStrategy.mjs',
            'generation/strategies/StructuralStrategy.mjs',
            'generation/CandidateGenerator.mjs',
            'generation/CandidateDeduplicator.mjs',
            'validation/CandidateValidator.mjs',
            'validation/StructuralAnalyzer.mjs',
            'ranking/RankingRule.mjs',
            'ranking/RankingRules/BaseScoreRule.mjs',
            'ranking/RankingRules/DynamicContentRule.mjs',
            'ranking/RankingRules/ValidationConfidenceRule.mjs',
            'ranking/RankingRules/SpecificityRule.mjs',
            'ranking/RankingRules/ComplexityRule.mjs',
            'ranking/RankingRules/StructuralRule.mjs',
            'ranking/RankingRules/VisibilityRule.mjs',
            'ranking/RankingRules/CorroborationRule.mjs',
            'ranking/RankingRules/NormalizedBaseScoreRule.mjs',
            'ranking/RankingRules/NormalizedStructuralRule.mjs',
            'ranking/RankingRules/NormalizedDynamicContentRule.mjs',
            'ranking/RankingRules/NormalizedSpecificityRule.mjs',
            'ranking/RankingRules/NormalizedCorroborationRule.mjs',
            'ranking/RankingRules/NormalizedVisibilityRule.mjs',
            'ranking/RankingConfig.mjs',
            'ranking/ScoringWeights.mjs',
            'ranking/RankingEngine.mjs',
            'ranking/AdditiveRankingEngine.mjs',
            'serialization/LocatorSerializer.mjs',
            'telemetry/RollingWindow.mjs',
            'telemetry/MetricsRegistry.mjs',
            'telemetry/TelemetryCollector.mjs',
            'engine/LocatorIntelligenceEngine.mjs'
        ];

        let locatorIntelligenceCode = '';
        for (const file of pipelineFiles) {
            const filePath = path.join(__dirname, 'locatorIntelligence', file);
            let content = await fsPromises.readFile(filePath, 'utf8');
            content = content.replace(/^\uFEFF/, '')
                             .replace(/^\s*export\s+default\s+.*$/gm, '')
                             .replace(/^\s*export\s+/gm, '')
                             .replace(/^\s*import\s+.*$/gm, '');
            locatorIntelligenceCode += content + '\n\n';
        }

        const scriptContent = `
            (() => {
            if (window.__locatorIntelligenceInjected) return;
            window.__locatorIntelligenceInjected = true;
            window.__ANTIGRAVITY_SEQ__ = 0;
            window.__ANTIGRAVITY_EPOCH__ = window.__ANTIGRAVITY_EPOCH__ || 0;
            window.__ANTIGRAVITY_EPOCH_URL__ = window.__ANTIGRAVITY_EPOCH_URL__ || location.href;
            window.__ANTIGRAVITY_EPOCH_TS__ = window.__ANTIGRAVITY_EPOCH_TS__ || Date.now();

            (function() {
                const _origPush = history.pushState;
                const _origReplace = history.replaceState;
                
                history.pushState = function(...args) {
                    _origPush.apply(this, args);
                    if (window.__notifyNavigation) {
                        window.__notifyNavigation({ 
                            type: 'pushState', 
                            url: location.href, 
                            epoch: window.__ANTIGRAVITY_EPOCH__,
                            timestamp: Date.now(),
                            monotonicUs: Math.round(performance.now() * 1000)
                        });
                    }
                };
                
                history.replaceState = function(...args) {
                    _origReplace.apply(this, args);
                    if (window.__notifyNavigation) {
                        window.__notifyNavigation({ 
                            type: 'replaceState', 
                            url: location.href, 
                            epoch: window.__ANTIGRAVITY_EPOCH__,
                            timestamp: Date.now(),
                            monotonicUs: Math.round(performance.now() * 1000)
                        });
                    }
                };
                
                window.addEventListener('popstate', function() {
                    if (window.__notifyNavigation) {
                        window.__notifyNavigation({ 
                            type: 'popstate', 
                            url: location.href, 
                            epoch: window.__ANTIGRAVITY_EPOCH__,
                            timestamp: Date.now(),
                            monotonicUs: Math.round(performance.now() * 1000)
                        });
                    }
                });
            })();

            const locatorIntelligencePipelineStart = Date.now();
            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            // --------------------------------------------------------
            // LOCATOR INTELLIGENCE ENGINE (STAGE 2.1 - PIPELINE)
            // --------------------------------------------------------
            ${locatorIntelligenceCode}
            // --------------------------------------------------------

            function sendExecution(type, payload) {
                if (window.dispatchExecutionEvent) {
                    payload.timestamp = Date.now();
                    payload.captureTime = Date.now();
                    payload.monotonicUs = Math.round(performance.now() * 1000);
                    payload.captureEpoch = window.__ANTIGRAVITY_EPOCH__ || 0;
                    payload.captureEpochUrl = window.__ANTIGRAVITY_EPOCH_URL__ || '';
                    payload.capturePerformanceTime = performance.now();
                    payload.payloadVersion = 3;
                    
                    TelemetryCollector.recordLifecycleEvent({
                        traceId: payload.traceId || 'tr-unknown',
                        spanId: 'sp-06',
                        parentSpanId: 'sp-02',
                        stageSequence: 6,
                        stageName: 'IPC_TRANSMITTED',
                        component: 'ActionDispatcher.mjs',
                        method: 'sendExecution',
                        timestamp: Date.now(),
                        interactionId: payload.interactionId,
                        interactionType: type,
                        payloadSize: JSON.stringify(payload).length,
                        eidPresent: !!(payload.identityDocument || payload.probabilisticEID),
                        eidHash: payload.eidHash || TelemetryCollector.computeEIDHash(payload.identityDocument || payload.probabilisticEID)
                    });

                    window.dispatchExecutionEvent({ type, payload });
                }
            }

            const AggregationConfig = {
                clickWindow: 250,
                doubleClickWindow: 300,
                typingWindow: 500,
                scrollWindow: 200,
                dragThreshold: 10,
                hoverThrottle: 100,
                longPressWindow: 800
            };

            class InteractionRecognizer {
                constructor() {
                    this.pointerState = 'IDLE';
                    this.pointerData = { path: [], startTarget: null, composedPath: [], clickTimeout: null, consumed: [], startTime: 0 };
                    
                    this.scrollState = 'IDLE';
                    this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null };
                    
                    this.inputState = 'IDLE';
                    this.inputData = { value: '', timeout: null, consumed: [], target: null };
                    
                    this.hoverTimeout = null;
                }

                emit(type, data) {
                    const start = Date.now();
                    const traceId = 'tr-' + generateUUID();
                    const interactionId = 'ia-' + generateUUID().split('-')[0];

                    TelemetryCollector.recordLifecycleEvent({
                        traceId,
                        spanId: 'sp-00',
                        parentSpanId: null,
                        stageSequence: 0,
                        stageName: 'DOM_EVENT_CAPTURED',
                        component: 'ActionDispatcher.mjs',
                        method: 'handleDOMEvent',
                        timestamp: start,
                        interactionId,
                        interactionType: type,
                        validationResult: data.target ? 'PASS' : 'WARN_DOM_DETACHED'
                    });

                    let valRes1 = 'PASS';
                    let err1 = null;
                    if (typeof start !== 'number' || start < 1700000000000 || isNaN(start)) {
                        valRes1 = 'FAIL_LF701';
                        err1 = { errorCode: 'LF-701', errorMessage: 'Ingress Contract Violation at Stage 1: malformed absolute timestamp ' + start };
                    }
                    TelemetryCollector.recordLifecycleEvent({
                        traceId,
                        spanId: 'sp-01',
                        parentSpanId: 'sp-00',
                        stageSequence: 1,
                        stageName: 'INTERACTION_CAPTURED',
                        component: 'ActionDispatcher.mjs',
                        method: 'captureInteraction',
                        timestamp: start,
                        interactionId,
                        interactionType: type,
                        validationResult: valRes1,
                        errorDetails: err1
                    });

                    const payload = {
                        traceId,
                        interactionId: 'ia-' + generateUUID().split('-')[0],
                        sequenceNumber: ++window.__ANTIGRAVITY_SEQ__,
                        interactionType: type,
                        originEvent: data.originEvent,
                        consumedEvents: data.consumed,
                        timestamp: start,
                        context: data.context
                    };
                    payload.interactionId = interactionId;

                    let eid = null;
                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT'].includes(type)) {
                        const engine = new LocatorIntelligenceEngine();
                        const resolution = engine.process(data.target, data.composedPath || []);
                        if (resolution) {
                            payload.locators = resolution.locators;
                            payload.locatorMetadata = resolution.metadata;
                            payload.shadowPath = resolution.shadowPath;
                            payload.identityDocument = resolution.identityDocument || null;
                            payload.probabilisticEID = resolution.identityDocument || null;
                            eid = payload.identityDocument;
                        }
                    }

                    const eidHash = TelemetryCollector.computeEIDHash(eid);
                    payload.eidHash = eidHash;

                    let valRes2 = 'PASS';
                    let err2 = null;
                    const isEidValid = eid && (eid.confidenceScore === undefined || eid.confidenceScore > 0) && (eid.identityHash || eid.fingerprint);
                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT'].includes(type) && !isEidValid) {
                        valRes2 = 'FAIL_LF602';
                        err2 = { errorCode: 'LF-602', errorMessage: 'EID Generation Failed at Stage 2: missing or invalid probabilisticEID' };
                    }
                    TelemetryCollector.recordLifecycleEvent({
                        traceId,
                        spanId: 'sp-02',
                        parentSpanId: 'sp-01',
                        stageSequence: 2,
                        stageName: 'EID_GENERATED',
                        component: 'FeatureExtractor.mjs',
                        method: 'extractIdentityDocument',
                        timestamp: Date.now(),
                        interactionId,
                        interactionType: type,
                        eidPresent: !!eid,
                        eidHash,
                        validationResult: valRes2,
                        errorDetails: err2
                    });

                    if (data.coordinates) payload.coordinates = data.coordinates;
                    if (data.path) payload.path = data.path;
                    if (data.deltas) payload.deltas = data.deltas;
                    if (data.value !== undefined) payload.value = data.value;
                    if (data.key) payload.key = data.key;

                    payload.metadata = { aggregationDuration: Date.now() - data.startTime };
                    sendExecution(type, payload);
                }

                flushPointer() {
                    if (this.pointerData.clickTimeout) {
                        clearTimeout(this.pointerData.clickTimeout);
                        this.pointerData.clickTimeout = null;
                    }
                    this.pointerState = 'IDLE';
                    this.pointerData = { path: [], startTarget: null, composedPath: [], clickTimeout: null, consumed: [], startTime: 0 };
                }

                processPointerEvent(e) {
                    const type = e.type;
                    const now = Date.now();

                    if (type === 'mousedown' || type === 'pointerdown') {
                        if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                            return;
                        }
                        this.flushPointer();
                        this.pointerState = 'POINTER_DOWN';
                        this.pointerData.startTarget = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                        this.pointerData.composedPath = e.composedPath ? e.composedPath() : [];
                        this.pointerData.path = [{x: e.clientX, y: e.clientY}];
                        this.pointerData.consumed.push(type);
                        this.pointerData.startTime = now;
                    } 
                    else if (type === 'mousemove' || type === 'pointermove') {
                        if (this.pointerState === 'POINTER_DOWN' || this.pointerState === 'CLICK_PENDING') {
                            const start = this.pointerData.path[0];
                            const dist = Math.sqrt(Math.pow(e.clientX - start.x, 2) + Math.pow(e.clientY - start.y, 2));
                            if (dist > AggregationConfig.dragThreshold) {
                                if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                                this.pointerState = 'DRAGGING';
                            } else if (this.pointerState === 'POINTER_DOWN') {
                                this.pointerData.consumed.push(type);
                            }
                        }

                        if (this.pointerState === 'DRAGGING') {
                            const last = this.pointerData.path[this.pointerData.path.length - 1];
                            const dist = Math.sqrt(Math.pow(e.clientX - last.x, 2) + Math.pow(e.clientY - last.y, 2));
                            if (dist > 5) {
                                this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            }
                            if (!this.pointerData.consumed.includes(type)) this.pointerData.consumed.push(type);
                        }

                        if (this.pointerState === 'IDLE') {
                            if (!this.hoverTimeout) {
                                this.hoverTimeout = setTimeout(() => {
                                    this.emit('HOVER', {
                                        originEvent: type,
                                        consumed: [type],
                                        context: 'Pointer Context',
                                        coordinates: { x: e.clientX, y: e.clientY },
                                        startTime: now
                                    });
                                    this.hoverTimeout = null;
                                }, AggregationConfig.hoverThrottle);
                            }
                        }
                    }
                    else if (type === 'mouseup' || type === 'pointerup') {
                        if (this.pointerState === 'DRAGGING') {
                            this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            this.pointerData.consumed.push(type);
                            this.emit('DRAG', {
                                originEvent: type,
                                consumed: this.pointerData.consumed,
                                context: 'Pointer Context',
                                target: this.pointerData.startTarget,
                                composedPath: this.pointerData.composedPath,
                                path: this.pointerData.path,
                                startTime: this.pointerData.startTime
                            });
                            this.flushPointer();
                        } else if (this.pointerState === 'POINTER_DOWN') {
                            this.pointerData.consumed.push(type);
                            if (e.button === 2) {
                                this.emit('CLICK', {
                                    originEvent: 'contextmenu',
                                    consumed: this.pointerData.consumed,
                                    context: 'Pointer Context',
                                    target: this.pointerData.startTarget,
                                    composedPath: this.pointerData.composedPath,
                                    coordinates: { x: e.clientX, y: e.clientY },
                                    startTime: this.pointerData.startTime
                                });
                                this.flushPointer();
                            }
                        } else if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                        }
                    }
                    else if (type === 'click') {
                        if (this.pointerState === 'CLICK_PENDING') {
                            this.pointerData.consumed.push(type);
                        } else {
                            this.pointerState = 'CLICK_PENDING';
                            this.pointerData.consumed.push(type);
                            if (!this.pointerData.startTarget) {
                                this.pointerData.startTarget = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                                this.pointerData.composedPath = e.composedPath ? e.composedPath() : [];
                            }
                            if (this.pointerData.path.length === 0) this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            if (!this.pointerData.startTime) this.pointerData.startTime = now;

                            // IMMEDIATE EMIT - Zero Latency Click
                            this.emit('CLICK', {
                                originEvent: 'click',
                                consumed: this.pointerData.consumed,
                                context: 'Pointer Context',
                                target: this.pointerData.startTarget,
                                composedPath: this.pointerData.composedPath,
                                coordinates: this.pointerData.path[0],
                                startTime: this.pointerData.startTime
                            });
                            this.flushPointer();
                        }
                    }
                    else if (type === 'dblclick') {
                        this.pointerData.consumed.push(type);
                        if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                        
                        this.emit('DOUBLE_CLICK', {
                            originEvent: 'dblclick',
                            consumed: this.pointerData.consumed,
                            context: 'Pointer Context',
                            target: this.pointerData.startTarget || ((e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target),
                            composedPath: this.pointerData.composedPath || (e.composedPath ? e.composedPath() : []),
                            coordinates: { x: e.clientX, y: e.clientY },
                            startTime: this.pointerData.startTime || now
                        });
                        this.flushPointer();
                    }
                }

                processScrollEvent(e) {
                    const now = Date.now();
                    if (this.scrollState === 'IDLE') {
                        this.scrollState = 'SCROLLING';
                        this.scrollData.startTime = now;
                        this.scrollData.target = e.target;
                    }
                    
                    if (e.type === 'wheel') {
                        this.scrollData.deltaX += e.deltaX;
                        this.scrollData.deltaY += e.deltaY;
                        if (!this.scrollData.consumed.includes('wheel')) this.scrollData.consumed.push('wheel');
                    } else if (e.type === 'scroll') {
                        if (!this.scrollData.consumed.includes('scroll')) this.scrollData.consumed.push('scroll');
                    }

                    if (this.scrollData.timeout) clearTimeout(this.scrollData.timeout);

                    this.scrollData.timeout = setTimeout(() => {
                        this.emit('SCROLL', {
                            originEvent: e.type,
                            consumed: this.scrollData.consumed,
                            context: 'Scroll Context',
                            target: this.scrollData.target,
                            deltas: { deltaX: this.scrollData.deltaX, deltaY: this.scrollData.deltaY },
                            startTime: this.scrollData.startTime
                        });
                        this.scrollState = 'IDLE';
                        this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null };
                    }, AggregationConfig.scrollWindow);
                }

                processInputEvent(e) {
                    const now = Date.now();
                    if (this.inputState === 'IDLE') {
                        this.inputState = 'TYPING';
                        this.inputData.startTime = now;
                        this.inputData.target = (e.composedPath && e.composedPath().length > 0) ? e.composedPath()[0] : e.target;
                        this.inputData.composedPath = e.composedPath ? e.composedPath() : [];
                    }
                    
                    this.inputData.value = e.target.value;
                    if (!this.inputData.consumed.includes(e.type)) this.inputData.consumed.push(e.type);

                    if (this.inputData.timeout) clearTimeout(this.inputData.timeout);

                    this.inputData.timeout = setTimeout(() => {
                        this.emit('INPUT', {
                            originEvent: 'input',
                            consumed: this.inputData.consumed,
                            context: 'Input Context',
                            target: this.inputData.target,
                            composedPath: this.inputData.composedPath,
                            value: this.inputData.value,
                            startTime: this.inputData.startTime
                        });
                        this.inputState = 'IDLE';
                        this.inputData = { value: '', timeout: null, consumed: [], target: null };
                    }, AggregationConfig.typingWindow);
                }

                processKeyboardEvent(e) {
                    const specialKeys = ['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'];
                    const isSpecial = specialKeys.includes(e.key);
                    const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
                    
                    if (isSpecial || hasModifier) {
                        let parts = [];
                        if (e.ctrlKey) parts.push('Control');
                        if (e.altKey) parts.push('Alt');
                        if (e.shiftKey && parts.length > 0) parts.push('Shift');
                        if (e.metaKey) parts.push('Meta');
                        
                        let key = e.key;
                        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return;
                        if (key && key.length === 1 && /^[a-z]$/i.test(key)) key = key.toLowerCase();
                        parts.push(key);
                        const combo = parts.join('+');
                        
                        this.emit('KEYBOARD', {
                            originEvent: 'keydown',
                            consumed: ['keydown'],
                            context: 'Keyboard Context',
                            target: e.target,
                            key: combo,
                            startTime: Date.now()
                        });
                    }
                }
            }

            class InteractionCollector {
                constructor() {
                    this.recognizer = new InteractionRecognizer();
                }

                handle(e) {
                    if (!e.isTrusted) return;
                    
                    if (['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick'].includes(e.type)) {
                        this.recognizer.processPointerEvent(e);
                    } else if (['wheel', 'scroll'].includes(e.type)) {
                        this.recognizer.processScrollEvent(e);
                    } else if (['input'].includes(e.type)) {
                        this.recognizer.processInputEvent(e);
                    } else if (['keydown'].includes(e.type)) {
                        this.recognizer.processKeyboardEvent(e);
                    }
                }
            }

            window.interactionCollector = new InteractionCollector();

            const eventsToIntercept = ['click', 'dblclick', 'input', 'keydown', 'mousemove', 'mousedown', 'mouseup', 'wheel', 'scroll'];
            eventsToIntercept.forEach(event => {
                document.addEventListener(event, (e) => window.interactionCollector.handle(e), { capture: true, passive: true });
            });
            })();
        `;
        
        await fsPromises.writeFile(path.join(__dirname, 'debug_injected.js'), scriptContent);
        this.cachedScriptContent = scriptContent;
    }

    async injectMasterListeners(masterPage) {
        this.masterPage = masterPage;
        if (!this.cachedScriptContent) {
            await this.buildInjectedScript();
        }
        await masterPage.addInitScript(this.cachedScriptContent);
        await masterPage.evaluate(this.cachedScriptContent).catch(err => logger.warn('Failed to immediately evaluate ActionDispatcher script: ' + err.message));

        await masterPage.exposeFunction('dispatchInstrumentationEvent', async (eventData) => {
            logger.info(`[INSTRUMENTATION] [${eventData.captureTime}] Type: ${eventData.type} | Target: ${eventData.tag}#${eventData.id}.${eventData.class} | Selector: ${eventData.selector} | Extra: ${eventData.extra} | Error: ${eventData.error}`);
        });

        await masterPage.exposeFunction('dispatchLifecycleEvent', async (eventData) => {
            TelemetryCollector.recordLifecycleEvent(eventData);
            if (eventData.validationResult && eventData.validationResult.startsWith('FAIL')) {
                logger.warn(`[LIFECYCLE VIOLATION] [Stage ${eventData.stageSequence}: ${eventData.stageName}] [${eventData.validationResult}] ${eventData.errorDetails?.errorMessage || ''}`);
            }
        });

        await masterPage.exposeBinding('dispatchExecutionEvent', async ({ frame }, eventData) => {
            const p = eventData.payload || {};
            const traceId = p.traceId || ('tr-' + crypto.randomUUID());
            const eid = p.identityDocument || p.probabilisticEID || null;
            const eidHash = p.eidHash || TelemetryCollector.computeEIDHash(eid);

            TelemetryCollector.recordLifecycleEvent({
                traceId,
                spanId: 'sp-07',
                parentSpanId: 'sp-06',
                stageSequence: 7,
                stageName: 'IPC_RECEIVED',
                component: 'CommandReceiver.mjs',
                method: 'onMessage',
                timestamp: Date.now(),
                interactionId: p.interactionId || 'ia-unknown',
                interactionType: eventData.type,
                eidPresent: !!eid,
                eidHash
            });

            logger.info(`[Master Dispatch] ${eventData.type}`);
            
            if (this.memorySettings.record_action_sequence === 'true') {
                this.recordAction(eventData);
            }

            const masterState = this.registry.getState('master');
            const navCtx = masterState.navigationContext;
            const viewCtx = masterState.viewportContext;
            const scrollCtx = masterState.scrollContext;
            const execCtx = masterState.executionContext;
            
            const framePath = FramePathBuilder.build(frame);

            const resolvedEpoch = eventData.payload?.captureEpoch ?? 0;

            const metadata = {
                captureEpoch: resolvedEpoch,
                navigation: navCtx ? {
                    url: navCtx.currentURL,
                    navigationId: navCtx.navigationId,
                    timestamp: navCtx.startedAt,
                    navigationType: navCtx.navigationType,
                    epoch: resolvedEpoch
                } : {
                    url: masterPage.url(),
                    navigationId: 'master-nav-fallback',
                    timestamp: Date.now(),
                    navigationType: 'fallback',
                    epoch: resolvedEpoch
                },
                viewport: viewCtx ? {
                    viewportId: viewCtx.viewportId,
                    width: viewCtx.layoutViewportWidth,
                    height: viewCtx.layoutViewportHeight,
                    dpr: viewCtx.dpr,
                    orientation: viewCtx.orientation,
                    visualScale: viewCtx.visualViewportScale,
                    capturedAt: Date.now()
                } : null,
                scroll: scrollCtx ? {
                    scrollId: scrollCtx.scrollId,
                    source: scrollCtx.source,
                    pageX: scrollCtx.pageScrollX,
                    pageY: scrollCtx.pageScrollY,
                    containerId: scrollCtx.activeContainerId,
                    containerX: scrollCtx.containerScrollX,
                    containerY: scrollCtx.containerScrollY,
                    direction: scrollCtx.direction,
                    velocity: scrollCtx.velocity,
                    capturedAt: Date.now()
                } : null,
                executionContext: {
                    framePath,
                    shadowPath: eventData.payload && eventData.payload.shadowPath ? eventData.payload.shadowPath : [],
                    contextVersion: execCtx ? execCtx.version : 0,
                    capturedAt: Date.now()
                }
            };

            const command = new Command({
                version: 2,
                lifecycle: 'CAPTURED',
                category: 'Execution',
                type: eventData.type,
                payload: eventData.payload,
                source: 'Master Browser',
                executionMode: 'SLAVES_ONLY',
                metadata,
                timestamp: p.timestamp ?? p.captureTime ?? Date.now(),
                captureTime: p.captureTime ?? p.timestamp ?? Date.now(),
                traceId,
                eidHash
            });

            let valRes3 = 'PASS';
            let err3 = null;
            const isEidValid = eid && (eid.confidenceScore === undefined || eid.confidenceScore > 0) && (eid.identityHash || eid.fingerprint);
            if (!isEidValid) {
                valRes3 = 'FAIL_LF602';
                err3 = { errorCode: 'LF-602', errorMessage: 'Command Construction missing or invalid identityDocument at Stage 3' };
            }
            if (p.timestamp !== undefined && (typeof p.timestamp !== 'number' || p.timestamp < 1700000000000 || isNaN(p.timestamp))) {
                valRes3 = 'FAIL_LF701';
                err3 = { errorCode: 'LF-701', errorMessage: `Command Construction malformed timestamp ${p.timestamp}` };
            }

            TelemetryCollector.recordLifecycleEvent({
                traceId,
                spanId: 'sp-03',
                parentSpanId: 'sp-07',
                stageSequence: 3,
                stageName: 'COMMAND_CONSTRUCTED',
                component: 'Command.mjs',
                method: 'Command.create',
                timestamp: Date.now(),
                interactionId: p.interactionId || 'ia-unknown',
                commandId: command.id,
                interactionType: eventData.type,
                eidPresent: !!(command.payload && (command.payload.identityDocument || command.payload.probabilisticEID)),
                eidHash: TelemetryCollector.computeEIDHash(command.payload && (command.payload.identityDocument || command.payload.probabilisticEID)),
                validationResult: valRes3,
                errorDetails: err3
            });

            this.emit('Command', command);
        });

        await masterPage.exposeBinding('__notifyNavigation', async ({ frame }, navEvent) => {
            await this.handleSpaNavigation(frame, navEvent);
        });

        masterPage.on('framenavigated', async (frame) => {
            if (typeof frame.parentFrame === 'function' ? !frame.parentFrame() : true) {
                await this._advanceEpoch(typeof frame.url === 'function' ? frame.url() : frame.url, 'framenavigated');
            }
        });
    }

    async handleSpaNavigation(frame, navEvent) {
        if (!navEvent || !navEvent.type || !frame) return;
        if (typeof frame.parentFrame === 'function' && frame.parentFrame()) return; // ignore subframes
        await this._advanceEpoch(navEvent.url, navEvent.type);
    }

    async _advanceEpoch(url, trigger) {
        if (!this.masterPage || (typeof this.masterPage.isClosed === 'function' && this.masterPage.isClosed())) return;

        let currentEpoch = 0;
        if (this.registry && typeof this.registry.getState === 'function') {
            const state = this.registry.getState('master');
            if (state.url !== url && url !== 'about:blank') {
                this.registry.updateUrl('master', url);
            } else {
                state.navigationEpoch++;
                state.url = url;
                if (typeof this.registry.emit === 'function') {
                    this.registry.emit('StateUpdated', { browserId: 'master', state });
                }
            }
            currentEpoch = state.navigationEpoch;
        } else {
            this.masterEpoch = (this.masterEpoch || 0) + 1;
            currentEpoch = this.masterEpoch;
        }

        await this.masterPage.evaluate(({ epoch, url, ts }) => {
            window.__ANTIGRAVITY_EPOCH__ = epoch;
            window.__ANTIGRAVITY_EPOCH_URL__ = url;
            window.__ANTIGRAVITY_EPOCH_TS__ = ts;
        }, { epoch: currentEpoch, url, ts: Date.now() }).catch(err => {
            logger.warn(`[ActionDispatcher] Failed to inject epoch ${currentEpoch} into master page: ${err.message}`);
        });

        try {
            TelemetryCollector.recordSpaNavigation(trigger);
        } catch (e) {}
    }

    recordAction(action) {
        this.actions.push(action);
        
        const MAX_RECORDED_ACTIONS = 1000;
        if (this.actions.length > MAX_RECORDED_ACTIONS) {
            this.actions = this.actions.slice(-MAX_RECORDED_ACTIONS);
        }

        const now = Date.now();
        if (!this.firstPendingAt) this.firstPendingAt = now;

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        
        const elapsed = now - this.firstPendingAt;
        const delay = Math.min(1000, Math.max(0, 5000 - elapsed));

        this.saveTimeout = setTimeout(() => {
            this.firstPendingAt = null;
            this.scheduleSave();
        }, delay);
    }

    async scheduleSave() {
        if (this.isSaving) {
            this.savePending = true;
            return;
        }
        
        this.isSaving = true;
        this.savePending = false;
        
        try {
            const dir = path.dirname(this.sequenceFile);
            await fsPromises.mkdir(dir, { recursive: true });
            
            const tmpFile = `${this.sequenceFile}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
            await fsPromises.writeFile(tmpFile, JSON.stringify(this.actions, null, 2));
            await fsPromises.rename(tmpFile, this.sequenceFile);
        } catch (err) {
            logger.error(`ActionDispatcher: Failed to flush sequence async: ${err.message}`);
        } finally {
            this.isSaving = false;
            if (this.savePending) {
                this.scheduleSave();
            }
        }
    }

    flushSync() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.actions.length > 0) {
            try {
                const dir = path.dirname(this.sequenceFile);
                fs.mkdirSync(dir, { recursive: true });
                
                const tmpFile = `${this.sequenceFile}.${Date.now()}.sync.tmp`;
                fs.writeFileSync(tmpFile, JSON.stringify(this.actions, null, 2));
                fs.renameSync(tmpFile, this.sequenceFile);
            } catch (e) {
                console.error(`ActionDispatcher: Failed to flush sequence sync on exit: ${e.message}`);
            }
        }
    }
}
