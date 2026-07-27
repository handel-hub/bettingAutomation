/**
 * @file SanraTelemetry.mjs
 * @description Structured JSON observability collector, W3C Trace Context propagation,
 * and Failure Taxonomy dispatcher for Viewport and Scroll Synchronization vNext (SANRA Architecture).
 * 
 * Implements:
 * - SanraTelemetryEvent schema (Observability Plan Section 3)
 * - W3C Trace Context (traceparent header propagation: 00-traceId-spanId-01)
 * - 35 Structured Failure Codes across 9 domains (VP, SS, SYNC, REN, BR, IPC, VAL, MIG, TEST)
 * - Zero-allocation metric harvesting integration with SanraMemoryPool
 */

import crypto from 'node:crypto';
import EventEmitter from 'node:events';
import { logger } from '../../../config.mjs';

export class SanraFailureTaxonomy {
    static Codes = {
        // Transport & IPC Domain
        IPC_001: { code: 'IPC-001', severity: 'FATAL', domain: 'IPC', desc: 'FlatBuffer Schema Alignment Validation Failure' },
        IPC_002: { code: 'IPC-002', severity: 'WARN', domain: 'IPC', desc: 'WebRTC MTU Exceeded (Fragmented Frame Dropped)' },
        
        // Validation Domain
        VAL_001: { code: 'VAL-001', severity: 'ERROR', domain: 'VAL', desc: 'SANRA Invariant Violation (rho not in [0.0, 1.0])' },
        VAL_002: { code: 'VAL-002', severity: 'WARN', domain: 'VAL', desc: 'Vector Ring Buffer Overflow (Unread Tail Overwritten)' },
        VAL_003: { code: 'VAL-003', severity: 'ERROR', domain: 'VAL', desc: 'Transform Reversibility Invariant Violation' },
        VAL_004: { code: 'VAL-004', severity: 'WARN', domain: 'VAL', desc: 'Coordinate Transformation Clipped Out of Bounds' },

        // Migration Domain
        MIG_001: { code: 'MIG-001', severity: 'ERROR', domain: 'MIG', desc: 'Legacy DOM Event Listener Detach Failure' },
        MIG_002: { code: 'MIG-002', severity: 'WARN', domain: 'MIG', desc: 'Dual-Stack Protocol Mismatch (Legacy JSON Received in vNext Mode)' },
        MIG_003: { code: 'MIG-003', severity: 'WARN', domain: 'MIG', desc: 'SharedArrayBuffer Allocation Failure (Fallback to ArrayBuffer)' },

        // Viewport Domain
        VP_001: { code: 'VP-001', severity: 'ERROR', domain: 'VP', desc: 'Viewport Layout Non-Isomorphism Detected' },
        VP_002: { code: 'VP-002', severity: 'FATAL', domain: 'VP', desc: 'Visual Viewport Scale Divergence (Zoom Mismatch)' },
        VP_003: { code: 'VP-003', severity: 'WARN', domain: 'VP', desc: 'DevicePixelRatio (DPR) Mismatch' },
        VP_004: { code: 'VP-004', severity: 'ERROR', domain: 'VP', desc: 'CDP Emulation Lock Timeout' },

        // Scroll Domain
        SS_001: { code: 'SS-001', severity: 'FATAL', domain: 'SS', desc: 'Virtual List Mounting Deadlock (Scroll Target Unmounted)' },
        SS_002: { code: 'SS-002', severity: 'WARN', domain: 'SS', desc: 'Kinetic Spline Overshoot (Velocity Clamping Triggered)' },
        SS_003: { code: 'SS-003', severity: 'ERROR', domain: 'SS', desc: 'Semantic Anchor Node Missing or Detached' },
        SS_004: { code: 'SS-004', severity: 'WARN', domain: 'SS', desc: 'Scroll Bounds Saturation (Bottom/Top Collision)' },
        SS_005: { code: 'SS-005', severity: 'WARN', domain: 'SS', desc: 'Target Scroll Container Resolution Failure (Fallback to Root)' },

        // Synchronization Domain
        SYNC_001: { code: 'SYNC-001', severity: 'ERROR', domain: 'SYNC', desc: 'Vsync Coalescing Desynchronization (Frame Skip)' },
        SYNC_002: { code: 'SYNC-002', severity: 'WARN', domain: 'SYNC', desc: 'Sequence ID Gap Detected (Packet Loss/Jitter)' },
        SYNC_003: { code: 'SYNC-003', severity: 'FATAL', domain: 'SYNC', desc: 'Unrecoverable Trajectory Divergence (>15% Delta after 500ms)' },

        // Rendering Domain
        REN_001: { code: 'REN-001', severity: 'ERROR', domain: 'REN', desc: 'Main-Thread RAF Commit Starvation (>34ms Delay)' },
        REN_002: { code: 'REN-002', severity: 'WARN', domain: 'REN', desc: 'Compositor Thread Scroll Jank Detected' },

        // Browser Domain
        BR_001: { code: 'BR-001', severity: 'FATAL', domain: 'BR', desc: 'Target Closed / Worker Terminated During Sync' },
        BR_002: { code: 'BR-002', severity: 'ERROR', domain: 'BR', desc: 'CDP Protocol Command Execution Failure' },

        // Testing Domain
        TEST_001: { code: 'TEST-001', severity: 'ERROR', domain: 'TEST', desc: 'Simulated Network Latency Injection Exceeded Bounds' }
    };

