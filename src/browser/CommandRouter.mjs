import { logger } from '../config.mjs';
import featureFlags from './execution/locatorIntelligence/FeatureFlags.mjs';
import featureFlagManager from './coordination/FeatureFlagManager.mjs';
import { CommandPayloadSchema } from './execution/schema/CommandPayloadSchema.mjs';
import { TelemetryCollector } from './execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { ContractViolationError } from './execution/errors.mjs';

/**
 * Authoritative Ingress Gateway for routing IPC/WebSocket command payloads.
 * Enforces CommandPayloadSchema contracts, governs STRICT/SHADOW/DISABLED enforcement modes,
 * and tracks ingress telemetry metrics.
 */
export class CommandRouter {
    constructor(scheduler = null, flagManager = null, telemetryCollector = null) {
        this.handlers = new Map();
        this._mode = null; // Can override feature flag if explicitly set via setEnforcementMode
        this._metrics = {
            received: 0,
            rejected: 0,
            routed: 0
        };
        this.featureFlagManager = flagManager || featureFlagManager;

        this.register('Configuration', 'UPDATE_CONFIG', async (cmd) => {
            if (this.featureFlagManager && cmd.payload) {
                this.featureFlagManager.updateConfiguration(cmd.payload);
                logger.info(`[CommandRouter] Updated configuration via UPDATE_CONFIG command.`);
            }
        });
        this.register('Configuration', 'BROADCAST_ROLLBACK', async (cmd) => {
            if (this.featureFlagManager) {
                this.featureFlagManager.broadcastRollback();
                logger.warn(`[CommandRouter] Emergency rollback triggered via BROADCAST_ROLLBACK command.`);
            }
        });
    }

    /**
     * Sets the schema enforcement mode explicitly, overriding feature flag defaults.
     * @param {'STRICT' | 'SHADOW' | 'DISABLED'} mode - The enforcement mode
     */
    setEnforcementMode(mode) {
        const validModes = ['STRICT', 'SHADOW', 'DISABLED'];
        if (validModes.includes(mode)) {
            this._mode = mode;
            logger.info(`[CommandRouter] Enforcement mode set to: ${mode}`);
        } else {
            logger.warn(`[CommandRouter] Attempted to set invalid enforcement mode: ${mode}`);
        }
    }

    /**
     * Returns a snapshot of ingress metrics.
     * @returns {{ received: number, rejected: number, routed: number }}
     */
    getIngressMetrics() {
        return { ...this._metrics };
    }

