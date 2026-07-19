import { logger } from '../../config.mjs';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EventEmitter from 'node:events';
import { Command } from './Command.mjs';
import { BrowserStateRegistry } from '../synchronization/BrowserStateRegistry.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ActionDispatcher extends EventEmitter {
    constructor(settings) {
        super();
        this.memorySettings = settings.Memory || {};
        
        this.sequenceFile = path.join(__dirname, '..', '..', '..', 'sequences', 'startup.json');
        this.actions = [];
        this.saveTimeout = null;

        if (fs.existsSync(this.sequenceFile)) {
            try { this.actions = JSON.parse(fs.readFileSync(this.sequenceFile, 'utf-8')); } catch(e) {}
        }

        process.on('SIGINT', () => this.flushSync());
        process.on('beforeExit', () => this.flushSync());
    }

    async injectMasterListeners(masterPage) {
        await masterPage.exposeFunction('dispatchInstrumentationEvent', async (eventData) => {
            logger.info(`[INSTRUMENTATION] [${eventData.captureTime}] Type: ${eventData.type} | Target: ${eventData.tag}#${eventData.id}.${eventData.class} | Selector: ${eventData.selector} | Extra: ${eventData.extra} | Error: ${eventData.error}`);
        });

        await masterPage.exposeFunction('dispatchExecutionEvent', async (eventData) => {
            logger.info(`[Master Dispatch] ${eventData.type}`);
            
            if (this.memorySettings.record_action_sequence === 'true') {
                this.recordAction(eventData);
            }

            const masterState = BrowserStateRegistry.getState('master');
            const navCtx = masterState.navigationContext;

            const metadata = {
                navigation: navCtx ? {
                    url: navCtx.currentURL,
                    navigationId: navCtx.navigationId,
                    timestamp: navCtx.startedAt,
                    navigationType: navCtx.navigationType
                } : {
                    url: masterPage.url(),
                    navigationId: 'master-nav-fallback',
                    timestamp: Date.now(),
                    navigationType: 'fallback'
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
                metadata
            });

            this.emit('Command', command);
        });

        const pipelineFiles = [
            'models/ValidationResult.mjs',
            'models/RankingResult.mjs',
            'models/LocatorCandidate.mjs',
            'engine/PipelineContext.mjs',
            'engine/PipelineStep.mjs',
            'extraction/FeatureExtractor.mjs',
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
            'ranking/RankingConfig.mjs',
            'ranking/RankingEngine.mjs',
            'serialization/LocatorSerializer.mjs',
            'telemetry/RollingWindow.mjs',
            'telemetry/MetricsRegistry.mjs',
            'telemetry/TelemetryCollector.mjs',
            'engine/LocatorIntelligenceEngine.mjs'
        ];

        let locatorIntelligenceCode = '';
        for (const file of pipelineFiles) {
            const filePath = path.join(__dirname, 'locatorIntelligence', file);
            let content = fs.readFileSync(filePath, 'utf8');
            // Strip 'export ' and 'import '
            content = content.replace(/^\uFEFF/, '')
                             .replace(/^export\s+/gm, '')
                             .replace(/^import\s+.*$/gm, '');
            locatorIntelligenceCode += content + '\n\n';
        }

        const scriptContent = `
            (() => {
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
                    payload.captureTime = Date.now();
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
                    this.pointerData = { path: [], startTarget: null, clickTimeout: null, consumed: [], startTime: 0 };
                    
                    this.scrollState = 'IDLE';
                    this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null };
                    
                    this.inputState = 'IDLE';
                    this.inputData = { value: '', timeout: null, consumed: [], target: null };
                    
                    this.hoverTimeout = null;
                }

                emit(type, data) {
                    const start = Date.now();
                    const payload = {
                        interactionId: 'ia-' + generateUUID().split('-')[0],
                        interactionType: type,
                        originEvent: data.originEvent,
                        consumedEvents: data.consumed,
                        timestamp: start,
                        context: data.context
                    };

                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT'].includes(type)) {
                        const engine = new LocatorIntelligenceEngine();
                        const resolution = engine.process(data.target);
                        if (resolution) {
                            payload.locators = resolution.locators;
                            payload.locatorMetadata = resolution.metadata;
                        }
                    }

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
                    this.pointerData = { path: [], startTarget: null, clickTimeout: null, consumed: [], startTime: 0 };
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
                        this.pointerData.startTarget = e.target;
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
                            if (!this.pointerData.startTarget) this.pointerData.startTarget = e.target;
                            if (this.pointerData.path.length === 0) this.pointerData.path.push({x: e.clientX, y: e.clientY});
                            if (!this.pointerData.startTime) this.pointerData.startTime = now;

                            this.pointerData.clickTimeout = setTimeout(() => {
                                this.emit('CLICK', {
                                    originEvent: 'click',
                                    consumed: this.pointerData.consumed,
                                    context: 'Pointer Context',
                                    target: this.pointerData.startTarget,
                                    coordinates: this.pointerData.path[0],
                                    startTime: this.pointerData.startTime
                                });
                                this.flushPointer();
                            }, AggregationConfig.clickWindow);
                        }
                    }
                    else if (type === 'dblclick') {
                        this.pointerData.consumed.push(type);
                        if (this.pointerData.clickTimeout) clearTimeout(this.pointerData.clickTimeout);
                        
                        this.emit('DOUBLE_CLICK', {
                            originEvent: 'dblclick',
                            consumed: this.pointerData.consumed,
                            context: 'Pointer Context',
                            target: this.pointerData.startTarget || e.target,
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
                        this.inputData.target = e.target;
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
        
        fs.writeFileSync(path.join(__dirname, 'debug_injected.js'), scriptContent);
        
        await masterPage.addInitScript(scriptContent);
        await masterPage.evaluate(scriptContent).catch(err => logger.warn('Failed to immediately evaluate ActionDispatcher script: ' + err.message));
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

        this.saveTimeout = setTimeout(async () => {
            this.firstPendingAt = null;
            try {
                const dir = path.dirname(this.sequenceFile);
                if (!fs.existsSync(dir)) await fsPromises.mkdir(dir, { recursive: true });
                await fsPromises.writeFile(this.sequenceFile, JSON.stringify(this.actions, null, 2));
            } catch (err) {
                logger.error(`ActionDispatcher: Failed to flush sequence async: ${err.message}`);
            }
        }, delay);
    }

    flushSync() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        if (this.actions.length > 0) {
            try {
                const dir = path.dirname(this.sequenceFile);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(this.sequenceFile, JSON.stringify(this.actions, null, 2));
            } catch (e) {
                console.error(`ActionDispatcher: Failed to flush sequence sync on exit: ${e.message}`);
            }
        }
    }
}
