import { logger } from '../../config.mjs';
import { 
    LocatorResolutionError,
    NotAttachedError,
    AmbiguousMatchError,
    HiddenError,
    DisabledError,
    SyntaxError
} from './errors.mjs';
import { DefaultPolicy } from './locatorIntelligence/resolution/ResolutionPolicy.mjs';
import { ResolutionContext, ResolutionState } from './locatorIntelligence/resolution/ResolutionContext.mjs';
import { getValidationProfile } from './locatorIntelligence/resolution/ValidationProfile.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';

export class ResolutionResult {
    constructor({ success, playwrightLocator, locator, candidate, strategy, duration, resolutionCycles, failureReason, winningCandidate, winningStrategy, winningScore, totalCandidates, exhaustedCandidates, telemetry }) {
        this.success = success;
        this.playwrightLocator = playwrightLocator; // Playwright Locator instance
        this.locator = locator; // String locator for logging
        this.candidate = candidate; // Candidate metadata
        this.strategy = strategy;
        
        this.duration = duration;
        this.resolutionCycles = resolutionCycles;
        this.failureReason = failureReason;
        
        this.winningCandidate = winningCandidate;
        this.winningStrategy = winningStrategy;
        this.winningScore = winningScore;
        this.totalCandidates = totalCandidates;
        this.exhaustedCandidates = exhaustedCandidates;
        this.telemetry = telemetry || []; // structured rejection telemetry (ResolutionContext[])
    }
}

