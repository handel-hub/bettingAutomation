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
import { TemporalSequencer } from '../../master/TemporalSequencer.mjs';
import { HybridLogicalClock } from '../../common/models/HybridLogicalClock.mjs';

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
        this.lastClickEmitTime = 0;
        
        this.sequencer = new TemporalSequencer(50);
        this.sequencer.on('sequenced', this.handleSequencedEvent.bind(this));
        this.sequencer.on('error', (err) => {
            logger.error(`[SYNC-FATAL] TemporalSequencer Error: ${err.message}`);
        });

        process.on('SIGINT', () => this.flushSync());
        process.on('beforeExit', () => this.flushSync());
    }

    async init() {
        if (fs.existsSync(this.sequenceFile)) {
            try { this.actions = JSON.parse(await fsPromises.readFile(this.sequenceFile, 'utf-8')); } catch(e) {}
        }
        await this.buildInjectedScript();
        this.sequencer.start();
    }

    async buildInjectedScript() {
        const pipelineFiles = [
            'FeatureFlags.mjs',
            'extraction/FeatureExtractor.mjs',
            'telemetry/RollingWindow.mjs',
            'telemetry/MetricsRegistry.mjs',
            'telemetry/TelemetryCollector.mjs'
        ];

        const scriptPath = path.join(__dirname, '../../../playwright-injected/generated/playwright-iife.js');
        let playwrightBundle = '';
        try {
            playwrightBundle = await fsPromises.readFile(scriptPath, 'utf8');
        } catch (e) {
            console.error('Failed to load Playwright IIFE bundle', e);
        }
        
        let overlayLocators = [];
        try {
            const overlayConfigPath = path.join(__dirname, '..', '..', '..', 'config', 'overlays.json');
            const overlayData = JSON.parse(await fsPromises.readFile(overlayConfigPath, 'utf8'));
            overlayLocators = overlayData.overlays.map(o => o.locator);
        } catch (e) {
            logger.warn(`Failed to load overlays.json for ActionDispatcher: ${e.message}`);
        }

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
            window.__LI_SID_MODE_ENABLED__ = ${featureFlags.isEnabled('LI_SID_MODE')};

            class HybridLogicalClock {
                constructor(physical, logical) {
                    this.physical = physical;
                    this.logical = logical;
                }
                static generate(lastHlc = null) {
                    let physical = performance.timeOrigin + performance.now();
                    physical = Math.floor(physical * 1000) / 1000;
                    if (lastHlc) {
                        if (physical === lastHlc.physical) return new HybridLogicalClock(physical, lastHlc.logical + 1);
                        if (physical < lastHlc.physical) return new HybridLogicalClock(lastHlc.physical, lastHlc.logical + 1);
                    }
                    return new HybridLogicalClock(physical, 0);
                }
            }
            window.__lastHlc = null;



            const locatorIntelligencePipelineStart = Date.now();
            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            // --------------------------------------------------------
            // PLAYWRIGHT AND LOCATOR INTELLIGENCE HYBRID ENGINE
            // --------------------------------------------------------
            ${playwrightBundle}
            if (typeof __PlaywrightExports !== 'undefined' && !window.__pwInjectedScript) {
                window.__pwInjectedScript = new __PlaywrightExports.InjectedScript(globalThis, {
                    isUnderTest: false,
                    testIdAttributeName: 'data-testid',
                    sdkLanguage: 'javascript',
                    frameSeq: 1,
                    customEngines: []
                });
            }
            ${locatorIntelligenceCode}
            // --------------------------------------------------------


            class ClientRingBuffer {
                constructor(capacity = 128) {
                    this.capacity = capacity;
                    this.buffer = new Array(capacity);
                    this.head = 0;
                    this.tail = 0;
                    this.pendingCount = 0;
                }
                
                enqueue(interactionId, payload) {
                    if (this.pendingCount >= this.capacity) {
                        return false;
                    }
                    this.buffer[this.tail] = { interactionId, payload, state: 'PENDING', timestamp: Date.now() };
                    this.tail = (this.tail + 1) % this.capacity;
                    this.pendingCount++;
                    return true;
                }
                
                ack(interactionId) {
                    for (let i = 0; i < this.pendingCount; i++) {
                        const idx = (this.head + i) % this.capacity;
                        if (this.buffer[idx] && this.buffer[idx].interactionId === interactionId) {
                            this.buffer[idx].state = 'ACKED';
                            while (this.pendingCount > 0 && this.buffer[this.head].state === 'ACKED') {
                                this.buffer[this.head] = null;
                                this.head = (this.head + 1) % this.capacity;
                                this.pendingCount--;
                            }
                            return true;
                        }
                    }
                    return false;
                }
            }
            window.__clientRingBuffer = new ClientRingBuffer();

            function sendExecution(type, payload) {
                if (window.dispatchExecutionEvent) {
                    window.__lastHlc = HybridLogicalClock.generate(window.__lastHlc);
                    payload.hlc = window.__lastHlc;
                    payload.timestamp = Date.now();
                    payload.captureTime = Date.now();
                    payload.sourceEpoch = typeof window !== 'undefined' && window.__ANTIGRAVITY_EPOCH__ !== undefined ? window.__ANTIGRAVITY_EPOCH__ : 0;
                    payload.epoch = payload.sourceEpoch;
                    payload.monotonicUs = Math.round(performance.now() * 1000);
                    payload.capturePerformanceTime = performance.now();
                    payload.payloadVersion = 3;
                    
                    if (!window.__clientRingBuffer.enqueue(payload.interactionId, payload)) {
                        return; // Buffer overflow, drop it
                    }

                    TelemetryCollector.recordLifecycleEvent({
                        traceId: payload.traceId || 'tr-unknown',
                        spanId: payload.interactionId + '-06',
                        parentSpanId: payload.interactionId + '-02',
                        stageSequence: 6,
                        stageName: 'IPC_TRANSMITTED',
                        component: 'ActionDispatcher.mjs',
                        method: 'sendExecution',
                        timestamp: Date.now(),
                        interactionId: payload.interactionId,
                        interactionType: type,
                        payloadSize: payload ? Object.keys(payload).length * 50 : 0,
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

            const elementScrollStates = new WeakMap();

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
                        spanId: interactionId + '-00',
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
                        spanId: interactionId + '-01',
                        parentSpanId: interactionId + '-00',
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
                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT', 'HOVER'].includes(type)) {
                        try {
                            if (window.__pwInjectedScript && data.target.nodeType === 1) {
                                const selectorObj = window.__pwInjectedScript.generateSelector(data.target, { testIdAttributeName: 'data-testid' });
                                payload.playwrightSelector = selectorObj ? selectorObj.selector : null;
                            }
                        } catch (pwErr) {
                            console.error('Playwright generateSelector failed, attempting fallback', pwErr);
                            try {
                                if (window.__pwInjectedScript && data.target.nodeType === 1) {
                                    const fallbackObj = window.__pwInjectedScript.generateSelectorSimple(data.target, { testIdAttributeName: 'data-testid' });
                                    payload.playwrightSelector = fallbackObj ? fallbackObj.selector : null;
                                }
                            } catch (fallbackErr) {
                                console.error('Playwright generateSelectorSimple also failed', fallbackErr);
                                payload.playwrightSelector = null;
                            }
                        }

                        if (window.__LI_SID_MODE_ENABLED__) {
                            const sid = FeatureExtractor.extract(data.target);
                            payload.sid = sid;
                            payload.identityDocument = sid;
                            eid = sid;
                            
                            let shadowPath = [];
                            if (data.composedPath && Array.isArray(data.composedPath)) {
                                for (let i = 0; i < data.composedPath.length; i++) {
                                    const node = data.composedPath[i];
                                    if (node && node.nodeType === 11) {
                                        const host = node.host || data.composedPath[i + 1];
                                        if (host && host.nodeType === 1) {
                                            let sel = host.nodeName.toLowerCase();
                                            if (host.id && !/\\d+/.test(host.id)) {
                                                sel += '#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(host.id) : host.id);
                                            }
                                            shadowPath.unshift(sel);
                                        }
                                    }
                                }
                            }
                            payload.shadowPath = shadowPath;
                        }
                    }

                    const eidHash = TelemetryCollector.computeEIDHash(eid);
                    payload.eidHash = eidHash;

                    let valRes2 = 'PASS';
                    let err2 = null;
                    const isEidValid = eid && (eid.tag || eid.role || eid.text);
                    if (data.target && ['CLICK', 'DOUBLE_CLICK', 'DRAG', 'INPUT', 'HOVER'].includes(type) && !isEidValid) {
                        valRes2 = 'FAIL_LF602';
                        err2 = { errorCode: 'LF-602', errorMessage: 'EID Generation Failed at Stage 2: missing or invalid semantic fallback metadata' };
                    }
                    TelemetryCollector.recordLifecycleEvent({
                        traceId,
                        spanId: interactionId + '-02',
                        parentSpanId: interactionId + '-01',
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

                _stopScrollThrottle() {
                    if (this.scrollData.throttleInterval) {
                        clearInterval(this.scrollData.throttleInterval);
                        this.scrollData.throttleInterval = null;
                    }
                    this.scrollData.throttleActive = false;
                    this.scrollState = 'IDLE';
                    this.scrollData = { deltaX: 0, deltaY: 0, timeout: null, consumed: [], target: null, throttleActive: false, throttleInterval: null, startTime: 0 };
                }

                flushScroll() {
                    if (this.scrollState !== 'IDLE' && (this.scrollData.deltaX !== 0 || this.scrollData.deltaY !== 0)) {
                        this.emit('SCROLL', {
                            originEvent: 'scroll',
                            consumed: this.scrollData.consumed,
                            context: 'Scroll Context',
                            target: this.scrollData.target,
                            deltas: { deltaX: this.scrollData.deltaX, deltaY: this.scrollData.deltaY },
                            startTime: this.scrollData.startTime
                        });
                        this.scrollData.deltaX = 0;
                        this.scrollData.deltaY = 0;
                        this.scrollData.consumed = [];
                    }
                }

                processPointerEvent(e) {
                    const type = e.type;
                    const now = Date.now();

                    if (type === 'mousedown' || type === 'pointerdown' || type === 'click' || type === 'dblclick') {
                        this.flushScroll();
                        this._stopScrollThrottle();
                    }

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
                                        target: e.target,
                                        composedPath: typeof e.composedPath === 'function' ? e.composedPath() : [],
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
                        this.scrollData.throttleActive = false;
                        this.scrollData.throttleInterval = null;
                    }
                    
                    let currentScrollLeft = 0;
                    let currentScrollTop = 0;
                    
                    if (e.target === document || e.target === window) {
                        currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                        currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    } else if (e.target && e.target.nodeType === 1) {
                        currentScrollLeft = e.target.scrollLeft;
                        currentScrollTop = e.target.scrollTop;
                    }
                    
                    let lastState = elementScrollStates.get(e.target) || { scrollLeft: currentScrollLeft, scrollTop: currentScrollTop };
                    
                    if (e.type === 'wheel') {
                        this.scrollData.deltaX += e.deltaX;
                        this.scrollData.deltaY += e.deltaY;
                        if (!this.scrollData.consumed.includes('wheel')) this.scrollData.consumed.push('wheel');
                    } else if (e.type === 'scroll') {
                        this.scrollData.deltaX += (currentScrollLeft - lastState.scrollLeft);
                        this.scrollData.deltaY += (currentScrollTop - lastState.scrollTop);
                        if (!this.scrollData.consumed.includes('scroll')) this.scrollData.consumed.push('scroll');
                    }
                    
                    elementScrollStates.set(e.target, { scrollLeft: currentScrollLeft, scrollTop: currentScrollTop });

                    if (!this.scrollData.throttleActive) {
                        this.scrollData.throttleActive = true;
                        this.flushScroll(); // Immediate dispatch

                        this.scrollData.throttleInterval = setInterval(() => {
                            if (this.scrollData.deltaX !== 0 || this.scrollData.deltaY !== 0) {
                                this.flushScroll();
                            } else {
                                this._stopScrollThrottle();
                            }
                        }, 50);
                    }
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
                    
                    const overlays = ${JSON.stringify(overlayLocators)};
                    if (e.target && typeof e.target.closest === 'function') {
                        for (const loc of overlays) {
                            try {
                                if (e.target.closest(loc)) {
                                    return; // Silently drop spontaneous overlay interaction
                                }
                            } catch (err) {}
                        }
                    }
                    
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

        masterPage.on('popup', async (popup) => {
            logger.info(`[ActionDispatcher] Master popup detected, injecting listeners...`);
            await this.injectMasterListeners(popup).catch(() => {});
        });

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
                                    console.log('[AOIS-NATIVE] Sub-millisecond interception of overlay:', overlay.name);
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
                        const checkedNodes = new Set();
                        for (const m of mutations) {
                            if (m.addedNodes.length > 0 || m.attributeName === 'class' || m.attributeName === 'style') {
                                let target = m.target;
                                if (target && target.nodeType === 1 && !checkedNodes.has(target)) {
                                    checkAndDismiss(target);
                                    checkedNodes.add(target);
                                }
                            }
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
            await masterPage.addInitScript(overlayScript);
            await masterPage.evaluate(overlayScript).catch(() => {});
            logger.info(`[AOIS] Master natively intercepting ${overlayData.overlays.length} overlays via MutationObserver.`);
        } catch (e) {
            logger.warn(`[AOIS] Failed to load overlays.json on Master: ${e.message}`);
        }

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
            if (frame.isDetached()) {
                logger.warn(`[SYNC-WARN] Ignored execution event from detached frame.`);
                return;
            }

            const p = eventData.payload || {};
            const traceId = p.traceId || ('tr-' + crypto.randomUUID());
            const eid = p.identityDocument || p.probabilisticEID || null;
            const eidHash = p.eidHash || TelemetryCollector.computeEIDHash(eid);
            const interactionId = p.interactionId || ('ia-' + crypto.randomUUID());

            try {
                // Print Master Semantics for Observability
                const pwSelector = p.playwrightSelector || 'NONE';
                const tag = eid?.tag || 'unknown';
                const role = eid?.role || 'unknown';
                let text = 'none';
                if (eid?.text) {
                    text = typeof eid.text === 'string' ? eid.text.trim().slice(0, 30).replace(/\n/g, ' ') : String(eid.text).slice(0, 30);
                }
                const timeAgg = p.metadata?.aggregationDuration ? ` | Aggregation Time: ${p.metadata.aggregationDuration}ms` : '';
                logger.info(`[Master Capture] Intercepted ${eventData.type} Interaction${timeAgg}`);
                logger.info(`  --> [Semantics] Playwright Selector: ${pwSelector}`);
                if (eid) {
                    logger.info(`  --> [Semantics] Identity Doc: <${tag} role="${role}"> "${text}" (Hash: ${eidHash?.slice(0,8)})`);
                } else {
                    logger.info(`  --> [Semantics] Identity Doc: NONE`);
                }

                const framePathRaw = FramePathBuilder.build(frame);
                const framePath = JSON.stringify(framePathRaw);

                // Pass to TemporalSequencer instead of registry
                this.sequencer.receive({
                    interactionId,
                    framePath,
                    type: eventData.type,
                    payload: p,
                    hlc: p.hlc,
                    masterPage: masterPage,
                    traceId,
                    eid,
                    eidHash
                });

                TelemetryCollector.recordLifecycleEvent({
                    traceId,
                    spanId: interactionId + '-07',
                    parentSpanId: interactionId + '-06',
                    stageSequence: 7,
                    stageName: 'IPC_RECEIVED',
                    component: 'CommandReceiver.mjs',
                    method: 'onMessage',
                    timestamp: Date.now(),
                    interactionId: interactionId,
                    interactionType: eventData.type,
                    eidPresent: !!eid,
                    eidHash
                });

            } catch (error) {
                logger.error(`[SYNC-500] [IPC Ingress Crash] Interaction ${interactionId} failed to process: ${error.message}\n${error.stack}`);
                TelemetryCollector.recordLifecycleEvent({
                    traceId,
                    spanId: interactionId + '-err',
                    parentSpanId: interactionId + '-07',
                    stageSequence: 999,
                    stageName: 'IPC_CRASH',
                    component: 'ActionDispatcher.mjs',
                    method: 'dispatchExecutionEvent',
                    timestamp: Date.now(),
                    interactionId,
                    errorDetails: { errorCode: 'SYNC-500', errorMessage: error.message }
                });
            } finally {
                // ACK back to the page
                try {
                    await masterPage.evaluate((id) => {
                        if (window.__clientRingBuffer) {
                            window.__clientRingBuffer.ack(id);
                        }
                    }, interactionId);
                } catch(e) {
                    logger.warn(`Failed to send ACK for ${interactionId} to Master page: ${e.message}`);
                }
            }
        });

        await masterPage.exposeBinding('__notifyNavigation', async ({ frame }, navEvent) => {
            await this.handleSpaNavigation(frame, navEvent);
        });

        masterPage.on('framenavigated', async (frame) => {
            if (typeof frame.parentFrame === 'function' ? !frame.parentFrame() : true) {
                this.registry.updateUrl('master', typeof frame.url === 'function' ? frame.url() : frame.url, true);
            }
        });
    }

    handleSequencedEvent({ ges, event }) {
        const p = event.payload;
        const masterState = this.registry.getState('master');
        const navCtx = masterState.navigationContext;
        const viewCtx = masterState.viewportContext;
        const scrollCtx = masterState.scrollContext;
        const execCtx = masterState.executionContext;
    
        const metadata = {
            navigation: navCtx ? {
                url: navCtx.currentURL,
                navigationId: navCtx.navigationId,
                timestamp: navCtx.startedAt,
                navigationType: navCtx.navigationType
            } : {
                url: event.masterPage.url(),
                navigationId: 'master-nav-fallback',
                timestamp: Date.now(),
                navigationType: 'fallback'
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
            scroll: (scrollCtx && scrollCtx.version > 0) ? {
                scrollId: scrollCtx.scrollId || 'unknown',
                source: scrollCtx.source || 'UNKNOWN',
                pageX: scrollCtx.pageScrollX !== undefined ? scrollCtx.pageScrollX : 0,
                pageY: scrollCtx.pageScrollY !== undefined ? scrollCtx.pageScrollY : 0,
                containerId: scrollCtx.activeContainerId || null,
                containerX: scrollCtx.containerScrollX !== undefined ? scrollCtx.containerScrollX : 0,
                containerY: scrollCtx.containerScrollY !== undefined ? scrollCtx.containerScrollY : 0,
                rhoX: scrollCtx.rhoX !== undefined ? scrollCtx.rhoX : 0,
                rhoY: scrollCtx.rhoY !== undefined ? scrollCtx.rhoY : 0,
                direction: scrollCtx.direction || 'none',
                velocity: scrollCtx.velocity !== undefined ? scrollCtx.velocity : 0,
                capturedAt: Date.now()
            } : null,
            executionContext: {
                framePath: event.framePath,
                shadowPath: p && p.shadowPath ? p.shadowPath : [],
                contextVersion: execCtx ? execCtx.version : 0,
                capturedAt: Date.now()
            }
        };

        // Determine immutable scheduling priority based on abstract infrastructure directive
        let priority = 'DISCRETE';
        const directive = metadata.locator?.schedulingDirective;
        const typeLower = event.type ? event.type.toLowerCase() : '';
        if (directive === 'CRITICAL') {
            priority = 'CRITICAL';
        } else if (typeLower === 'hover' || typeLower === 'mousemove' || typeLower === 'pointermove') {
            priority = 'CONTINUOUS';
        } else if (typeLower === 'scroll' || typeLower === 'wheel') {
            priority = 'AGGREGATED';
        }

        const command = new Command({
            version: 3,
            lifecycle: 'CAPTURED',
            category: 'Execution',
            type: event.type,
            payload: event.payload,
            source: 'Master Browser',
            executionMode: 'SLAVES_ONLY',
            priority: priority,
            metadata,
            timestamp: p.timestamp ?? p.captureTime ?? Date.now(),
            captureTime: p.captureTime ?? p.timestamp ?? Date.now(),
            traceId: event.traceId,
            eidHash: event.eidHash,
            ges: ges,
            framePath: event.framePath,
            hlc: event.hlc
        });

        TelemetryCollector.recordLifecycleEvent({
            traceId: event.traceId,
            spanId: 'sp-03',
            parentSpanId: 'sp-07',
            stageSequence: 3,
            stageName: 'COMMAND_CONSTRUCTED',
            component: 'Command.mjs',
            method: 'Command.create',
            timestamp: Date.now(),
            interactionId: event.interactionId || 'ia-unknown',
            commandId: command.id,
            interactionType: event.type,
            eidPresent: !!(event.eid),
            eidHash: event.eidHash,
            validationResult: 'PASS'
        });

        if (this.memorySettings.record_action_sequence === 'true') {
            this.recordAction({ type: event.type, payload: event.payload, ges });
        }

        logger.info(`[Master Dispatch] ${event.type} | GES: ${ges}`);
        if (event.type === 'CLICK' || event.type === 'DOUBLE_CLICK') {
            this.lastClickEmitTime = Date.now();
        }
        this.emit('Command', command);
    }

    async handleSpaNavigation(frame, navEvent) {
        if (!navEvent || !navEvent.type || !frame) return;
        if (typeof frame.parentFrame === 'function' && frame.parentFrame()) return; // ignore subframes
        this.registry.updateUrl('master', navEvent.url, true);
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
                logger.error({ err: e }, `ActionDispatcher: Failed to flush sequence sync on exit: ${e.message}`);
            }
        }
    }

    getLastClickEmitTime() {
        return this.lastClickEmitTime;
    }
}
