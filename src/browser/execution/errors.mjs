export class AutomationError extends Error {
    constructor(code, message, severity, owner, chain = []) {
        super(`[${code}] ${message}`);
        this.name = this.constructor.name;
        this.code = code;
        this.severity = severity; // 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL'
        this.owner = owner;       // e.g., 'LocatorResolver', 'ActionSimulator', etc.
        this.chain = chain;       // Array of upstream errors to trace root cause
    }

    addChain(errorStr) {
        this.chain.push(errorStr);
    }
}

// ----------------------------------------------------
// 1. Generation Failure (Master)
// ----------------------------------------------------
export class GenerationFailure extends AutomationError {
    constructor(code, message, severity = 'CRITICAL', owner = 'CandidateGenerator') {
        super(code, message, severity, owner);
    }
}
export class ExtractionError extends GenerationFailure { constructor(msg) { super('LF-001', msg); } }
export class StrategyError extends GenerationFailure { constructor(msg) { super('LF-002', msg, 'WARNING'); } }
export class NoCandidatesError extends GenerationFailure { constructor(msg) { super('LF-003', msg); } }

// ----------------------------------------------------
// 2. Resolution Failure (Slave)
// ----------------------------------------------------
export class ResolutionFailure extends AutomationError {
    constructor(code, message, severity = 'ERROR', owner = 'LocatorResolver') {
        super(code, message, severity, owner);
    }
}
export class NotAttachedError extends ResolutionFailure { constructor(msg) { super('LF-101', msg); } }
export class AmbiguousMatchError extends ResolutionFailure { constructor(msg) { super('LF-102', msg, 'WARNING'); } }
export class SyntaxError extends ResolutionFailure { constructor(msg) { super('LF-103', msg); } }

// ----------------------------------------------------
// 3. Validation Failure (Slave)
// ----------------------------------------------------
export class ValidationFailure extends AutomationError {
    constructor(code, message, severity = 'ERROR', owner = 'LocatorResolver') {
        super(code, message, severity, owner);
    }
}
export class HiddenError extends ValidationFailure { constructor(msg) { super('LF-201', msg); } }
export class ZeroBoundingBoxError extends ValidationFailure { constructor(msg) { super('LF-202', msg); } }
export class OutsideViewportError extends ValidationFailure { constructor(msg) { super('LF-203', msg); } }
export class DisabledError extends ValidationFailure { constructor(msg) { super('LF-204', msg); } }

// ----------------------------------------------------
// 4. Playwright Execution Failure (Slave)
// ----------------------------------------------------
export class PlaywrightExecutionFailure extends AutomationError {
    constructor(code, message, severity = 'ERROR', owner = 'ActionSimulator') {
        super(code, message, severity, owner);
    }
}
export class OverlayInterceptionError extends PlaywrightExecutionFailure { constructor(msg) { super('LF-301', msg); } }
export class ElementDetachedError extends PlaywrightExecutionFailure { constructor(msg) { super('LF-302', msg); } }
export class NotReceivableError extends PlaywrightExecutionFailure { constructor(msg) { super('LF-303', msg); } }
export class PlaywrightTimeoutError extends PlaywrightExecutionFailure { constructor(msg) { super('LF-304', msg); } }

// ----------------------------------------------------
// 5. Browser Failure (Slave)
// ----------------------------------------------------
export class BrowserFailure extends AutomationError {
    constructor(code, message, severity = 'FATAL', owner = 'BrowserRegistry') {
        super(code, message, severity, owner);
    }
}
export class PageClosedError extends BrowserFailure { constructor(msg) { super('LF-401', msg); } }
export class ContextDestroyedError extends BrowserFailure { constructor(msg) { super('LF-402', msg); } }
export class NavigationInterruptedError extends BrowserFailure { constructor(msg) { super('LF-403', msg); } }

// ----------------------------------------------------
// 6. System Failure (Framework)
// ----------------------------------------------------
export class SystemFailure extends AutomationError {
    constructor(code, message, severity = 'ERROR', owner = 'ExecutionScheduler') {
        super(code, message, severity, owner);
    }
}
export class ExecutionCancelledError extends SystemFailure { constructor(msg) { super('LF-501', msg, 'WARNING'); } }
export class SchedulerAbortedError extends SystemFailure { constructor(msg) { super('LF-502', msg, 'WARNING'); } }
export class LockLostError extends SystemFailure { constructor(msg) { super('LF-503', msg); } }
export class GlobalTimeoutError extends SystemFailure { constructor(msg) { super('LF-504', msg, 'CRITICAL', 'LocatorResolver'); } }
export class MaxAttemptsReachedError extends SystemFailure { constructor(msg) { super('LF-505', msg, 'CRITICAL', 'LocatorResolver'); } }

// Legacy export to maintain backward compatibility during rollout
export class LocatorResolutionError extends GlobalTimeoutError {
    constructor(failureReason, resolutionResult) {
        super(failureReason);
        this.resolutionResult = resolutionResult;
    }
}
