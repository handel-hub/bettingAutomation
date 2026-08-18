import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { TimeConstants } from '../../time/TimeConstants.mjs';

export class RecoveryOutcome {
    constructor({ status, result, level, attempts, duration, history, terminalError = null, circuitBreakerTripped = false }) {
        this.status = status;     // 'RESOLVED' | 'SKIPPED' | 'ABORTED'
        this.result = result;     // ResolutionResult | null
        this.level = level;       // 'L0' | 'L3' | 'L3.5' | 'EXHAUSTED'
        this.attempts = attempts; // Total attempts
        this.duration = duration; // Total time
        this.history = history;   // Array<{level, error, duration}>
        this.terminalError = terminalError;
        this.circuitBreakerTripped = circuitBreakerTripped;
    }
}

export class RecoveryOrchestrator {
    constructor() {
    }

    _abortOutcome(state, startTime, level, terminalError = null, circuitBreakerTripped = false) {
        return new RecoveryOutcome({
            status: 'ABORTED',
            result: null,
            level,
            attempts: state.attempts,
            duration: Date.now() - startTime,
            history: state.history,
            terminalError,
            circuitBreakerTripped
        });
    }

    async orchestrate(resolveFn, interactionType, page, options = {}) {
        const startTime = Date.now();
        const maxRecoveryMs = options.maxRecoveryMs !== undefined ? options.maxRecoveryMs : TimeConstants.T_MAX_RECOVERY_MS;
        const hardDeadline = startTime + maxRecoveryMs;
        const state = {
            attempts: 0,
            history: []
        };

        // L0: Standard Playwright native execution (replaces L1/L2 since PW handles DOM waits)
        try {
            state.attempts++;
            const result = await resolveFn();
            if (result && result.success) {
                TelemetryCollector.recordRecovery(1, options);
                return new RecoveryOutcome({
                    status: 'RESOLVED',
                    result: result,
                    level: 'L0',
                    attempts: state.attempts,
                    duration: Date.now() - startTime,
                    history: state.history
                });
            }
        } catch (err) {
            if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L0 Error]', err.stack || err.message);
            if (this._isTerminalError(err)) return this._abortOutcome(state, startTime, 'L0', err);
            state.history.push({ level: 'L0', error: err.message, duration: Date.now() - startTime });
        }

        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L0');

        // L3: Skip for non-destructive
        if (this._isSkippable(interactionType)) {
            state.history.push({ level: 'L3', error: 'Skipped', duration: 0 });
            TelemetryCollector.recordRecovery(3, options);
            return new RecoveryOutcome({
                status: 'SKIPPED',
                result: null,
                level: 'L3',
                attempts: state.attempts,
                duration: Date.now() - startTime,
                history: state.history
            });
        }
        
        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L3');

        // L3.5: Semantic Fallback (budget: 500ms, capped by hardDeadline)
        const l35Deadline = Math.min(Date.now() + 500, hardDeadline);
        const l35Result = await this._executeL3_5(page, l35Deadline, state, options);
        if (l35Result.success) {
            TelemetryCollector.recordRecovery('3.5', options);
            return new RecoveryOutcome({
                status: 'RESOLVED',
                result: l35Result.result,
                level: 'L3.5',
                attempts: state.attempts,
                duration: Date.now() - startTime,
                history: state.history
            });
        }
        if (l35Result.terminalError) return this._abortOutcome(state, startTime, 'L3.5', l35Result.terminalError);
        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L3.5');

        // Exhausted
        const exhaustionError = new Error('[LF-505] Locator intelligence recovery exhausted all non-destructive strategies.');
        exhaustionError.name = 'UnrecoverableError';
        exhaustionError.code = 'LF-505';

        return this._abortOutcome(state, startTime, 'EXHAUSTED', exhaustionError, false);
    }

    _isTerminalError(err) {
        if (!err) return false;
        const code = String(err.code || '');
        const name = String(err.name || '');
        const msg = String(err.message || '');
        if (code.startsWith('LF-') && !['LF-501', 'LF-502', 'LF-503', 'LF-603'].includes(code)) {
            return true;
        }
        if (name === 'ConfidenceGateRejectionError' || name === 'ConfidenceBelowThresholdError' || name === 'GlobalTimeoutError' || name === 'QueueDeadlineExceededError' || name === 'ContractViolationError' || name === 'AmbiguousResolutionError' || name === 'VerificationMismatchError') {
            return true;
        }
        if (msg.includes('[LF-505]') || msg.includes('[LF-601]') || msg.includes('[LF-602]') || msg.includes('[LF-604]') || msg.includes('[LF-605]') || msg.includes('[LF-701]') || msg.includes('[LF-702]')) {
            return true;
        }
        return false;
    }

    _isSkippable(interactionType) {
        const type = (interactionType || '').toLowerCase();
        return ['hover', 'scroll'].includes(type);
    }

    async _executeL3_5(page, deadline, state, options = {}) {
        const levelStart = Date.now();
        const eid = options.originalEID || options.eid || options.identityDocument || null;
        const text = eid ? (eid.textContent || eid.ariaLabel || eid.placeholder || eid.dataTestId) : (options.semanticText || null);

        if (typeof options.semanticFallback === 'function') {
            state.attempts++;
            try {
                const res = await options.semanticFallback(text, page, options);
                if (res && res.success) return { success: true, result: res };
            } catch (err) {
                if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L3.5 Error]', err.stack || err.message);
                if (this._isTerminalError(err)) return { success: false, terminalError: err };
                state.history.push({ level: 'L3.5', error: err.message, duration: Date.now() - levelStart });
            }
        }

        if (page && text && Date.now() < deadline) {
            state.attempts++;
            try {
                let locator;
                if (typeof page.getByText === 'function') {
                    locator = page.getByText(text);
                } else if (typeof page.locator === 'function') {
                    locator = page.locator(`text="${text}"`);
                }
                if (locator) {
                    let isVisible = true;
                    if (typeof locator.isVisible === 'function') {
                        isVisible = await locator.isVisible();
                    }
                    if (isVisible) {
                        const { ResolutionResult } = await import('./ResolutionResult.mjs');
                        const candidate = { locator: `text="${text}"`, strategy: 'semantic-fallback', rank: 99 };
                        const winScore = 40.0;
                        const result = new ResolutionResult({
                            success: true,
                            playwrightLocator: locator,
                            locator: `text="${text}"`,
                            candidate,
                            strategy: 'semantic-fallback',
                            duration: Date.now() - levelStart,
                            resolutionCycles: 1,
                            winningCandidate: candidate,
                            winningStrategy: 'semantic-fallback',
                            winningScore: winScore,
                            similarity: 0.4,
                            totalCandidates: 1,
                            exhaustedCandidates: 0,
                            telemetry: []
                        });
                        
                        const memory = options.resolutionMemory || options.memory;
                        if (memory && typeof memory.remember === 'function' && eid && eid.identityHash && options.urlPathname) {
                            memory.remember(options.urlPathname, eid.identityHash, 'semantic-fallback', `text="${text}"`, winScore);
                        }
                        return { success: true, result };
                    }
                }
            } catch (err) {
                if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L3.5 Error]', err.stack || err.message);
                if (this._isTerminalError(err)) return { success: false, terminalError: err };
                state.history.push({ level: 'L3.5', error: err.message, duration: Date.now() - levelStart });
            }
        }

        return { success: false };
    }

}