    static get(codeString) {
        const key = codeString.replace('-', '_');
        return this.Codes[key] || { code: codeString, severity: 'ERROR', domain: 'UNKNOWN', desc: 'Unknown Failure Code' };
    }
}

export class W3CTraceContext {
    /**
     * Generates a 32-character hex trace ID.
     * @returns {string}
     */
    static generateTraceId() {
        if (typeof crypto !== 'undefined' && crypto.randomBytes) {
            return crypto.randomBytes(16).toString('hex');
        }
        let id = '';
        for (let i = 0; i < 32; i++) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
        return id;
    }

    /**
     * Generates a 16-character hex span ID.
     * @returns {string}
     */
    static generateSpanId() {
        if (typeof crypto !== 'undefined' && crypto.randomBytes) {
            return crypto.randomBytes(8).toString('hex');
        }
        let id = '';
        for (let i = 0; i < 16; i++) {
            id += Math.floor(Math.random() * 16).toString(16);
        }
        return id;
    }

    /**
     * Formats W3C traceparent header string: 00-traceId-spanId-traceFlags
     * @param {string} traceId 
     * @param {string} spanId 
     * @param {string} [traceFlags='01'] 
     * @returns {string}
     */
    static formatTraceparent(traceId, spanId, traceFlags = '01') {
        return `00-${traceId}-${spanId}-${traceFlags}`;
    }

    /**
     * Parses a W3C traceparent header string.
     * @param {string} header 
     * @returns {{version: string, traceId: string, spanId: string, traceFlags: string}|null}
     */
    static parseTraceparent(header) {
        if (!header || typeof header !== 'string') return null;
        const parts = header.trim().split('-');
        if (parts.length !== 4) return null;
        const [version, traceId, spanId, traceFlags] = parts;
        if (version !== '00' || traceId.length !== 32 || spanId.length !== 16 || traceFlags.length !== 2) {
            return null;
        }
        return { version, traceId, spanId, traceFlags };
    }
}

