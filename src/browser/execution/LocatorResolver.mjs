import { logger } from '../../config.mjs';
import { 
    GlobalTimeoutError,
    QueueDeadlineExceededError
} from './errors.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';

export class ResolutionResult {
    constructor({ success, playwrightLocator, locator, failureReason }) {
        this.success = success;
        this.playwrightLocator = playwrightLocator;
        this.locator = locator;
        this.failureReason = failureReason;
    }
}

export class LocatorResolver {
    static async resolve(page, candidates, interactionType, policy, options = {}) {
        const cmdId = options.commandId || 'unknown';
        const resStart = Date.now();
        const eid = options.identityDocument;

        if (!options.disableMemoization && options.executionContext && options.executionContext.memoizedResolution) {
            const context = options.executionContext;
            const currentMsn = (options.sequenceGate && options.browserId) ? (context.command?.metadata?.msn || 0) : 0;
            const memo = context.memoizedResolution;
            if (memo.commandId === cmdId && memo.msn === currentMsn) {
                logger.info(`[LocatorResolver] [Cmd: ${cmdId}] Lifecycle memoization hit for command ${cmdId}`);
                return memo.resolutionOutcome;
            }
        }

        let loc = null;
        let selectorStr = '';
        
        try {
            if (eid) {
                // EID now only has { tag, role, text }
                if (eid.role && eid.text) {
                    loc = page.getByRole(eid.role, { name: eid.text, exact: false });
                    selectorStr = `getByRole('${eid.role}', { name: '${eid.text}' })`;
                } else if (eid.text) {
                    loc = page.getByText(eid.text, { exact: false });
                    selectorStr = `getByText('${eid.text}')`;
                } else if (eid.tag) {
                    loc = page.locator(eid.tag);
                    selectorStr = eid.tag;
                }
            }

            if (!loc && options.playwrightSelector) {
                loc = page.locator(options.playwrightSelector);
                selectorStr = options.playwrightSelector;
            }

            if (!loc) {
                throw new Error('[LF-003] Generation Failure: No fallback metadata available');
            }

            // Quick strict check, assuming auto-wait will handle visibility inside ActionSimulator actionFn
            await loc.first().waitFor({ state: 'attached', timeout: 500 }).catch((err) => {
                logger.warn(`[LocatorResolver] [Cmd: ${cmdId}] Strict check warning: ${err.message}`);
            });

            const result = new ResolutionResult({
                success: true,
                playwrightLocator: loc.first(), // Ensure strict mode resolution during action phase works safely
                locator: selectorStr
            });

            if (!options.disableMemoization && options.executionContext) {
                options.executionContext.memoizedResolution = {
                    commandId: cmdId,
                    msn: (options.sequenceGate && options.browserId) ? (options.executionContext.command?.metadata?.msn || 0) : 0,
                    resolutionOutcome: result,
                    timestamp: Date.now()
                };
            }

            return result;
        } catch (err) {
            logger.warn(`[LocatorResolver] [Cmd: ${cmdId}] Resolution failed: ${err.message}`);
            return new ResolutionResult({ success: false, failureReason: err.message });
        }
    }
}
