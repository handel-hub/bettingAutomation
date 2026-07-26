import { logger } from '../../config.mjs';
import { 
    LocatorResolutionError,
    NotAttachedError,
    AmbiguousMatchError,
    HiddenError,
    DisabledError,
    SyntaxError,
    StaleEpochError,
    ConfidenceGateRejectionError,
    GlobalTimeoutError,
    QueueDeadlineExceededError,
    ContractViolationError,
    MaxAttemptsReachedError,
    RecoveryExhaustedError,
    AmbiguousResolutionError,
    VerificationMismatchError
} from './errors.mjs';
import { DefaultPolicy } from './locatorIntelligence/resolution/ResolutionPolicy.mjs';
import { ResolutionContext, ResolutionState } from './locatorIntelligence/resolution/ResolutionContext.mjs';
import { getValidationProfile } from './locatorIntelligence/resolution/ValidationProfile.mjs';
import { TelemetryCollector } from './locatorIntelligence/telemetry/TelemetryCollector.mjs';
import { DeadlineBudget } from './time/DeadlineBudget.mjs';
import { TimeConstants } from './time/TimeConstants.mjs';
import featureFlags from './locatorIntelligence/FeatureFlags.mjs';
import { BatchResolver } from './locatorIntelligence/resolution/BatchResolver.mjs';
import { DisambiguationEngine } from './locatorIntelligence/resolution/DisambiguationEngine.mjs';
import { VerificationEngine } from './locatorIntelligence/resolution/VerificationEngine.mjs';
import { ConfidenceGate } from './locatorIntelligence/resolution/ConfidenceGate.mjs';
import { resolutionMemory } from './locatorIntelligence/memory/ResolutionMemory.mjs';
import { strategySuccessTracker } from './locatorIntelligence/memory/StrategySuccessTracker.mjs';

export class ResolutionResult {
    constructor({ success, playwrightLocator, locator, candidate, strategy, duration, resolutionCycles, failureReason, winningCandidate, winningStrategy, winningScore, similarity, totalCandidates, exhaustedCandidates, telemetry }) {
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
        this.similarity = similarity || null;
        this.totalCandidates = totalCandidates;
        this.exhaustedCandidates = exhaustedCandidates;
        this.telemetry = telemetry || []; // structured rejection telemetry (ResolutionContext[])
    }
}

