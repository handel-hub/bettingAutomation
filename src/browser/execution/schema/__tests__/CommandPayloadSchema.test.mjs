import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandPayloadSchema } from '../CommandPayloadSchema.mjs';
import { ContractViolationError } from '../../errors.mjs';
import { Command } from '../../Command.mjs';
import { CommandRouter } from '../../../CommandRouter.mjs';
import featureFlags from '../../locatorIntelligence/FeatureFlags.mjs';
import { TelemetryCollector } from '../../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { RollingWindow } from '../../locatorIntelligence/telemetry/RollingWindow.mjs';

describe('Milestone 1: Authoritative Ingress Contract & Schema Gating Tests', () => {
    beforeEach(() => {
        TelemetryCollector.reset();
        featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW' });
    });

    describe('CommandPayloadSchema Unit & v3 Specification Tests', () => {
        it('validates a correct v2 Execution command payload successfully', () => {
            const validCommand = {
                id: 'cmd-123',
                type: 'click',
                category: 'Execution',
                captureTime: Date.now(),
                payload: {
                    interactionId: 'int-456',
                    selector: '#login-btn',
                    coordinates: { x: 100, y: 200 }
                }
            };
            const result = CommandPayloadSchema.validate(validCommand);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('validates a correct Candidate D v3 Execution command payload successfully', () => {
            const validV3Command = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                priority: 'CRITICAL',
                sequenceNumber: 104,
                epoch: 2,
                timestamp: Date.now(),
                ttlMs: 3000,
                idempotencyKey: 'hash-abc-123',
                target: {
                    primarySelector: '#submit-btn',
                    fallbackSelectors: ['.btn-primary'],
                    shadowPath: [],
                    frameUrl: 'http://localhost/form'
                },
                masterEID: {
                    identityHash: 'hash-eid-999',
                    tagName: 'BUTTON',
                    attributes: { id: 'submit-btn', type: 'submit' },
                    boundingBox: { x: 50, y: 50, width: 100, height: 30 }
                }
            };
            const result = CommandPayloadSchema.validate(validV3Command);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('fails validation when mandatory top-level attributes are missing', () => {
            const invalidCommand = {
                type: 'click',
                category: 'Execution'
                // missing id/commandId and timestamp/captureTime
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('id') || e.includes('commandId'))).toBe(true);
            expect(result.errors.some(e => e.includes('timestamp or captureTime'))).toBe(true);
        });

        it('fails validation when commandId is present but not a valid UUIDv4 or test prefix', () => {
            const invalidCommand = {
                commandId: 'invalid-uuid-string',
                type: 'CLICK',
                category: 'Execution',
                timestamp: Date.now(),
                target: { primarySelector: '#btn' }
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('UUIDv4'))).toBe(true);
        });

        it('fails validation when v3 numeric attributes are out of bounds or malformed', () => {
            const invalidCommand = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: Date.now(),
                sequenceNumber: -5,
                epoch: 1.5,
                ttlMs: 0,
                priority: 'SUPER_HIGH',
                target: { primarySelector: '#btn' }
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('sequenceNumber'))).toBe(true);
            expect(result.errors.some(e => e.includes('epoch'))).toBe(true);
            expect(result.errors.some(e => e.includes('ttlMs'))).toBe(true);
            expect(result.errors.some(e => e.includes('priority'))).toBe(true);
        });

        it('validates EID structural integrity via static isEIDValid()', () => {
            expect(CommandPayloadSchema.isEIDValid(null)).toBe(false);
            expect(CommandPayloadSchema.isEIDValid({})).toBe(false);
            expect(CommandPayloadSchema.isEIDValid({ identityHash: 'hash' })).toBe(false);
            expect(CommandPayloadSchema.isEIDValid({ identityHash: 'hash', tagName: '' })).toBe(false);
            expect(CommandPayloadSchema.isEIDValid({
                identityHash: 'hash-1',
                tagName: 'DIV',
                boundingBox: { x: 'invalid', y: 0, width: 10, height: 10 }
            })).toBe(false);

            expect(CommandPayloadSchema.isEIDValid({
                identityHash: 'valid-hash',
                tagName: 'INPUT',
                attributes: { type: 'text' },
                boundingBox: { x: 0, y: 0, width: 100, height: 20 }
            })).toBe(true);
        });

        it('fails command validation when explicitly provided masterEID is malformed', () => {
            const invalidCommand = {
                id: 'cmd-1',
                type: 'CLICK',
                category: 'Execution',
                timestamp: Date.now(),
                target: { primarySelector: '#btn' },
                masterEID: { identityHash: 'missing-tagname' }
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('masterEID'))).toBe(true);
        });

        it('throws ContractViolationError when validateOrThrow is called on invalid command', () => {
            const invalidCommand = { id: '', type: 'test', category: 'Execution', timestamp: Date.now() };
            expect(() => CommandPayloadSchema.validateOrThrow(invalidCommand)).toThrow(ContractViolationError);
            expect(() => CommandPayloadSchema.validateOrThrow(invalidCommand)).toThrow(/LF-701/);
        });

        it('benchmarks compileSchema() and ensures validation executes in < 0.2ms', () => {
            CommandPayloadSchema.compileSchema();
            const validV3Command = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: Date.now(),
                target: { primarySelector: '#btn' }
            };

            // Warmup
            for (let i = 0; i < 100; i++) {
                CommandPayloadSchema.validate(validV3Command);
            }

            const start = performance.now();
            const iterations = 1000;
            for (let i = 0; i < iterations; i++) {
                CommandPayloadSchema.validate(validV3Command);
            }
            const duration = performance.now() - start;
            const avgMs = duration / iterations;

            expect(avgMs).toBeLessThan(0.2);
        });
    });

    describe('CommandRouter Ingress Gating & Protocol Version Integration Tests', () => {
        let router;
        let mockHandler;

        beforeEach(() => {
            router = new CommandRouter();
            mockHandler = vi.fn();
            router.register('Execution', 'click', mockHandler);
            router.register('Execution', 'CLICK', mockHandler);
        });

        it('routes command normally without throwing in SHADOW mode, logging violation and telemetry', async () => {
            featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW' });
            const invalidCommand = {
                id: 'cmd-shadow-fail',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {} // invalid payload
            };

            await expect(router.route(invalidCommand)).resolves.toBe(true);
            expect(mockHandler).toHaveBeenCalledTimes(1);
            expect(TelemetryCollector.registry.failures.get('LF-701')).toBe(1);
            const metrics = router.getIngressMetrics();
            expect(metrics.received).toBe(1);
            expect(metrics.routed).toBe(1);
        });

        it('throws ContractViolationError and increments rejected metric in STRICT mode', async () => {
            featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'STRICT' });
            const invalidCommand = {
                id: 'cmd-strict-fail',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {} // invalid payload
            };

            await expect(router.route(invalidCommand)).rejects.toThrow(ContractViolationError);
            expect(mockHandler).not.toHaveBeenCalled();
            expect(TelemetryCollector.registry.failures.get('LF-701')).toBe(1);
            const metrics = router.getIngressMetrics();
            expect(metrics.received).toBe(1);
            expect(metrics.rejected).toBe(1);
            expect(metrics.routed).toBe(0);
        });

        it('supports setEnforcementMode overriding feature flag defaults', async () => {
            featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED' });
            router.setEnforcementMode('STRICT');
            const invalidCommand = {
                id: 'cmd-override-fail',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {}
            };

            await expect(router.route(invalidCommand)).rejects.toThrow(ContractViolationError);
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it('parses raw string JSON payloads safely and negotiates v3 protocol version from headers', async () => {
            const validV3Command = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: Date.now(),
                target: { primarySelector: '#btn' }
            };
            const rawJson = JSON.stringify(validV3Command);

            const routed = await router.route(rawJson, { 'X-AGY-Protocol-Version': '3.0' });
            expect(routed).toBe(true);
            expect(mockHandler).toHaveBeenCalledTimes(1);
            const metrics = router.getIngressMetrics();
            expect(metrics.received).toBe(1);
            expect(metrics.routed).toBe(1);
        });

        it('rejects unparseable JSON string payloads with LF-701 violation in STRICT mode', async () => {
            router.setEnforcementMode('STRICT');
            const unparseable = '{"commandId": "550e8400...", broken_json: true';

            await expect(router.route(unparseable)).rejects.toThrow(ContractViolationError);
            expect(TelemetryCollector.registry.failures.get('LF-701')).toBe(1);
            const metrics = router.getIngressMetrics();
            expect(metrics.received).toBe(1);
            expect(metrics.rejected).toBe(1);
        });
    });

    describe('TelemetryBugFix and Memory Clamping Tests', () => {
        it('records shadow mode comparison metrics without throwing TypeError', () => {
            expect(() => {
                TelemetryCollector.recordShadowMode('cmd-1', { locator: '.btn-1' }, { locator: '.btn-1' });
                TelemetryCollector.recordShadowMode('cmd-2', { locator: '.btn-1' }, { locator: '.btn-2' });
            }).not.toThrow();

            const snap = TelemetryCollector.snapshot();
            expect(snap.shadowMode.total).toBe(2);
            expect(snap.shadowMode.matches).toBe(1);
            expect(snap.shadowMode.mismatches).toBe(1);
        });

        it('strictly clamps RollingWindow size between 1 and 1000', () => {
            const tooSmall = new RollingWindow(-50);
            expect(tooSmall.size).toBe(1);

            const tooLarge = new RollingWindow(50000);
            expect(tooLarge.size).toBe(1000);

            const normal = new RollingWindow(256);
            expect(normal.size).toBe(256);
        });
    });

    describe('Phase 1: Canonical Timestamp Ingress Standardization (LF-701)', () => {
        it('rejects ISO string timestamp even in SHADOW mode with LF-701 error message', () => {
            const now = Date.now();
            const isoString = new Date(now).toISOString();
            const cmd = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: isoString,
                target: { primarySelector: '#btn' }
            };

            const res = CommandPayloadSchema.validate(cmd, 'SHADOW');
            expect(res.valid).toBe(false);
            expect(res.coercedTimestamp).toBe(false);
            expect(res.errors.some(e => e.includes('Int64 Unix Epoch Milliseconds'))).toBe(true);
        });

        it('rejects ISO string timestamp in STRICT mode with LF-701 error message', () => {
            const now = Date.now();
            const isoString = new Date(now).toISOString();
            const cmd = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: isoString,
                target: { primarySelector: '#btn' }
            };

            const res = CommandPayloadSchema.validate(cmd, 'STRICT');
            expect(res.valid).toBe(false);
            expect(res.coercedTimestamp).toBe(false);
            expect(res.errors.some(e => e.includes('Int64 Unix Epoch Milliseconds'))).toBe(true);
        });

        it('rejects non-integer float timestamp in STRICT and SHADOW mode', () => {
            const floatTs = Date.now() + 0.45;
            const cmdStrict = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: floatTs,
                target: { primarySelector: '#btn' }
            };
            const resStrict = CommandPayloadSchema.validate(cmdStrict, 'STRICT');
            expect(resStrict.valid).toBe(false);
            expect(resStrict.errors.some(e => e.includes('must be an integer'))).toBe(true);

            const cmdShadow = {
                commandId: '550e8400-e29b-41d4-a716-446655440000',
                type: 'CLICK',
                category: 'Execution',
                timestamp: floatTs,
                target: { primarySelector: '#btn' }
            };
            const resShadow = CommandPayloadSchema.validate(cmdShadow, 'SHADOW');
            expect(resShadow.valid).toBe(false);
            expect(resShadow.coercedTimestamp).toBe(false);
            expect(resShadow.errors.some(e => e.includes('must be an integer'))).toBe(true);
        });

        it('Command constructor stores timestamp and captureTime strictly as integer milliseconds', () => {
            const now = Date.now();
            const iso = new Date(now).toISOString();
            const cmd = new Command({
                type: 'click',
                timestamp: iso,
                captureTime: iso
            });
            expect(typeof cmd.timestamp).toBe('number');
            expect(typeof cmd.captureTime).toBe('number');
            expect(cmd.timestamp).toBe(Date.parse(iso));
            expect(cmd.captureTime).toBe(Date.parse(iso));
        });
    });
});

