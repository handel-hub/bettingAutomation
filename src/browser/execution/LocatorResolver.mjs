import { logger } from '../../config.mjs';
import { LocatorResolutionError } from './errors.mjs';

export class ResolutionResult {
    constructor({ success, playwrightLocator, locator, candidate, strategy, duration, attempts, retries, failureReason }) {
        this.success = success;
        this.playwrightLocator = playwrightLocator; // Playwright Locator instance
        this.locator = locator; // String locator for logging
        this.candidate = candidate; // Candidate metadata
        this.strategy = strategy;
        this.duration = duration;
        this.attempts = attempts;
        this.retries = retries;
        this.failureReason = failureReason;
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
            return new ResolutionResult({ success: false, failureReason: 'Generation Failure: No candidates provided' });
        }
        
        let attempts = 0;
        let retries = 0;
        const neverAttachedCounts = new Map();
        const SKIP_THRESHOLD = 5;
        
        while ((Date.now() - startTime) < this.RETRY_POLICY.globalTimeoutMs && retries < this.RETRY_POLICY.maxAttempts) {
            
            for (const candidate of candidates) {
                const neverCount = neverAttachedCounts.get(candidate.locator) || 0;
                if (neverCount >= SKIP_THRESHOLD) continue;

                attempts++;
                try {
                    const locator = page.locator(candidate.locator);
                    
                    // 1. Attach Check (No explicit waitFor here to keep the loop fast)
                    const count = await locator.count();
                    if (count === 0) {
                        neverAttachedCounts.set(candidate.locator, neverCount + 1);
                        continue;
                    }
                    neverAttachedCounts.set(candidate.locator, 0);
                    
                    const target = locator.first();
                    
                    // 2. Visibility Check
                    const isVisible = await target.isVisible();
                    if (!isVisible) {
                        logger.debug(`[LocatorResolver] Attempt ${attempts}: [${candidate.strategy}] ${candidate.locator} | Attached: Yes | Visible: No`);
                        continue;
                    }

                    // 3. Actionability Check
                    const actionableInteractions = ['click', 'dblclick', 'drag start', 'input', 'keyboard', 'pointerdown'];
                    if (actionableInteractions.includes(interactionType)) {
                        const isEnabled = await target.isEnabled();
                        if (!isEnabled) {
                            logger.debug(`[LocatorResolver] Attempt ${attempts}: [${candidate.strategy}] ${candidate.locator} | Attached: Yes | Visible: Yes | Actionable: No`);
                            continue;
                        }
                    }

                    // 4. Interaction Validation & Selection
                    const duration = Date.now() - startTime;
                    logger.info(`[LocatorResolver] Resolved in ${duration}ms (Attempt ${attempts}, Retry ${retries}) using ${candidate.strategy}`);
                    
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
                    logger.debug(`[LocatorResolver] Error testing candidate ${candidate.locator}: ${err.message}`);
                    continue;
                }
            }

            // Sleep before retrying the pipeline
            retries++;
            await new Promise(r => setTimeout(r, this.RETRY_POLICY.retryIntervalMs));
        }
        
        const failureType = (retries >= this.RETRY_POLICY.maxAttempts) ? 'Max Attempts Reached' : 'Timeout';
        const failureReason = `Visibility/Actionability Failure: Exhausted candidates after ${failureType} (${Date.now() - startTime}ms)`;
        
        logger.warn(`[LocatorResolver] ${failureReason}`);
        
        return new ResolutionResult({
            success: false,
            duration: Date.now() - startTime,
            attempts,
            retries,
            failureReason
        });
    }

    static async execute(page, candidates, interactionType, actionFn) {
        const result = await this.resolve(page, candidates, interactionType);
        if (!result.success) {
            throw new LocatorResolutionError(result.failureReason, result);
        }
        
        // Execute physical action
        await actionFn(result.playwrightLocator);
        
        return result; // Allows ActionSimulator to access metadata for logging
    }
}
