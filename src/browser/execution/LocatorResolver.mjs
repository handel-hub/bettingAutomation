import { logger } from '../../config.mjs';
import { 
    LocatorResolutionError,
    NotAttachedError,
    AmbiguousMatchError,
    HiddenError,
    DisabledError,
    SyntaxError
} from './errors.mjs';

export class ResolutionResult {
    constructor({ success, playwrightLocator, locator, candidate, strategy, duration, attempts, retries, failureReason, candidateFailures }) {
        this.success = success;
        this.playwrightLocator = playwrightLocator; // Playwright Locator instance
        this.locator = locator; // String locator for logging
        this.candidate = candidate; // Candidate metadata
        this.strategy = strategy;
        this.duration = duration;
        this.attempts = attempts;
        this.retries = retries;
        this.failureReason = failureReason;
        this.candidateFailures = candidateFailures || []; // structured rejection telemetry
    }
}

export class LocatorResolver {
    static RETRY_POLICY = {
        globalTimeoutMs: 2500,
        retryIntervalMs: 50,
        maxAttempts: 50
    };

    /**
     * Resolves the safest actionable locator from a list of candidates using a Global Retry Loop.
     */
    static async resolve(page, candidates, interactionType) {
        const startTime = Date.now();
        if (!candidates || candidates.length === 0) {
            return new ResolutionResult({ success: false, failureReason: '[LF-003] Generation Failure: No candidates provided' });
        }
        
        let attempts = 0;
        let retries = 0;
        const neverAttachedCounts = new Map();
        const SKIP_THRESHOLD = 5;
        let candidateFailures = [];
        
        while ((Date.now() - startTime) < this.RETRY_POLICY.globalTimeoutMs && retries < this.RETRY_POLICY.maxAttempts) {
            candidateFailures = []; // Reset candidate failure log for each full loop iteration
            
            for (const candidate of candidates) {
                const neverCount = neverAttachedCounts.get(candidate.locator) || 0;
                if (neverCount >= SKIP_THRESHOLD) {
                    candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: new NotAttachedError('Pruned (never attached)') });
                    continue;
                }

                attempts++;
                let locator;
                try {
                    locator = page.locator(candidate.locator);
                } catch (err) {
                    // Playwright Syntax Error
                    logger.debug(`[LocatorResolver] Syntax error testing candidate ${candidate.locator}: ${err.message}`);
                    candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: new SyntaxError(err.message) });
                    continue;
                }
                    
                try {
                    // 1. Attach Check
                    const count = await locator.count();
                    if (count === 0) {
                        neverAttachedCounts.set(candidate.locator, neverCount + 1);
                        candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: new NotAttachedError(`Count: 0`) });
                        continue;
                    }
                    neverAttachedCounts.set(candidate.locator, 0);

                    // Ambiguity Guard (LF-102)
                    if (count > 1) {
                        logger.warn(`[LF-102] AmbiguousMatchError: Locator resolved to ${count} elements. Falling back to .first() | Strategy: ${candidate.strategy} | Locator: ${candidate.locator}`);
                    }
                    
                    const target = locator.first();
                    
                    // 2. Visibility Check
                    const isVisible = await target.isVisible();
                    if (!isVisible) {
                        logger.debug(`[LocatorResolver] Attempt ${attempts}: [${candidate.strategy}] ${candidate.locator} | Attached: Yes | Visible: No`);
                        candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: new HiddenError('Visible: No') });
                        continue;
                    }

                    // 3. Actionability Check
                    const actionableInteractions = ['click', 'dblclick', 'drag start', 'input', 'keyboard', 'pointerdown'];
                    if (actionableInteractions.includes(interactionType)) {
                        const isEnabled = await target.isEnabled();
                        if (!isEnabled) {
                            logger.debug(`[LocatorResolver] Attempt ${attempts}: [${candidate.strategy}] ${candidate.locator} | Attached: Yes | Visible: Yes | Actionable: No`);
                            candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: new DisabledError('Enabled: No') });
                            continue;
                        }
                    }

                    // 4. Interaction Validation & Selection
                    const duration = Date.now() - startTime;
                    // Log resolution specifically (separated from execution)
                    logger.info(`[LocatorResolver] Resolved in ${duration}ms (Attempt ${attempts}, Retry ${retries}) using [${candidate.strategy}] (Confidence: ${candidate.rankingScore})`);
                    
                    return new ResolutionResult({
                        success: true,
                        playwrightLocator: target,
                        locator: candidate.locator,
                        candidate: candidate,
                        strategy: candidate.strategy,
                        duration,
                        attempts,
                        retries
                    });

                } catch (err) {
                    logger.debug(`[LocatorResolver] Unexpected error testing candidate ${candidate.locator}: ${err.message}`);
                    candidateFailures.push({ rank: candidate.rank, confidence: candidate.rankingScore, strategy: candidate.strategy, failure: err });
                    continue;
                }
            }

            // Sleep before retrying the pipeline
            retries++;
            await new Promise(r => setTimeout(r, this.RETRY_POLICY.retryIntervalMs));
        }
        
        const failureCode = (retries >= this.RETRY_POLICY.maxAttempts) ? '[LF-505] Max Attempts Reached' : '[LF-504] Global Timeout';
        let failureReason = `${failureCode} (${Date.now() - startTime}ms)\nCandidates:`;
        
        for (const cf of candidateFailures) {
            const code = cf.failure.code || 'UNKNOWN';
            const name = cf.failure.name || 'Error';
            failureReason += `\n  - Rank ${cf.rank || '?'} | Confidence: ${cf.confidence || '?'}% | Type: ${cf.strategy} | Failure: [${code}] ${name}`;
        }
        
        logger.warn(`[LocatorResolver] ${failureReason}`);
        
        return new ResolutionResult({
            success: false,
            duration: Date.now() - startTime,
            attempts,
            retries,
            failureReason,
            candidateFailures
        });
    }

    // Deprecated Wrapper: Preserved for backward compatibility
    static async execute(page, candidates, interactionType, actionFn) {
        const result = await this.resolve(page, candidates, interactionType);
        if (!result.success) {
            throw new LocatorResolutionError(result.failureReason, result);
        }
        
        // Execute physical action (Conflates resolution + execution, will be removed later)
        await actionFn(result.playwrightLocator);
        
        return result; 
    }
}
