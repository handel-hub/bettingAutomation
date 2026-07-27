import { pageStateMonitor } from './PageStateMonitor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { TimeConstants } from '../../time/TimeConstants.mjs';

export class RecoveryOutcome {
    constructor({ status, result, level, attempts, duration, history, terminalError = null, circuitBreakerTripped = false }) {
        this.status = status;     // 'RESOLVED' | 'SKIPPED' | 'ABORTED'
        this.result = result;     // ResolutionResult | null
        this.level = level;       // 'L1' | 'L2' | 'L3' | 'L3.5' | 'L4'
        this.attempts = attempts; // Total attempts
        this.duration = duration; // Total time
        this.history = history;   // Array<{level, error, duration}>
        this.terminalError = terminalError;
        this.circuitBreakerTripped = circuitBreakerTripped;
    }
}

export class RecoveryOrchestrator {
    constructor() {
        this.pageStateMonitor = pageStateMonitor;
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

        // L1: Fast Retry (budget: 500ms, capped by hardDeadline)
        const l1Deadline = Math.min(startTime + 500, hardDeadline);
        const l1Result = await this._executeL1(resolveFn, l1Deadline, state);
        if (l1Result.success) {
            TelemetryCollector.recordRecovery(1);
            return new RecoveryOutcome({
                status: 'RESOLVED',
                result: l1Result.result,
                level: 'L1',
                attempts: state.attempts,
                duration: Date.now() - startTime,
                history: state.history
            });
        }
        if (l1Result.terminalError) return this._abortOutcome(state, startTime, 'L1', l1Result.terminalError);
        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L1');

        // L2: DOM Settlement (budget: 2000ms from start, capped by hardDeadline)
        const l2Deadline = Math.min(startTime + 2500, hardDeadline);
        const scheduler = options.scheduler || options.executionScheduler;
        const browserId = options.browserId || (page && (page.id || page.browserId)) || null;
        if (scheduler && typeof scheduler.setBackpressure === 'function') {
            scheduler.setBackpressure(browserId || 'global', true);
        } else if (scheduler && 'backpressureActive' in scheduler) {
            scheduler.backpressureActive = true;
        }

        let l2Result;
        try {
            l2Result = await this._executeL2(resolveFn, page, l2Deadline, state, options);
        } finally {
            if (scheduler && typeof scheduler.setBackpressure === 'function') {
                scheduler.setBackpressure(browserId || 'global', false);
            } else if (scheduler && 'backpressureActive' in scheduler) {
                scheduler.backpressureActive = false;
            }
        }

        if (l2Result.success) {
            TelemetryCollector.recordRecovery(2);
            return new RecoveryOutcome({
                status: 'RESOLVED',
                result: l2Result.result,
                level: 'L2',
                attempts: state.attempts,
                duration: Date.now() - startTime,
                history: state.history
            });
        }
        if (l2Result.terminalError) return this._abortOutcome(state, startTime, 'L2', l2Result.terminalError);
        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L2');

        // L3: Skip
        if (this._isSkippable(interactionType)) {
            state.history.push({ level: 'L3', error: 'Skipped', duration: 0 });
            TelemetryCollector.recordRecovery(3);
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
            TelemetryCollector.recordRecovery('3.5');
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

        // L4: Reload
        const l4Result = await this._executeL4(resolveFn, page, state, hardDeadline, options);
        if (l4Result.success) {
            TelemetryCollector.recordRecovery(4);
            return new RecoveryOutcome({
                status: 'RESOLVED',
                result: l4Result.result,
                level: 'L4',
                attempts: state.attempts,
                duration: Date.now() - startTime,
                history: state.history
            });
        }
        if (l4Result.terminalError) return this._abortOutcome(state, startTime, 'L4', l4Result.terminalError, l4Result.circuitBreakerTripped);

        return this._abortOutcome(state, startTime, 'L4', null, l4Result.circuitBreakerTripped);
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

    async _executeL1(resolveFn, deadline, state) {
        const levelStart = Date.now();
        while (Date.now() < deadline) {
            state.attempts++;
            try {
                const result = await resolveFn();
                if (result && result.success) {
                    return { success: true, result };
                }
            } catch (err) {
                if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L1 Error]', err.stack || err.message);
                if (this._isTerminalError(err)) return { success: false, terminalError: err };
                state.history.push({ level: 'L1', error: err.message, duration: Date.now() - levelStart });
            }
            if (Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 50));
            }
        }
        return { success: false };
    }

    async _executeL2(resolveFn, page, deadline, state, options = {}) {
        const levelStart = Date.now();
        while (Date.now() < deadline) {
            const stability = await this.pageStateMonitor.getStabilityState(page);
            TelemetryCollector.recordLifecycleEvent({
                traceId: options.traceId || 'tr-unknown',
                spanId: 'sp-12-' + (options.browserId || 'unknown').slice(0, 4),
                parentSpanId: 'sp-11-' + (options.browserId || 'unknown').slice(0, 4),
                stageSequence: 12,
                stageName: 'SLAVE_DOM_MUTATION_WAIT',
                component: 'RecoveryOrchestrator.mjs',
                method: '_executeL2',
                timestamp: Date.now(),
                browserId: options.browserId || 'slave',
                interactionId: options.interactionId || 'ia-unknown',
                interactionType: options.interactionType || 'CLICK',
                validationResult: stability === 'STABLE' ? 'PASS' : 'WARN_DOM_MUTATING',
                errorDetails: stability === 'STABLE' ? null : { errorCode: 'WARN_DOM_MUTATING', errorMessage: `DOM state is ${stability}` }
            });
            
            if (stability === 'RENDERING') {
                await new Promise(r => setTimeout(r, 200));
            } else if (stability === 'NAVIGATING') {
                // Wait briefly for navigation, but don't block indefinitely
                await new Promise(r => setTimeout(r, 500));
            }
            
            // For STABLE or UNKNOWN or after waiting for RENDERING, attempt resolution
            state.attempts++;
            try {
                const result = await resolveFn();
                if (result && result.success) {
                    return { success: true, result };
                }
            } catch (err) {
                if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L2 Error]', err.stack || err.message);
                if (this._isTerminalError(err)) return { success: false, terminalError: err };
                state.history.push({ level: 'L2', error: err.message, duration: Date.now() - levelStart });
                if (stability === 'STABLE') {
                    // If stable and failed, don't loop endlessly in L2, just break
                    break;
                }
            }
            
            // Small delay to prevent tight loop if not rendering
            if (Date.now() < deadline && stability !== 'RENDERING' && stability !== 'NAVIGATING') {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        return { success: false };
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

    async _executeL4(resolveFn, page, state, hardDeadline = Infinity, options = {}) {
        const levelStart = Date.now();
        try {
            const remainingMs = Math.max(100, hardDeadline - Date.now());
            await page.reload({ waitUntil: 'domcontentloaded', timeout: remainingMs });
            await new Promise(r => setTimeout(r, Math.min(500, Math.max(50, hardDeadline - Date.now())))); // DOM settlement

            if (Date.now() < hardDeadline) {
                state.attempts++;
                const result = await resolveFn();
                if (result && result.success) {
                    return { success: true, result };
                }
            }
        } catch (err) {
            if (typeof console !== 'undefined' && process.env.DEBUG_RECOVERY) console.warn('[Recovery L4 Error]', err.stack || err.message);
            if (this._isTerminalError(err)) return { success: false, terminalError: err };
            state.history.push({ level: 'L4', error: err.message, duration: Date.now() - levelStart });
        }
        if (options.healthMonitor && typeof options.healthMonitor.recordRecoveryFailure === 'function' && options.browserId) {
            options.healthMonitor.recordRecoveryFailure(options.browserId);
        } else if (options.circuitBreaker && typeof options.circuitBreaker.recordFailure === 'function') {
            options.circuitBreaker.recordFailure();
        }
        const circuitBreakerTripped = (options.healthMonitor?.getCircuitBreaker?.(options.browserId)?.isTripped() || options.circuitBreaker?.isTripped() || false);
        return { success: false, circuitBreakerTripped };
    }
}