export class LocatorResolver {
    /**
     * Resolves the safest actionable locator from a list of candidates using an Adaptive Decision Engine.
     */
    static async resolve(page, candidates, interactionType, policy = DefaultPolicy, options = {}) {
        const startTime = Date.now();
        if (!candidates || candidates.length === 0) {
            return new ResolutionResult({ success: false, failureReason: '[LF-003] Generation Failure: No candidates provided' });
        }

        const deadlineBudget = options.deadlineBudget || null;
        if (deadlineBudget) {
            deadlineBudget.checkOrThrow('LocatorResolver');
        }

        // Task 3.1: Ingress Contract Fast-Fail Boundary (< 15ms)
        if (options.enforceEID === true || (featureFlags.isEnabled('V3_SCHEMA_ENFORCEMENT_MODE') && featureFlags.get('V3_SCHEMA_ENFORCEMENT_MODE') === 'STRICT')) {
            if (!options.identityDocument || !options.identityDocument.identityHash) {
                throw new ContractViolationError("[LF-701] Fast-Fail: Missing required EID in STRICT schema enforcement mode");
            }
        }

        // Phase 14: URL Mismatch Abort
        const originalEID = options.identityDocument || null;
        if (originalEID && originalEID.url) {
            try {
                const masterPath = new URL(originalEID.url).pathname;
                const slavePath = new URL(page.url()).pathname;
                if (masterPath && slavePath && masterPath !== slavePath) {
                    return new ResolutionResult({ 
                        success: false, 
                        failureReason: `[LF-605] URL Mismatch Abort: Master path (${masterPath}) != Slave path (${slavePath})` 
                    });
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }

        if (featureFlags.isEnabled('LI_EPOCH_GATING') && options.epochGate && options.browserId && options.commandEpoch !== undefined && options.commandEpoch !== null && options.commandEpoch !== 0) {
            const timeoutMs = policy.limits?.epochWaitTimeoutMs || 2000;
            const decisionObj = await options.epochGate.evaluateAsync(options.browserId, options.commandEpoch, timeoutMs);
            if (decisionObj.decision === 'SKIP') {
                TelemetryCollector.recordEpochSkip();
                const duration = Date.now() - startTime;
                const failureReason = `[LF-604] StaleEpochError: ${decisionObj.reason}`;
                logger.warn(`[LocatorResolver] ${failureReason}`);
                const result = new ResolutionResult({
                    success: false, duration, resolutionCycles: 0, failureReason,
                    totalCandidates: candidates.length, exhaustedCandidates: 0,
                    telemetry: []
                });
                TelemetryCollector.recordResolution(result);
                return result;
            }
        }

        const profile = getValidationProfile(interactionType);
        const verificationEngine = new VerificationEngine(policy.verification || {});
        const disambiguationEngine = new DisambiguationEngine(policy.disambiguation || {});
        const confidenceGate = new ConfidenceGate(policy.confidenceGate || {});

        
        const contexts = candidates.map(c => new ResolutionContext(c, policy));
        let resolutionCycles = 0;

        const resolveAttempt = async () => {
            if (deadlineBudget) {
                deadlineBudget.checkOrThrow('LocatorResolver');
            }
            resolutionCycles++;
            
            let urlPathname = '';
            try { urlPathname = new URL(page.url()).pathname; } catch (e) {}

            let candidatesToEvaluate = [...candidates];
            let cacheHit = null;

            if (featureFlags.isEnabled('LI_RESOLUTION_MEMORY') && originalEID && originalEID.identityHash && urlPathname) {
                cacheHit = resolutionMemory.recall(urlPathname, originalEID.identityHash);
                if (cacheHit) {
                    logger.info(`[LocatorResolver] ResolutionMemory hit for ${originalEID.identityHash} [${cacheHit.strategyName}]`);
                    candidatesToEvaluate = [
                        {
                            locator: cacheHit.locator,
                            strategy: cacheHit.strategyName,
                            rank: 0,
                            ranking: { finalScore: cacheHit.confidence },
                            isFromMemory: true
                        },
                        ...candidatesToEvaluate
                    ];
                }
            }
            
            if (featureFlags.isEnabled('LI_BATCH_RESOLVER')) {
            const batchResult = await BatchResolver.resolve(page, candidatesToEvaluate, profile, { 
                shadowPath: options.shadowPath || [],
                epochGate: options.epochGate,
                browserId: options.browserId,
                commandEpoch: options.commandEpoch
            });
            if (batchResult.success) {
                const categorized = BatchResolver.categorize(batchResult, candidatesToEvaluate);

                const uniqueSorted = [...categorized.unique].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
                for (const item of uniqueSorted) {
                    if (profile.includes('visible') && item.visible === false) continue;
                    if (profile.includes('enabled') && item.enabled === false) continue;

                    let similarity = null;
                    if (featureFlags.isEnabled('LI_VERIFICATION')) {
                        const verifyResult = await verificationEngine.verify(page, item.locator, originalEID);
                        if (!verifyResult.verified) {
                            logger.warn(`[LocatorResolver] Verification failed for [${item.locator}]: ${verifyResult.reason}`);
                            if (item.candidate && item.candidate.isFromMemory && urlPathname && originalEID) {
                                logger.info(`[LocatorResolver] Evicting stale cache entry for ${originalEID.identityHash}`);
                                resolutionMemory.evict(urlPathname, originalEID.identityHash);
                            }
                            continue;
                        }
                        similarity = verifyResult.similarity;
                    }

                    let locator;
                    try {
                        locator = page.locator(item.locator).first();
                    } catch (e) {
                        continue;
                    }

                    const duration = Date.now() - startTime;
                    const winningCandidate = item.candidate;
                    const winningStrategy = item.strategy;
                    let winningScore = winningCandidate?.ranking?.finalScore || 0;
                    
                    if (item.candidate && item.candidate.isFromMemory) {
                        winningScore = Math.min(1.0, winningScore + 0.15); // +0.15 boost
                    }

                    if (featureFlags.isEnabled('LI_CONFIDENCE_GATE') && originalEID) {
                        const confToEval = similarity !== null ? similarity : winningScore;
                        const gateDecision = confidenceGate.evaluate(confToEval, interactionType);
                        TelemetryCollector.recordConfidenceGateDecision(gateDecision);
                        if (gateDecision.decision === 'REJECT') {
                            logger.warn(`[LocatorResolver] ConfidenceGate rejected [${item.locator}]: ${gateDecision.reason}`);
                            throw new ConfidenceGateRejectionError(gateDecision.reason);
                        }
                        if (gateDecision.decision === 'TENTATIVE') {
                            logger.warn(`[LocatorResolver] ConfidenceGate TENTATIVE for [${item.locator}]: ${gateDecision.reason}`);
                        }
                    }

                    logger.info(`[LocatorResolver] Batch resolved in ${duration}ms using [${winningStrategy}]`);
                    
                    if (featureFlags.isEnabled('LI_RESOLUTION_MEMORY') && originalEID && originalEID.identityHash && urlPathname) {
                        resolutionMemory.remember(urlPathname, originalEID.identityHash, winningStrategy, item.locator, winningScore);
                        strategySuccessTracker.recordOutcome(winningStrategy, new URL(page.url()).hostname, true);
                    }

                    const result = new ResolutionResult({
                        success: true,
                        playwrightLocator: locator,
                        locator: item.locator,
                        candidate: winningCandidate,
                        strategy: winningStrategy,
                        duration,
                        resolutionCycles: 1,
                        winningCandidate,
                        winningStrategy,
                        winningScore,
                        similarity,
                        totalCandidates: candidates.length,
                        exhaustedCandidates: 0,
                        telemetry: []
                    });
                    TelemetryCollector.recordResolution(result);
                    return result;
                }

                const ambiguousSorted = [...categorized.ambiguous].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
                for (const item of ambiguousSorted) {
                    if (featureFlags.isEnabled('LI_DISAMBIGUATION')) {
                        const disambigResult = await disambiguationEngine.disambiguate(page, item.locator, item.count, originalEID);
                        if (disambigResult.resolved) {
                            let locator;
                            try {
                                locator = page.locator(item.locator).nth(disambigResult.elementIndex);
                            } catch (e) {
                                continue;
                            }

                            const duration = Date.now() - startTime;
                            const winningCandidate = item.candidate;
                            const winningStrategy = item.strategy;
                            const winningScore = winningCandidate?.ranking?.finalScore || 0;
                            const similarity = disambigResult.score;

                            if (featureFlags.isEnabled('LI_CONFIDENCE_GATE') && originalEID) {
                                const confToEval = similarity !== null ? similarity : winningScore;
                                const gateDecision = confidenceGate.evaluate(confToEval, interactionType);
                                TelemetryCollector.recordConfidenceGateDecision(gateDecision);
                                if (gateDecision.decision === 'REJECT') {
                                    logger.warn(`[LocatorResolver] ConfidenceGate rejected [${item.locator}]: ${gateDecision.reason}`);
                                    throw new ConfidenceGateRejectionError(gateDecision.reason);
                                }
                                if (gateDecision.decision === 'TENTATIVE') {
                                    logger.warn(`[LocatorResolver] ConfidenceGate TENTATIVE for [${item.locator}]: ${gateDecision.reason}`);
                                }
                            }

                            logger.info(`[LocatorResolver] Disambiguated in ${duration}ms using [${winningStrategy}] (index ${disambigResult.elementIndex})`);
                            const result = new ResolutionResult({
                                success: true,
                                playwrightLocator: locator,
                                locator: item.locator,
                                candidate: winningCandidate,
                                strategy: winningStrategy,
                                duration,
                                resolutionCycles: 1,
                                winningCandidate,
                                winningStrategy,
                                winningScore,
                                similarity,
                                totalCandidates: candidates.length,
                                exhaustedCandidates: 0,
                                telemetry: []
                            });
                            TelemetryCollector.recordResolution(result);
                            return result;
                        } else {
                            logger.warn(`[LocatorResolver] Disambiguation failed for [${item.locator}]: ${disambigResult.error}`);
                            continue;
                        }
                    } else {
                        continue; // Skip ambiguous candidates entirely (no .first() fallback!)
                    }
                }

                const duration = Date.now() - startTime;
                const failureReason = `[LF-505] All Candidates Exhausted in Batch Resolution (${duration}ms)`;
                logger.warn(`[LocatorResolver] ${failureReason}`);
                throw new Error(failureReason);
            }
        }

            // Sequential Pass
            resolutionCycles++;
            
            // Sort active candidates by current confidence (descending)
            const activeContexts = contexts
                .filter(ctx => ctx.isActive())
                .sort((a, b) => b.currentConfidence - a.currentConfidence);
                
            if (activeContexts.length === 0) {
                const duration = Date.now() - startTime;
                const failureReason = `[LF-505] All Candidates Exhausted (${duration}ms)\n${this._formatTelemetry(contexts, policy)}`;
                logger.warn(`[LocatorResolver] ${failureReason}`);
                throw new Error("All Candidates Exhausted");
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
                            if (featureFlags.isEnabled('LI_DISAMBIGUATION')) {
                                const disambigResult = await disambiguationEngine.disambiguate(page, ctx.candidate.locator, count, originalEID);
                                if (disambigResult.resolved) {
                                    locator = locator.nth(disambigResult.elementIndex);
                                    ctx.similarity = disambigResult.score;
                                } else {
                                    throw new AmbiguousMatchError(disambigResult.error);
                                }
                            } else {
                                logger.warn(`[LF-102] AmbiguousMatchError: Locator resolved to ${count} elements. Falling back to .first() | Strategy: ${ctx.candidate.strategy} | Locator: ${ctx.candidate.locator}`);
                                locator = locator.first();
                            }
                        } else {
                            if (featureFlags.isEnabled('LI_VERIFICATION')) {
                                const verifyResult = await verificationEngine.verify(page, ctx.candidate.locator, originalEID);
                                if (!verifyResult.verified) {
                                    throw new NotAttachedError(`Verification failed: ${verifyResult.reason}`);
                                }
                                ctx.similarity = verifyResult.similarity;
                            }
                            locator = locator.first();
                        }
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
                    
                    if (featureFlags.isEnabled('LI_CONFIDENCE_GATE') && originalEID) {
                        const confToEval = ctx.similarity !== null ? ctx.similarity : ctx.currentConfidence;
                        const gateDecision = confidenceGate.evaluate(confToEval, interactionType);
                        TelemetryCollector.recordConfidenceGateDecision(gateDecision);
                        if (gateDecision.decision === 'REJECT') {
                            logger.warn(`[LocatorResolver] ConfidenceGate rejected [${ctx.candidate.locator}]: ${gateDecision.reason}`);
                            throw new ConfidenceGateRejectionError(gateDecision.reason);
                        }
                        if (gateDecision.decision === 'TENTATIVE') {
                            logger.warn(`[LocatorResolver] ConfidenceGate TENTATIVE for [${ctx.candidate.locator}]: ${gateDecision.reason}`);
                        }
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
                        similarity: ctx.similarity || null,
                        totalCandidates: candidates.length,
                        exhaustedCandidates: contexts.filter(c => c.state === ResolutionState.EXHAUSTED).length,
                        telemetry: policy.telemetry.debug ? contexts : contexts.map(c => ({ rank: c.candidate.rank, strategy: c.candidate.strategy, attempts: c.attempts, state: c.state, lastFailure: c.lastFailure }))
                    });
                    TelemetryCollector.recordResolution(result);
                    return result;
                    
                } catch (err) {
                    if (err instanceof ConfidenceGateRejectionError || err.name === 'ConfidenceBelowThresholdError' || err.code === 'LF-602' || err instanceof GlobalTimeoutError || err instanceof QueueDeadlineExceededError || err.code === 'LF-504' || err.code === 'LF-702' || err instanceof ContractViolationError || err.code === 'LF-701' || err instanceof MaxAttemptsReachedError || err.code === 'LF-505' || err instanceof RecoveryExhaustedError || err.code === 'LF-605' || err instanceof AmbiguousResolutionError || err.code === 'LF-603' || err instanceof VerificationMismatchError || err.code === 'LF-601') {
                        throw err;
                    }
                    const isTerminal = !policy.retry.retryableFailures.includes(err.name);
                    if (isTerminal) {
                        logger.debug(`[LocatorResolver] Terminal error testing candidate ${ctx.candidate.locator}: ${err.message}`);
                    } else {
                        logger.debug(`[LocatorResolver] Cycle ${resolutionCycles} Attempt ${ctx.attempts}: [${ctx.candidate.strategy}] ${ctx.candidate.locator} | Error: ${err.message}`);
                    }
                    ctx.recordFailure(err, isTerminal);
                }
            }
            
            throw new Error("Resolution pass failed (no candidate succeeded)");
        };
        