export class SanraTelemetryCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        this.sessionId = options.sessionId || `session-${Date.now()}`;
        this.browserId = options.browserId || 'master-0';
        this.currentTraceId = options.traceId || W3CTraceContext.generateTraceId();
        this.currentSpanId = options.spanId || W3CTraceContext.generateSpanId();
        this.currentParentSpanId = options.parentSpanId || null;
        this.events = [];
        this.maxEventsInMemory = options.maxEventsInMemory || 5000;
        this.memoryPool = null;
    }

    /**
     * Connects a SanraMemoryPool to harvest zero-allocation performance telemetry.
     * @param {SanraMemoryPool} pool
     */
    attachMemoryPool(pool) {
        this.memoryPool = pool;
    }

    /**
     * Sets current W3C Trace Context.
     * @param {string} traceId 
     * @param {string} spanId 
     * @param {string} [parentSpanId=null]
     */
    setTraceContext(traceId, spanId, parentSpanId = null) {
        if (traceId) this.currentTraceId = traceId;
        if (spanId) this.currentSpanId = spanId;
        if (parentSpanId !== undefined) this.currentParentSpanId = parentSpanId;
    }

    /**
     * Creates a child span ID under the current trace ID.
     * @returns {{traceId: string, spanId: string, parentSpanId: string, traceparent: string}}
     */
    createChildSpan() {
        const parentSpanId = this.currentSpanId;
        const spanId = W3CTraceContext.generateSpanId();
        this.currentSpanId = spanId;
        this.currentParentSpanId = parentSpanId;
        return {
            traceId: this.currentTraceId,
            spanId,
            parentSpanId,
            traceparent: W3CTraceContext.formatTraceparent(this.currentTraceId, spanId)
        };
    }

    /**
     * Emits a structured telemetry event adhering to Observability Plan Section 3.
     * @param {string} eventName
     * @param {Object} data
     * @returns {Object} Emitted event object
     */
    emitEvent(eventName, data = {}) {
        const payload = data.payload || {};
        if (data.errorCode && !payload.errorCode) {
            payload.errorCode = data.errorCode;
        }

        const event = {
            eventName,
            traceId: data.traceId || this.currentTraceId,
            spanId: data.spanId || this.currentSpanId,
            parentSpanId: data.parentSpanId !== undefined ? data.parentSpanId : (this.currentParentSpanId || null),
            sessionId: data.sessionId || this.sessionId,
            browserId: data.browserId || this.browserId,
            timestampEpochMs: data.timestampEpochMs || Date.now(),
            durationUs: data.durationUs || 0,
            severity: data.severity || 'INFO',
            subsystem: data.subsystem || 'SYNC',
            pipelineStage: data.pipelineStage || 'UNKNOWN',
            payload,
            recoveryStatus: data.recoveryStatus || 'NONE'
        };

        // If this is a failure taxonomy error code emission, record metric in memory pool if available
        if (event.severity === 'ERROR' || event.severity === 'FATAL') {
            if (this.memoryPool && typeof this.memoryPool.incrementMetric === 'function') {
                this.memoryPool.incrementMetric(6, 1); // Slot 6: TotalErrorsEncountered
            }
            logger.error(`[SANRA-TELEMETRY] [${event.severity}] [${event.subsystem}] ${eventName}: ${JSON.stringify(event.payload)}`);
        } else if (event.severity === 'WARN') {
            logger.warn(`[SANRA-TELEMETRY] [${event.severity}] [${event.subsystem}] ${eventName}: ${JSON.stringify(event.payload)}`);
        }

        this.events.push(event);
        if (this.events.length > this.maxEventsInMemory) {
            this.events.shift(); // Evict oldest
        }

        this.emit('TelemetryEvent', event);
        this.emit(eventName, event);

        return event;
    }

    /**
     * Emits a Failure Taxonomy event using a standard code string (e.g. 'IPC-001').
     * @param {string} code - e.g. 'IPC-001', 'VAL-001', 'SS-001'
     * @param {Object} [payload={}]
     * @param {Object} [overrides={}]
     */
    emitFailure(code, payload = {}, overrides = {}) {
        const taxonomy = SanraFailureTaxonomy.get(code);
        return this.emitEvent(`Failure_${taxonomy.code}`, {
            severity: overrides.severity || taxonomy.severity,
            subsystem: overrides.subsystem || taxonomy.domain,
            pipelineStage: overrides.pipelineStage || 'EXECUTION',
            payload: {
                errorCode: taxonomy.code,
                description: taxonomy.desc,
                ...payload
            },
            recoveryStatus: overrides.recoveryStatus || 'ATTEMPTING',
            ...overrides
        });
    }

    /**
     * Harvests zero-allocation performance telemetry from the attached memory pool.
     * @returns {Object|null}
     */
    harvestPoolMetrics() {
        if (!this.memoryPool || typeof this.memoryPool.getMetricsSnapshot !== 'function') {
            return null;
        }
        const snapshot = this.memoryPool.getMetricsSnapshot();
        this.emitEvent('SanraMetricsHarvested', {
            severity: 'INFO',
            subsystem: 'SYNC',
            pipelineStage: 'METRICS_HARVEST',
            payload: snapshot
        });
        return snapshot;
    }

    /**
     * Returns all recorded telemetry events in memory.
     * @returns {Array<Object>}
     */
    getEvents() {
        return [...this.events];
    }
}