    /**
     * Helper to safely parse raw incoming payloads (string or object).
     * @param {string | object} raw - Raw payload
     * @returns {object | null} Parsed object or null if parsing fails
     * @private
     */
    _parsePayload(raw) {
        if (!raw) return null;
        if (typeof raw === 'object') return raw;
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw);
            } catch (err) {
                logger.warn(`[CommandRouter] Failed to parse JSON payload string: ${err.message}`);
                return null;
            }
        }
        return null;
    }

    /**
     * Helper to emit structural violation telemetry and log error.
     * @param {string} errorMsg - Violation description
     * @param {object} payload - The offending command payload
     * @private
     */
    _emitViolation(errorMsg, payload) {
        TelemetryCollector.registry.recordFailureCode('LF-701');
        logger.warn(`[CommandRouter] [LF-701] Violation emitted for command [${payload?.id || payload?.commandId || 'unknown'}]: ${errorMsg}`);
    }

    /**
     * Helper to negotiate wire protocol version from headers or payload.
     * @param {object} headersOrPayload - Headers map or command payload
     * @returns {string} Protocol version ('3.0' or '2.0')
     * @private
     */
    _negotiateVersion(headersOrPayload) {
        if (!headersOrPayload || typeof headersOrPayload !== 'object') return '2.0';
        const version = headersOrPayload['X-AGY-Protocol-Version'] || 
                        headersOrPayload._protocolVersion || 
                        headersOrPayload.version || 
                        headersOrPayload.protocolVersion;
        if (version && String(version).startsWith('3.')) {
            return '3.0';
        }
        return '2.0';
    }

    register(category, type, handler) {
        if (!this.handlers.has(category)) {
            this.handlers.set(category, new Map());
        }
        const categoryMap = this.handlers.get(category);
        
        if (!categoryMap.has(type)) {
            categoryMap.set(type, []);
        }
        categoryMap.get(type).push(handler);
    }

    /**
     * Ingests, validates, and routes an incoming command to registered handlers.
     * @param {string | object} rawCommand - Incoming command payload
     * @param {object} [headers] - Optional wire headers for protocol version negotiation
     * @returns {Promise<boolean>} true if routed successfully, false if rejected or unhandled
     */
    async route(rawCommand, headers = null) {
        this._metrics.received++;

        const command = this._parsePayload(rawCommand);
        if (!command || typeof command !== 'object') {
            this._metrics.rejected++;
            const errorMsg = '[LF-701] Ingress Contract Violation: Malformed JSON or non-object payload';
            this._emitViolation(errorMsg, { id: 'unparseable' });
            const enforcementMode = this._mode || (this.featureFlagManager ? this.featureFlagManager.getSchemaMode() : featureFlags.get('V3_SCHEMA_ENFORCEMENT_MODE')) || 'DISABLED';
            if (enforcementMode === 'STRICT') {
                logger.error(`[CommandRouter] STRICT mode rejecting unparseable payload: ${errorMsg}`);
                throw new ContractViolationError(errorMsg);
            }
            return false;
        }

        const protocolVersion = this._negotiateVersion(headers || command);
        logger.debug(`[CommandRouter] Negotiated protocol version: ${protocolVersion}`);

        if (!command.category && !command.type) {
            this._metrics.rejected++;
            logger.warn('Received invalid command object without category or type');
            return false;
        }

        // v3 Ingress Contract Gating
        const enforcementMode = this._mode || (this.featureFlagManager ? this.featureFlagManager.getSchemaMode() : featureFlags.get('V3_SCHEMA_ENFORCEMENT_MODE')) || 'DISABLED';
        if (enforcementMode === 'STRICT' || enforcementMode === 'SHADOW') {
            const validation = CommandPayloadSchema.validate(command);
            if (!validation.valid) {
                const errorMsg = `[LF-701] Ingress Contract Violation (${command.id || command.commandId || 'unknown'}): ${validation.errors.join('; ')}`;
                this._emitViolation(errorMsg, command);
                if (enforcementMode === 'STRICT') {
                    this._metrics.rejected++;
                    logger.error(`[CommandRouter] STRICT mode rejecting command: ${errorMsg}`);
                    throw new ContractViolationError(errorMsg);
                } else if (enforcementMode === 'SHADOW') {
                    logger.warn(`[CommandRouter] SHADOW mode violation logged (proceeding with route): ${errorMsg}`);
                }
            }
        }

        const category = command.category || (command.type === 'NAVIGATE' || command.type === 'navigate' ? 'Navigation' : 'Execution');
        const categoryMap = this.handlers.get(category);
        if (!categoryMap) {
            logger.debug(`No handlers registered for category [${category}]`);
            return false;
        }

        const exactHandlers = categoryMap.get(command.type) || [];
        const wildcardHandlers = categoryMap.get('*') || [];
        const allHandlers = [...exactHandlers, ...wildcardHandlers];

        if (allHandlers.length === 0) {
            logger.debug(`No handlers registered for command [${category} : ${command.type}]`);
            return false;
        }

        logger.info(`[CommandRouter] Routing [${category}:${command.type}] (${command.id || command.commandId}) [Protocol v${protocolVersion}]`);

        const promises = allHandlers.map(async (handler) => {
            try {
                await handler(command);
            } catch (err) {
                logger.error(`Error in Command handler for [${category}:${command.type}]: ${err.message}`);
                throw err;
            }
        });

        await Promise.allSettled(promises);
        this._metrics.routed++;
        return true;
    }
}