        if (featureFlags.isEnabled('LI_RECOVERY_HIERARCHY')) {
            const { RecoveryOrchestrator } = await import('./locatorIntelligence/resolution/RecoveryOrchestrator.mjs');
            const orchestrator = new RecoveryOrchestrator();
            const outcome = await orchestrator.orchestrate(resolveAttempt, interactionType, page, options);
            
            if (outcome.status === 'RESOLVED') {
                return outcome.result;
            }
            
            const duration = outcome.duration;
            const failureReason = outcome.status === 'SKIPPED' 
                ? `[LF-605] Resolution Skipped for ${interactionType}`
                : `[LF-505] Resolution Aborted at ${outcome.level} after ${outcome.attempts} attempts (${duration}ms)\n${this._formatTelemetry(contexts, policy)}`;
                
            logger.warn(`[LocatorResolver] ${failureReason}`);
            const result = new ResolutionResult({
                success: false, duration, resolutionCycles, failureReason,
                totalCandidates: candidates.length, exhaustedCandidates: contexts.filter(c => c.state === ResolutionState.EXHAUSTED).length,
                telemetry: policy.telemetry.debug ? contexts : contexts.map(c => ({ rank: c.candidate.rank, strategy: c.candidate.strategy, attempts: c.attempts, state: c.state, lastFailure: c.lastFailure }))
            });
            TelemetryCollector.recordResolution(result);
            return result;
        } else {
            // Legacy Flat Retry Loop
            while ((Date.now() - startTime) < policy.limits.globalTimeoutMs) {
                if (deadlineBudget) {
                    deadlineBudget.checkOrThrow('LocatorResolver');
                }
                try {
                    const result = await resolveAttempt();
                    if (result && result.success) return result;
                } catch (err) {
                    if (err instanceof ConfidenceGateRejectionError || err.name === 'ConfidenceBelowThresholdError' || err.code === 'LF-602' || err instanceof GlobalTimeoutError || err instanceof QueueDeadlineExceededError || err.code === 'LF-504' || err.code === 'LF-702' || err instanceof ContractViolationError || err.code === 'LF-701' || err instanceof MaxAttemptsReachedError || err.code === 'LF-505' || err instanceof RecoveryExhaustedError || err.code === 'LF-605' || err instanceof AmbiguousResolutionError || err.code === 'LF-603' || err instanceof VerificationMismatchError || err.code === 'LF-601') {
                        throw err; // propagate terminal budget and contract errors immediately without retrying!
                    }
                }
                await new Promise(r => setTimeout(r, policy.limits.retryIntervalMs));
            }
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
