import { pageStateMonitor } from './PageStateMonitor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';
import { TimeConstants } from '../../time/TimeConstants.mjs';

export class RecoveryOutcome {
    constructor({ status, result, level, attempts, duration, history }) {
        this.status = status;     // 'RESOLVED' | 'SKIPPED' | 'ABORTED'
        this.result = result;     // ResolutionResult | null
        this.level = level;       // 'L1' | 'L2' | 'L3' | 'L4'
        this.attempts = attempts; // Total attempts
        this.duration = duration; // Total time
        this.history = history;   // Array<{level, error, duration}>
    }
}

export class RecoveryOrchestrator {
    constructor() {
        this.pageStateMonitor = pageStateMonitor;
    }

    _abortOutcome(state, startTime, level) {
        return new RecoveryOutcome({
            status: 'ABORTED',
            result: null,
            level,
            attempts: state.attempts,
            duration: Date.now() - startTime,
            history: state.history
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
        if (Date.now() >= hardDeadline) return this._abortOutcome(state, startTime, 'L1');

        // L2: DOM Settlement (budget: 2000ms from start, capped by hardDeadline)
        const l2Deadline = Math.min(startTime + 2500, hardDeadline);
        const l2Result = await this._executeL2(resolveFn, page, l2Deadline, state);
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

        // L4: Reload
        const l4Result = await this._executeL4(resolveFn, page, state, hardDeadline);
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

        return this._abortOutcome(state, startTime, 'L4');
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
                state.history.push({ level: 'L1', error: err.message, duration: Date.now() - levelStart });
            }
            if (Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 50));
            }
        }
        return { success: false };
    }

    async _executeL2(resolveFn, page, deadline, state) {
        const levelStart = Date.now();
        while (Date.now() < deadline) {
            const stability = await this.pageStateMonitor.getStabilityState(page);
            
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

    async _executeL4(resolveFn, page, state, hardDeadline = Infinity) {
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
            state.history.push({ level: 'L4', error: err.message, duration: Date.now() - levelStart });
        }
        return { success: false };
    }
}
