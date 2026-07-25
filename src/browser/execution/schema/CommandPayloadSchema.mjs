import { ContractViolationError } from '../errors.mjs';

/**
 * Authoritative v3 schema validation engine for incoming IPC command payloads.
 * Ensures strict structural and semantic contract compliance before routing.
 */
export class CommandPayloadSchema {
    /**
     * Validates an incoming command object against structural and semantic rules.
     * @param {object} command - The incoming command object to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validate(command) {
        const errors = [];

        if (!command || typeof command !== 'object') {
            errors.push('Command must be a non-null object.');
            return { valid: false, errors };
        }

        // Top-level mandatory attributes
        if (!command.id || typeof command.id !== 'string' || command.id.trim() === '') {
            errors.push('Command missing valid string "id".');
        }

        if (!command.type || typeof command.type !== 'string' || command.type.trim() === '') {
            errors.push('Command missing valid string "type".');
        }

        if (!command.category || typeof command.category !== 'string' || command.category.trim() === '') {
            errors.push('Command missing valid string "category".');
        }

        const timestamp = command.captureTime !== undefined ? command.captureTime : command.timestamp;
        if (timestamp === undefined || typeof timestamp !== 'number' || isNaN(timestamp)) {
            errors.push('Command missing valid numeric timestamp or captureTime.');
        }

        // Category-specific validation for Execution commands (non-macro)
        if (command.category === 'Execution' && command.type !== 'macro') {
            if (!command.payload || typeof command.payload !== 'object') {
                errors.push('Execution command missing object "payload".');
            } else {
                const p = command.payload;
                // Must have interactionId or an element identifier (selector / EID / locator)
                if (!p.interactionId && !p.selector && !p.eid && !p.locator) {
                    errors.push('Execution payload must contain interactionId, selector, eid, or locator.');
                }

                // If coordinates are provided, they must be numeric x and y
                if (p.coordinates !== undefined && p.coordinates !== null) {
                    if (typeof p.coordinates !== 'object' ||
                        typeof p.coordinates.x !== 'number' || isNaN(p.coordinates.x) ||
                        typeof p.coordinates.y !== 'number' || isNaN(p.coordinates.y)) {
                        errors.push('Execution payload coordinates must be an object with numeric x and y.');
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validates a command and throws a ContractViolationError (LF-701) if invalid.
     * @param {object} command - The incoming command object to validate
     * @returns {boolean} true if valid
     * @throws {ContractViolationError} if validation fails
     */
    static validateOrThrow(command) {
        const result = this.validate(command);
        if (!result.valid) {
            const errorMsg = `Command payload failed schema validation: ${result.errors.join('; ')}`;
            throw new ContractViolationError(errorMsg);
        }
        return true;
    }
}
