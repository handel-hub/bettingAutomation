import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

describe('Phase 7 — Observability Enhancements (Asymmetrical Sampling, PII Scrubbing, Deferred Dispatch)', () => {
    beforeEach(() => {
        TelemetryCollector.reset();
        TelemetryCollector.setSamplingRate(0.01); // default 1%
        TelemetryCollector.onDispatch = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Asymmetrical Sampling', () => {
        it('should sample 100% of errors and failures regardless of command type', () => {
            TelemetryCollector.setSamplingRate(0); // 0% mundane sampling

            TelemetryCollector.recordLifecycleEvent({
                interactionType: 'hover',
                validationResult: 'FAIL_LF504',
                errorDetails: { errorCode: 'LF504', errorMessage: 'Timeout waiting for hover target' }
            });

            TelemetryCollector.recordLifecycleEvent({
                interactionType: 'scroll',
                validationResult: 'FAIL_LF505',
                errorDetails: { errorCode: 'LF505', errorMessage: 'Exhausted candidates during scroll' }
            });

            const snap = TelemetryCollector.snapshot();
            expect(snap.sampling.sampled).toBe(2);
            expect(snap.sampling.suppressed).toBe(0);
        });

        it('should sample 100% of discrete commands (click, fill, keypress) on success', () => {
            TelemetryCollector.setSamplingRate(0.01); // 1% for mundane

            TelemetryCollector.recordLifecycleEvent({ interactionType: 'click', validationResult: 'PASS' });
            TelemetryCollector.recordLifecycleEvent({ interactionType: 'fill', validationResult: 'PASS' });
            TelemetryCollector.recordLifecycleEvent({ interactionType: 'keypress', validationResult: 'PASS' });

            const snap = TelemetryCollector.snapshot();
            expect(snap.sampling.sampled).toBe(3);
            expect(snap.sampling.suppressed).toBe(0);
        });

        it('should suppress mundane commands (hover, scroll, mousemove) based on sampling rate', () => {
            TelemetryCollector.setSamplingRate(0.1); // 1 in 10

            for (let i = 0; i < 20; i++) {
                TelemetryCollector.recordLifecycleEvent({
                    interactionType: 'mousemove',
                    validationResult: 'PASS'
                });
            }

            const snap = TelemetryCollector.snapshot();
            expect(snap.sampling.sampled).toBe(2); // 1st and 11th
            expect(snap.sampling.suppressed).toBe(18);
        });
    });

    describe('PII Scrubbing', () => {
        it('should scrub credit cards, SSNs, emails, and secrets from string fields', () => {
            const spy = vi.fn();
            TelemetryCollector.onDispatch = spy;

            TelemetryCollector.recordLifecycleEvent({
                interactionType: 'fill',
                validationResult: 'PASS',
                stageName: 'INPUT_FILL',
                errorDetails: {
                    errorMessage: 'Failed to fill input with credit card 4111 2222 3333 4444 and SSN 123-45-6789 for user test.admin@example.org with Bearer abcde12345='
                },
                locator: 'input[name="password"] is secret123_abc!'
            });

            TelemetryCollector.flush();
            expect(spy).toHaveBeenCalledTimes(1);
            const batch = JSON.parse(spy.mock.calls[0][0]);
            expect(batch.length).toBe(1);
            const ev = batch[0];
            expect(ev.errorDetails.errorMessage).toContain('[SCRUBBED_CARD]');
            expect(ev.errorDetails.errorMessage).toContain('[SCRUBBED_SSN]');
            expect(ev.errorDetails.errorMessage).toContain('[SCRUBBED_EMAIL]');
            expect(ev.errorDetails.errorMessage).toContain('Bearer [SCRUBBED_TOKEN]');
            expect(ev.errorDetails.errorMessage).not.toContain('4111');
            expect(ev.errorDetails.errorMessage).not.toContain('test.admin@example.org');
        });

        it('should recursively scrub nested objects and arrays without mutating non-PII values', () => {
            const raw = {
                id: 123,
                tags: ['normal_tag', 'email: user@domain.com'],
                meta: {
                    token: 'secret is super_secret_token_val',
                    count: 50
                }
            };

            const scrubbed = TelemetryCollector.scrubPII(raw);
            expect(scrubbed.id).toBe(123);
            expect(scrubbed.tags[0]).toBe('normal_tag');
            expect(scrubbed.tags[1]).toBe('email: [SCRUBBED_EMAIL]');
            expect(scrubbed.meta.token).toBe('secret is [SCRUBBED]');
            expect(scrubbed.meta.count).toBe(50);
        });
    });

    describe('Deferred Serialization & Asynchronous Dispatch', () => {
        it('should buffer events in dispatchQueue and flush asynchronously or on command', () => {
            const spy = vi.fn();
            TelemetryCollector.onDispatch = spy;

            TelemetryCollector.recordLifecycleEvent({ interactionType: 'click', validationResult: 'PASS' });
            expect(TelemetryCollector.dispatchQueue.length).toBe(1);
            expect(spy).not.toHaveBeenCalled();

            TelemetryCollector.flush();
            expect(TelemetryCollector.dispatchQueue.length).toBe(0);
            expect(spy).toHaveBeenCalledTimes(1);
            const batch = JSON.parse(spy.mock.calls[0][0]);
            expect(batch[0].interactionType).toBe('click');
        });

        it('should trigger immediate synchronous flush when a failure event is recorded', () => {
            const spy = vi.fn();
            TelemetryCollector.onDispatch = spy;

            // Enqueue a normal event
            TelemetryCollector.recordLifecycleEvent({ interactionType: 'click', validationResult: 'PASS' });
            expect(TelemetryCollector.dispatchQueue.length).toBe(1);
            expect(spy).not.toHaveBeenCalled();

            // Enqueue a failure event -> should trigger immediate synchronous flush of all buffered events!
            TelemetryCollector.recordLifecycleEvent({
                interactionType: 'click',
                validationResult: 'FAIL_LF505',
                errorDetails: { errorCode: 'LF505', errorMessage: 'Resolution failed' }
            });

            expect(TelemetryCollector.dispatchQueue.length).toBe(0);
            expect(spy).toHaveBeenCalledTimes(1);
            const batch = JSON.parse(spy.mock.calls[0][0]);
            expect(batch.length).toBe(2);
            expect(batch[0].validationResult).toBe('PASS');
            expect(batch[1].validationResult).toBe('FAIL_LF505');
        });
    });
});
