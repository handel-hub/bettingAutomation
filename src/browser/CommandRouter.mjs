import { logger } from '../config.mjs';
import featureFlags from './execution/locatorIntelligence/FeatureFlags.mjs';
import { CommandPayloadSchema } from './execution/schema/CommandPayloadSchema.mjs';
import { TelemetryCollector } from './execution/locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { ContractViolationError } from './execution/errors.mjs';

export class CommandRouter {
    constructor() {
        this.handlers = new Map();
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

    async route(command) {
        if (!command || !command.category) {
            logger.warn('Received invalid command object without a category');
            return;
        }

        // v3 Ingress Contract Gating
        const enforcementMode = featureFlags.get('V3_SCHEMA_ENFORCEMENT_MODE') || 'DISABLED';
        if (enforcementMode === 'STRICT' || enforcementMode === 'SHADOW') {
            const validation = CommandPayloadSchema.validate(command);
            if (!validation.valid) {
                const errorMsg = `[LF-701] Ingress Contract Violation (${command.id || 'unknown'}): ${validation.errors.join('; ')}`;
                if (enforcementMode === 'STRICT') {
                    logger.error(`[CommandRouter] STRICT mode rejecting command: ${errorMsg}`);
                    TelemetryCollector.registry.recordFailureCode('LF-701');
                    throw new ContractViolationError(errorMsg);
                } else if (enforcementMode === 'SHADOW') {
                    logger.warn(`[CommandRouter] SHADOW mode violation logged (proceeding with route): ${errorMsg}`);
                    TelemetryCollector.registry.recordFailureCode('LF-701');
                }
            }
        }

        const categoryMap = this.handlers.get(command.category);
        if (!categoryMap) {
            logger.debug(`No handlers registered for category [${command.category}]`);
            return;
        }

        const exactHandlers = categoryMap.get(command.type) || [];
        const wildcardHandlers = categoryMap.get('*') || [];
        const allHandlers = [...exactHandlers, ...wildcardHandlers];

        if (allHandlers.length === 0) {
            logger.debug(`No handlers registered for command [${command.category} : ${command.type}]`);
            return;
        }

        logger.info(`[CommandRouter] Routing [${command.category}:${command.type}] (${command.id})`);

        const promises = allHandlers.map(async (handler) => {
            try {
                await handler(command);
            } catch (err) {
                logger.error(`Error in Command handler for [${command.category}:${command.type}]: ${err.message}`);
            }
        });

        await Promise.allSettled(promises);
    }
}
