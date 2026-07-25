import { pageStateMonitor } from './PageStateMonitor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

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

    async orchestrate(resolveFn, interactionType, page) {
        const startTime = Date.now();
        const state = {
            attempts: 0,
            history: []
        };

        // L1: Fast Retry (budget: 500ms, retry interval: 50ms)
        const l1Result = await this._executeL1(resolveFn, startTime + 500, state);
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

        // L2: DOM Settlement (budget: 2000ms from start)
        const l2Result = await this._executeL2(resolveFn, page, startTime + 2500, state);
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

        // L4: Reload
        const l4Result = await this._executeL4(resolveFn, page, state);
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

        return new RecoveryOutcome({
            status: 'ABORTED',
            result: null,
            level: 'L4',
            attempts: state.attempts,
            duration: Date.now() - startTime,
            history: state.history
        });
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

    async _executeL4(resolveFn, page, state) {
        const levelStart = Date.now();
        try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
            await new Promise(r => setTimeout(r, 500)); // DOM settlement

            state.attempts++;
            const result = await resolveFn();
            if (result && result.success) {
                return { success: true, result };
            }
        } catch (err) {
            state.history.push({ level: 'L4', error: err.message, duration: Date.now() - levelStart });
        }
        return { success: false };
    }
}
