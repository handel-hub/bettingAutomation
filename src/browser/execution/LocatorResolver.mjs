import { logger } from '../../config.mjs';
import { 
    LocatorResolutionError,
    NotAttachedError,
    AmbiguousMatchError,
    HiddenError,
    DisabledError,
    SyntaxError,
    ConfidenceGateRejectionError,
    GlobalTimeoutError,
    QueueDeadlineExceededError,
    ContractViolationError,
    MaxAttemptsReachedError,
    RecoveryExhaustedError,
    AmbiguousResolutionError,
    VerificationMismatchError
} from './errors.mjs';
import { ResolutionPolicy, DefaultPolicy } from './locatorIntelligence/resolution/ResolutionPolicy.mjs';
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
import { InferenceEngine } from './locatorIntelligence/inference/InferenceEngine.mjs';

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
        const resStart = Date.now();
        if (!options.disableMemoization && options.executionContext && options.executionContext.memoizedResolution) {
            const context = options.executionContext;
            const currentMsn = (options.sequenceGate && options.browserId) ? (context.command?.metadata?.msn || 0) : 0;
            const memo = context.memoizedResolution;
            const cmdId = context.command?.id || options.commandId;
            if (memo.commandId === cmdId && memo.msn === currentMsn) {
                let isConnected = false;
                try {
                    if (memo.elementHandle) {
                        isConnected = typeof memo.elementHandle.isConnected === 'function' ? await memo.elementHandle.isConnected() : true;
                    } else if (memo.resolutionOutcome?.playwrightLocator) {
                        const handle = await memo.resolutionOutcome.playwrightLocator.elementHandle({ timeout: 100 });
                        if (handle) {
                            isConnected = typeof handle.isConnected === 'function' ? await handle.isConnected() : true;
                        }
                    }
                } catch (e) {
                    isConnected = false;
                }
                if (isConnected) {
                    logger.info(`[LocatorResolver] Lifecycle memoization hit for command ${cmdId}`);
                    return memo.resolutionOutcome;
                } else {
                    logger.info(`[LocatorResolver] Memoized handle detached from DOM; evicting cache.`);
                    context.memoizedResolution = null;
                }
            }
        }
        const originalEID = options.identityDocument || null;
        try {
            const result = await this._resolveInternal(page, candidates, interactionType, policy, options);
            const durationMs = Date.now() - resStart;
            let valRes13 = 'PASS';
            let err13 = null;
            if (!result || !result.success) {
                valRes13 = 'FAIL_LF504';
                if (result?.failureReason && result.failureReason.includes('LF-')) {
                    const match = result.failureReason.match(/\[(LF-\d+)\]/);
                    if (match) valRes13 = `FAIL_${match[1].replace('-', '')}`;
                }
                err13 = { errorCode: valRes13.replace('FAIL_', ''), errorMessage: result?.failureReason || 'Resolution failed' };
            }
            TelemetryCollector.recordLifecycleEvent({
                traceId: options.traceId || 'tr-unknown',
                spanId: 'sp-13-' + (options.browserId || 'unknown').slice(0, 4),
                parentSpanId: 'sp-11-' + (options.browserId || 'unknown').slice(0, 4),
                stageSequence: 13,
                stageName: 'LOCATOR_RESOLUTION',
                component: 'LocatorResolver.mjs',
                method: 'resolve',
                timestamp: Date.now(),
                browserId: options.browserId || 'slave',
                interactionId: options.interactionId || 'ia-unknown',
                commandId: options.commandId || null,
                interactionType,
                stageDurationMs: durationMs,
                eidPresent: !!originalEID,
                eidHash: options.eidHash || TelemetryCollector.computeEIDHash(originalEID),
                validationResult: valRes13,
                errorDetails: err13
            });
            if (result && result.success && !options.disableMemoization && options.executionContext) {
                const context = options.executionContext;
                const currentMsn = (options.sequenceGate && options.browserId) ? (context.command?.metadata?.msn || 0) : 0;
                const cmdId = context.command?.id || options.commandId;
                let elementHandle = null;
                try {
                    if (result.playwrightLocator && typeof result.playwrightLocator.elementHandle === 'function') {
                        elementHandle = await result.playwrightLocator.elementHandle({ timeout: 100 });
                    }
                } catch (e) {}
                context.memoizedResolution = {
                    commandId: cmdId,
                    msn: currentMsn,
                    browserId: options.browserId,
                    resolutionOutcome: result,
                    elementHandle,
                    timestamp: Date.now()
                };
            }
            return result;
        } catch (err) {
            const durationMs = Date.now() - resStart;
            let valRes13 = 'FAIL_LF504';
            if (err && err.code && String(err.code).startsWith('LF-')) {
                valRes13 = `FAIL_${String(err.code).replace('-', '')}`;
            } else if (err && err.message && err.message.includes('LF-')) {
                const match = err.message.match(/\[(LF-\d+)\]/);
                if (match) valRes13 = `FAIL_${match[1].replace('-', '')}`;
            }
            TelemetryCollector.recordLifecycleEvent({
                traceId: options.traceId || 'tr-unknown',
                spanId: 'sp-13-' + (options.browserId || 'unknown').slice(0, 4),
                parentSpanId: 'sp-11-' + (options.browserId || 'unknown').slice(0, 4),
                stageSequence: 13,
                stageName: 'LOCATOR_RESOLUTION',
                component: 'LocatorResolver.mjs',
                method: 'resolve',
                timestamp: Date.now(),
                browserId: options.browserId || 'slave',
                interactionId: options.interactionId || 'ia-unknown',
                commandId: options.commandId || null,
                interactionType,
                stageDurationMs: durationMs,
                eidPresent: !!originalEID,
                eidHash: options.eidHash || TelemetryCollector.computeEIDHash(originalEID),
                validationResult: valRes13,
                errorDetails: { errorCode: valRes13.replace('FAIL_', ''), errorMessage: err.message }
            });
            throw err;
        }
    }

    static async _resolveInternal(page, candidates, interactionType, policy = DefaultPolicy, options = {}) {
        if (!policy || typeof policy.getRetryBudget !== 'function') {
            policy = new ResolutionPolicy(policy || {});
        }
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

        TelemetryCollector.recordLifecycleEvent({
            traceId: options.traceId || 'tr-unknown',
            spanId: 'sp-11-' + (options.browserId || 'unknown').slice(0, 4),
            parentSpanId: 'sp-10-' + (options.browserId || 'unknown').slice(0, 4),
            stageSequence: 11,
            stageName: 'NAVIGATION_EPOCH_GATING',
            component: 'LocatorResolver.mjs',
            method: 'resolve',
            timestamp: Date.now(),
            browserId: options.browserId || 'slave',
            interactionId: options.interactionId || 'ia-unknown',
            commandId: options.commandId || null,
            interactionType,
            epoch: 0,
            validationResult: 'PASS'
        });

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
            
            if (featureFlags.isEnabled('SCENE_GRAPH_ENABLED') && originalEID) {
                let sgResults = null;
                try {
                    sgResults = await page.evaluate((eid) => {
                        if (window.__sceneGraph && window.__sceneGraph.isReady()) {
                            const records = window.__sceneGraph.query(eid);
                            return records.map((rec, idx) => ({
                                candidateId: `sg-${idx}`,
                                locator: rec.locator,
                                count: 1,
                                visible: rec.isVisible,
                                enabled: !rec.isDisabled,
                                strategy: 'scene-graph',
                                rank: idx,
                                candidate: {
                                    id: `sg-${idx}`,
                                    locator: rec.locator,
                                    strategy: 'scene-graph',
                                    ranking: { finalScore: 1.0 }
                                }
                            }));
                        }
                        return null;
                    }, originalEID);
                } catch (e) {
                    logger.warn(`[LocatorResolver] SceneGraph query failed: ${e.message}`);
                }

                if (sgResults && sgResults.length > 0) {
                    for (const item of sgResults) {
                        if (profile.includes('visible') && item.visible === false) continue;
                        if (profile.includes('enabled') && item.enabled === false) continue;

                        let similarity = null;
                        if (featureFlags.isEnabled('LI_VERIFICATION')) {
                            const verifyResult = await verificationEngine.verify(page, item.locator, originalEID);
                            if (!verifyResult.verified) {
                                logger.warn(`[LocatorResolver] Verification failed for SceneGraph locator [${item.locator}]: ${verifyResult.reason}`);
                                continue;
                            }
                            similarity = verifyResult.similarity;
                        }

                        let locator;
                        try {
                            locator = page.locator(item.locator);
                        } catch (e) {
                            continue;
                        }

                        const duration = Date.now() - startTime;
                        const winningScore = 1.0;

                        if (featureFlags.isEnabled('LI_CONFIDENCE_GATE')) {
                            const gateDecision = confidenceGate.evaluate(winningScore, interactionType, duration, { similarity });
                            if (gateDecision.action === 'ABORT') {
                                return new ResolutionResult({ success: false, reason: gateDecision.reason, confidence: winningScore, duration });
                            }
                        }

                        if (featureFlags.isEnabled('LI_RESOLUTION_MEMORY') && originalEID.identityHash && urlPathname) {
                            resolutionMemory.record(urlPathname, originalEID.identityHash, item.locator, 'scene-graph', winningScore, { durationMs: duration, verificationPassed: true });
                        }

                        return new ResolutionResult({
                            success: true,
                            playwrightLocator: locator,
                            strategyName: 'scene-graph',
                            candidateUsed: item.candidate,
                            confidence: winningScore,
                            attempts: resolutionCycles,
                            duration,
                            fallbackUsed: false,
                            resolvedVia: 'scene-graph'
                        });
                    }
                }
            }

            if ((featureFlags.isEnabled('INFERENCE_ENGINE_V2') || featureFlags.isEnabled('LI_INFERENCE_ENGINE_V2')) && originalEID) {
                const startTime = Date.now();
                const spatialCallback = options.spatialCallback || null;
                const inferenceRes = inferenceEngine.infer(originalEID, candidatesToEvaluate, spatialCallback);
                if (inferenceRes.outcome === 'MATCH' && inferenceRes.candidate) {
                    const duration = Date.now() - startTime;
                    const winCand = inferenceRes.candidate;
                    const winningStrategy = winCand.strategy || 'inference-engine';
                    const winningScore = inferenceRes.confidence;

                    let locator;
                    try {
                        locator = page.locator(winCand.locator);
                        const count = await page.locator(winCand.locator).count();
                        if (count > 0) {
                            if (featureFlags.isEnabled('LI_CONFIDENCE_GATE')) {
                                const gateDecision = confidenceGate.evaluate(winningScore, interactionType);
                                TelemetryCollector.recordConfidenceGateDecision(gateDecision);
                                if (gateDecision.decision === 'REJECT') {
                                    throw new ConfidenceGateRejectionError(gateDecision.reason);
                                }
                                if (gateDecision.decision === 'RECOVER') {
                                    throw new Error(`[LF-302] Recoverable Confidence Miss: ${gateDecision.reason}`);
                                }
                            }

                            if (featureFlags.isEnabled('LI_RESOLUTION_MEMORY') && originalEID.identityHash && urlPathname) {
                                resolutionMemory.remember(urlPathname, originalEID.identityHash, winningStrategy, winCand.locator, winningScore);
                                strategySuccessTracker.recordOutcome(winningStrategy, new URL(page.url()).hostname, true);
                            }

                            const result = new ResolutionResult({
                                success: true,
                                playwrightLocator: locator,
                                locator: winCand.locator,
                                candidate: winCand,
                                strategy: winningStrategy,
                                duration,
                                resolutionCycles: 1,
                                winningCandidate: winCand,
                                winningStrategy,
                                winningScore,
                                similarity: winningScore,
                                totalCandidates: candidates.length,
                                exhaustedCandidates: 0,
                                telemetry: []
                            });
                            TelemetryCollector.recordResolution(result);
                            return result;
                        }
                    } catch (e) {
                        if (e instanceof ConfidenceGateRejectionError || e.message?.includes('LF-302')) throw e;
                    }
                } else if (inferenceRes.outcome === 'AMBIGUOUS') {
                    throw new AmbiguousMatchError(`InferenceEngine ambiguous match: ${inferenceRes.trace?.reason}`);
                } else if (inferenceRes.outcome === 'NO_MATCH') {
                    throw new Error(`[LF-505] All Candidates Exhausted in InferenceEngine (${Date.now() - startTime}ms)`);
                }
            }

            if (featureFlags.isEnabled('LI_BATCH_RESOLVER')) {
            const batchResult = await BatchResolver.resolve(page, candidatesToEvaluate, profile, { 
                shadowPath: options.shadowPath || [],
                sequenceGate: options.sequenceGate,
                browserId: options.browserId
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
                        locator = page.locator(item.locator);
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
                        if (gateDecision.decision === 'RECOVER') {
                            logger.warn(`[LocatorResolver] ConfidenceGate RECOVER for [${item.locator}]: ${gateDecision.reason}`);
                            throw new Error(`[LF-302] Recoverable Confidence Miss: ${gateDecision.reason}`);
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
                                if (gateDecision.decision === 'RECOVER') {
                                    logger.warn(`[LocatorResolver] ConfidenceGate RECOVER for [${item.locator}]: ${gateDecision.reason}`);
                                    throw new Error(`[LF-302] Recoverable Confidence Miss: ${gateDecision.reason}`);
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
            
            const evaluateContext = async (ctx) => {
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
                                throw new AmbiguousMatchError(`Locator resolved to ${count} elements. Implicit .first() fallback is disabled. Strategy: ${ctx.candidate.strategy} | Locator: ${ctx.candidate.locator}`);
                            }
                        } else {
                            if (featureFlags.isEnabled('LI_VERIFICATION')) {
                                const verifyResult = await verificationEngine.verify(page, ctx.candidate.locator, originalEID);
                                if (!verifyResult.verified) {
                                    throw new NotAttachedError(`Verification failed: ${verifyResult.reason}`);
                                }
                                ctx.similarity = verifyResult.similarity;
                            }
                            // locator already strictly represents 1 element.
                        }
                        ctx.transitionTo(ResolutionState.LOCATED);
                    } else {
                        // locator is already standard.
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
                        if (gateDecision.decision === 'RECOVER') {
                            logger.warn(`[LocatorResolver] ConfidenceGate RECOVER for [${ctx.candidate.locator}]: ${gateDecision.reason}`);
                            throw new Error(`[LF-302] Recoverable Confidence Miss: ${gateDecision.reason}`);
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
                    throw err; // throw so the chunk runner knows this candidate failed
                }
            };

            const CHUNK_SIZE = 3;
            for (let i = 0; i < activeContexts.length; i += CHUNK_SIZE) {
                const chunk = activeContexts.slice(i, i + CHUNK_SIZE);
                try {
                    const result = await new Promise((resolve, reject) => {
                        let rejections = 0;
                        const errors = [];
                        chunk.forEach(ctx => {
                            evaluateContext(ctx).then(resolve).catch(err => {
                                const isFatal = (err instanceof ConfidenceGateRejectionError || err.name === 'ConfidenceBelowThresholdError' || err.code === 'LF-602' || err instanceof GlobalTimeoutError || err instanceof QueueDeadlineExceededError || err.code === 'LF-504' || err.code === 'LF-702' || err instanceof ContractViolationError || err.code === 'LF-701' || err instanceof MaxAttemptsReachedError || err.code === 'LF-505' || err instanceof RecoveryExhaustedError || err.code === 'LF-605' || err instanceof AmbiguousResolutionError || err.code === 'LF-603' || err instanceof VerificationMismatchError || err.code === 'LF-601');
                                if (isFatal) {
                                    reject(err);
                                } else {
                                    errors.push(err);
                                    rejections++;
                                    if (rejections === chunk.length) {
                                        reject(new AggregateError(errors, 'All candidates in chunk failed'));
                                    }
                                }
                            });
                        });
                    });
                    if (result && result.success) return result;
                } catch (err) {
                    if (err instanceof AggregateError) {
                        continue; // try next chunk
                    }
                    throw err; // fatal error, abort resolution pass
                }
            }
            
            throw new Error("Resolution pass failed (no candidate succeeded)");
        };
        
        if (featureFlags.isEnabled('LI_RECOVERY_HIERARCHY')) {
            const { RecoveryOrchestrator } = await import('./locatorIntelligence/resolution/RecoveryOrchestrator.mjs');
            const orchestrator = new RecoveryOrchestrator();
            const outcome = await orchestrator.orchestrate(resolveAttempt, interactionType, page, { ...options, interactionType });
            
            if (outcome.status === 'RESOLVED') {
                return outcome.result;
            }
            if (outcome.terminalError) {
                const err = outcome.terminalError;
                const isExhaustion = (err.code === 'LF-505' || err.name === 'MaxAttemptsReachedError' || err.name === 'RecoveryExhaustedError' || (err.message && err.message.includes('[LF-505]')));
                if (!isExhaustion) {
                    throw err;
                }
            }
            
            const duration = outcome.duration;
            const failureReason = outcome.status === 'SKIPPED' 
                ? `[LF-605] Resolution Skipped for ${interactionType}`
                : (outcome.terminalError ? outcome.terminalError.message : `[LF-505] Resolution Aborted at ${outcome.level} after ${outcome.attempts} attempts (${duration}ms)\n${this._formatTelemetry(contexts, policy)}`);
                
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
