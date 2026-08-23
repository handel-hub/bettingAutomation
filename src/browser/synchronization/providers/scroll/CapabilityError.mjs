export class CapabilityError extends Error {
    constructor(code, message, expectedState, actualState) {
        super(`[${code}] ${message}`);
        this.name = 'CapabilityError';
        this.code = code;
        this.expectedState = expectedState;
        this.actualState = actualState;
    }
}
