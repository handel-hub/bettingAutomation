import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandPayloadSchema } from '../CommandPayloadSchema.mjs';
import { ContractViolationError } from '../../errors.mjs';
import { CommandRouter } from '../../../CommandRouter.mjs';
import featureFlags from '../../locatorIntelligence/FeatureFlags.mjs';
import { TelemetryCollector } from '../../locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { RollingWindow } from '../../locatorIntelligence/telemetry/RollingWindow.mjs';

describe('Milestone 1: Telemetry Bug Fix & Ingress Contract Gating Tests', () => {
    beforeEach(() => {
        TelemetryCollector.reset();
        featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW' });
    });

    describe('CommandPayloadSchema Unit Tests', () => {
        it('validates a correct Execution command payload successfully', () => {
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

        it('fails validation when mandatory top-level attributes are missing', () => {
            const invalidCommand = {
                type: 'click',
                category: 'Execution'
                // missing id and timestamp/captureTime
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('id'))).toBe(true);
            expect(result.errors.some(e => e.includes('timestamp or captureTime'))).toBe(true);
        });

        it('fails validation when Execution command payload lacks element identifiers', () => {
            const invalidCommand = {
                id: 'cmd-999',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {
                    // no interactionId, selector, eid, or locator
                    coordinates: { x: 10, y: 10 }
                }
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('interactionId, selector, eid, or locator'))).toBe(true);
        });

        it('fails validation when coordinates are non-numeric', () => {
            const invalidCommand = {
                id: 'cmd-888',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {
                    selector: '#btn',
                    coordinates: { x: 'invalid', y: 20 }
                }
            };
            const result = CommandPayloadSchema.validate(invalidCommand);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('numeric x and y'))).toBe(true);
        });

        it('throws ContractViolationError when validateOrThrow is called on invalid command', () => {
            const invalidCommand = { id: '', type: 'test', category: 'Execution', timestamp: Date.now() };
            expect(() => CommandPayloadSchema.validateOrThrow(invalidCommand)).toThrow(ContractViolationError);
            expect(() => CommandPayloadSchema.validateOrThrow(invalidCommand)).toThrow(/LF-701/);
        });
    });

    describe('CommandRouter Ingress Gating Integration Tests', () => {
        let router;
        let mockHandler;

        beforeEach(() => {
            router = new CommandRouter();
            mockHandler = vi.fn();
            router.register('Execution', 'click', mockHandler);
        });

        it('routes command normally without throwing in SHADOW mode, but logs violation and telemetry', async () => {
            featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'SHADOW' });
            const invalidCommand = {
                id: 'cmd-shadow-fail',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {} // invalid payload
            };

            await expect(router.route(invalidCommand)).resolves.not.toThrow();
            expect(mockHandler).toHaveBeenCalledTimes(1);
            expect(TelemetryCollector.registry.failures.get('LF-701')).toBe(1);
        });

        it('throws ContractViolationError and rejects routing in STRICT mode', async () => {
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
        });

        it('skips validation entirely when V3_SCHEMA_ENFORCEMENT_MODE is DISABLED', async () => {
            featureFlags.resetForTesting({ V3_SCHEMA_ENFORCEMENT_MODE: 'DISABLED' });
            const invalidCommand = {
                id: 'cmd-disabled-fail',
                type: 'click',
                category: 'Execution',
                timestamp: Date.now(),
                payload: {} // invalid payload
            };

            await expect(router.route(invalidCommand)).resolves.not.toThrow();
            expect(mockHandler).toHaveBeenCalledTimes(1);
            expect(TelemetryCollector.registry.failures.get('LF-701')).toBeUndefined();
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
});
