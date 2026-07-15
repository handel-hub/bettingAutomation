export class LocatorResolutionError extends Error {
    constructor(failureReason, resolutionResult) {
        super(`LocatorResolver failed: ${failureReason}`);
        this.name = 'LocatorResolutionError';
        this.resolutionResult = resolutionResult;
    }
}
