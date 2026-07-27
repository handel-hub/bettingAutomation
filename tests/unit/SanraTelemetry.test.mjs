import { describe, it, expect, vi } from 'vitest';
import {
    SanraTelemetryCollector,
    W3CTraceContext,
    SanraFailureTaxonomy
} from '../../src/browser/synchronization/telemetry/SanraTelemetry.mjs';
import { SanraMemoryPool } from '../../src/browser/synchronization/pool/SanraMemoryPool.mjs';

describe('Stage 1 — SANRA Telemetry & W3C Trace Context Propagation', () => {
    it('generates valid 32-char traceId and 16-char spanId and formats traceparent', () => {
        const traceId = W3CTraceContext.generateTraceId();
        const spanId = W3CTraceContext.generateSpanId();

        expect(traceId).toMatch(/^[0-9a-f]{32}$/);
        expect(spanId).toMatch(/^[0-9a-f]{16}$/);

        const header = W3CTraceContext.formatTraceparent(traceId, spanId, '01');
        expect(header).toBe(`00-${traceId}-${spanId}-01`);

        const parsed = W3CTraceContext.parseTraceparent(header);
        expect(parsed).toEqual({
            version: '00',
            traceId,
            spanId,
            traceFlags: '01'
        });

        expect(W3CTraceContext.parseTraceparent('invalid-header')).toBeNull();
    });

    it('collects structured telemetry events and supports span hierarchy creation', () => {
        const collector = new SanraTelemetryCollector({ sessionId: 'test-sess', browserId: 'master-1' });
        
        const parentEvent = collector.emitEvent('SyncStarted', {
            subsystem: 'SYNC',
            pipelineStage: 'CAPTURE',
            payload: { timestamp: Date.now() }
        });

        expect(parentEvent.sessionId).toBe('test-sess');
        expect(parentEvent.browserId).toBe('master-1');
        expect(parentEvent.traceId).toBe(collector.currentTraceId);
        expect(parentEvent.spanId).toBe(collector.currentSpanId);
        expect(parentEvent.parentSpanId).toBeNull();

        // Create child span
        const childSpan = collector.createChildSpan();
        expect(childSpan.traceId).toBe(collector.currentTraceId);
        expect(childSpan.parentSpanId).toBe(parentEvent.spanId);
        expect(childSpan.spanId).toBe(collector.currentSpanId);
        expect(childSpan.spanId).not.toBe(parentEvent.spanId);

        const childEvent = collector.emitEvent('VectorSerialized', {
            subsystem: 'IPC',
            pipelineStage: 'SERIALIZE',
            payload: { bytes: 64 }
        });

        expect(childEvent.spanId).toBe(childSpan.spanId);
        expect(childEvent.parentSpanId).toBe(childSpan.parentSpanId);

        const events = collector.getEvents();
        expect(events).toHaveLength(2);
    });

    it('dispatches structured Failure Taxonomy codes and increments error counters on attached memory pool', () => {
        const pool = new SanraMemoryPool({ vectorSlots: 10, keyframeSlots: 5 });
        const collector = new SanraTelemetryCollector();
        collector.attachMemoryPool(pool);

        const failureEvent = collector.emitFailure('IPC-001', {
            reason: 'Ualigned memory offset 4',
            bufferLength: 64
        });

        expect(failureEvent.eventName).toBe('Failure_IPC-001');
        expect(failureEvent.severity).toBe('FATAL');
        expect(failureEvent.subsystem).toBe('IPC');
        expect(failureEvent.payload.errorCode).toBe('IPC-001');
        expect(failureEvent.payload.description).toContain('FlatBuffer Schema Alignment');
        expect(failureEvent.recoveryStatus).toBe('ATTEMPTING');

        // Verify that slot 6 (TotalErrorsEncountered) was incremented in the memory pool
        expect(pool.getMetric(6)).toBe(1);

        // Test harvesting pool metrics through telemetry collector
        const harvested = collector.harvestPoolMetrics();
        expect(harvested.totalErrorsEncountered).toBe(1);
        expect(collector.getEvents()).toHaveLength(2); // Failure + Harvest
    });
});