export class LocatorResolver {
    /**
     * Resolves the safest actionable locator from a list of candidates using an Adaptive Decision Engine.
     */
    static async resolve(page, candidates, interactionType, policy = DefaultPolicy) {
        const startTime = Date.now();
        if (!candidates || candidates.length === 0) {
            return new ResolutionResult({ success: false, failureReason: '[LF-003] Generation Failure: No candidates provided' });
        }
        
        const profile = getValidationProfile(interactionType);
        const contexts = candidates.map(c => new ResolutionContext(c, policy));
        let resolutionCycles = 0;
        
        while ((Date.now() - startTime) < policy.limits.globalTimeoutMs) {
            resolutionCycles++;
            
            // Sort active candidates by current confidence (descending)
            const activeContexts = contexts
                .filter(ctx => ctx.isActive())
                .sort((a, b) => b.currentConfidence - a.currentConfidence);
                
            if (activeContexts.length === 0) {
                const duration = Date.now() - startTime;
                const failureReason = `[LF-505] All Candidates Exhausted (${duration}ms)\n${this._formatTelemetry(contexts, policy)}`;
                logger.warn(`[LocatorResolver] ${failureReason}`);
                const result = new ResolutionResult({ 
                    success: false, duration, resolutionCycles, failureReason, 
                    totalCandidates: candidates.length, exhaustedCandidates: contexts.length,
                    telemetry: policy.telemetry.debug ? contexts : contexts.map(c => ({ rank: c.candidate.rank, strategy: c.candidate.strategy, attempts: c.attempts, state: c.state, lastFailure: c.lastFailure })) 
                });
                TelemetryCollector.recordResolution(result);
                return result;
            }
            
            for (const ctx of activeContexts) {
                ctx.transitionTo(ResolutionState.VALIDATING);
                ctx.recordAttempt();
                
                try {
                    let locator;
                    try {
                        locator = page.locator(ctx.candidate.locator);
                    } catch (err) {
                        throw new SyntaxError(err.message);
                    }
                    
                    // 1. Attach Check
                    if (profile.includes('located')) {
                        const count = await locator.count();
                        if (count === 0) throw new NotAttachedError(`Count: 0`);
                        if (count > 1) {
                            logger.warn(`[LF-102] AmbiguousMatchError: Locator resolved to ${count} elements. Falling back to .first() | Strategy: ${ctx.candidate.strategy} | Locator: ${ctx.candidate.locator}`);
                        }
                        locator = locator.first();
                        ctx.transitionTo(ResolutionState.LOCATED);
                    } else {
                        locator = locator.first();
                    }
                    
                    // 2. Visibility Check
                    if (profile.includes('visible')) {
                        if (!(await locator.isVisible())) throw new HiddenError('Visible: No');
                        ctx.transitionTo(ResolutionState.VISIBLE);
                    }
                    
                    // 3. Actionability Check
                    if (profile.includes('enabled')) {
                        if (!(await locator.isEnabled())) throw new DisabledError('Enabled: No');
                        ctx.transitionTo(ResolutionState.ACTIONABLE);
                    }
                    
                    // Success
                    ctx.transitionTo(ResolutionState.RESOLVED);
                    const duration = Date.now() - startTime;
                    logger.info(`[LocatorResolver] Resolved in ${duration}ms (Cycle ${resolutionCycles}, Attempts ${ctx.attempts}) using [${ctx.candidate.strategy}] (Final Confidence: ${ctx.currentConfidence.toFixed(1)})`);
                    
                    const result = new ResolutionResult({
                        success: true,
                        playwrightLocator: locator,
                        locator: ctx.candidate.locator,
                        candidate: ctx.candidate,
                        strategy: ctx.candidate.strategy,
                        duration,
                        resolutionCycles,
                        winningCandidate: ctx.candidate,
                        winningStrategy: ctx.candidate.strategy,
                        winningScore: ctx.currentConfidence,
                        totalCandidates: candidates.length,
                        exhaustedCandidates: contexts.filter(c => c.state === ResolutionState.EXHAUSTED).length,
                        telemetry: policy.telemetry.debug ? contexts : contexts.map(c => ({ rank: c.candidate.rank, strategy: c.candidate.strategy, attempts: c.attempts, state: c.state, lastFailure: c.lastFailure }))
                    });
                    TelemetryCollector.recordResolution(result);
                    return result;
                    
                } catch (err) {
                    const isTerminal = !policy.retry.retryableFailures.includes(err.name);
                    if (isTerminal) {
                        logger.debug(`[LocatorResolver] Terminal error testing candidate ${ctx.candidate.locator}: ${err.message}`);
                    } else {
                        logger.debug(`[LocatorResolver] Cycle ${resolutionCycles} Attempt ${ctx.attempts}: [${ctx.candidate.strategy}] ${ctx.candidate.locator} | Error: ${err.message}`);
                    }
                    ctx.recordFailure(err, isTerminal);
                }
            }
            
            await new Promise(r => setTimeout(r, policy.limits.retryIntervalMs));
        }
        
        const duration = Date.now() - startTime;
        const failureReason = `[LF-504] Global Timeout (${duration}ms)\n${this._formatTelemetry(contexts, policy)}`;
        logger.warn(`[LocatorResolver] ${failureReason}`);
        const result = new ResolutionResult({ 
            success: false, duration, resolutionCycles, failureReason, 
            totalCandidates: candidates.length, exhaustedCandidates: contexts.filter(c => c.state === ResolutionState.EXHAUSTED).length,
            telemetry: policy.telemetry.debug ? contexts : contexts.map(c => ({ rank: c.candidate.rank, strategy: c.candidate.strategy, attempts: c.attempts, state: c.state, lastFailure: c.lastFailure }))
        });
        TelemetryCollector.recordResolution(result);
        return result;
    }
    
    static _formatTelemetry(contexts, policy) {
        let log = 'Candidates:';
        for (const ctx of contexts) {
            const code = ctx.lastFailure?.code || 'UNKNOWN';
            const name = ctx.lastFailure?.name || 'Error';
            const rank = ctx.candidate.rank ?? '?';
            
            const confEvo = ctx.confidenceEvolution.join(' -> ');
            const stateEvo = ctx.stateHistory.map(s => s.state).join(' -> ');
            
            const firstAttempt = ctx.firstAttemptAt ? ctx.firstAttemptAt : 'N/A';
            const timeInfo = ctx.firstAttemptAt && ctx.lastAttemptAt ? (ctx.lastAttemptAt - ctx.firstAttemptAt) : 0;
            
            log += `\n  - Rank ${rank} | Conf: ${confEvo} | Type: ${ctx.candidate.strategy} | States: ${stateEvo} | Attempts: ${ctx.attempts}/${ctx.retryBudget} | Active Time: ${timeInfo}ms | Last Failure: [${code}] ${name}`;
        }
        return log;
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
