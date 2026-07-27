import { MetricsRegistry } from './MetricsRegistry.mjs';
import featureFlags from '../FeatureFlags.mjs';

class TelemetryCollectorImpl {
    constructor() {
        this.registry = new MetricsRegistry();
        this.mundaneSamplingRate = 0.01; // 1% by default for mundane commands
        this._mundaneCounter = 0;
        this.dispatchQueue = [];
        this.drainScheduled = false;
        this.onDispatch = null;
    }

    /**
     * Resets all accumulated telemetry.
     */
    reset() {
        this.registry.reset();
        this._mundaneCounter = 0;
        this.dispatchQueue = [];
        this.drainScheduled = false;
    }

    setSamplingRate(rate) {
        if (typeof rate === 'number' && rate >= 0 && rate <= 1) {
            this.mundaneSamplingRate = rate;
        }
    }

    shouldSample(event) {
        if (!event) return false;
        // Always sample errors, failures, recovery, and rejections
        if (event.validationResult && event.validationResult.startsWith('FAIL')) return true;
        if (event.errorDetails != null && (typeof event.errorDetails === 'string' || Object.keys(event.errorDetails).length > 0)) return true;
        if (event.stageName && (event.stageName.includes('RECOVERY') || event.stageName.includes('FAIL') || event.stageName.includes('REJECT') || event.stageName.includes('ERROR'))) return true;

        // Check if mundane interaction type
        const type = (event.interactionType || '').toLowerCase();
        const isMundane = ['hover', 'scroll', 'mousemove', 'pointermove'].includes(type);
        if (isMundane && (event.validationResult === 'PASS' || !event.validationResult)) {
            if (this.mundaneSamplingRate <= 0) return false;
            if (this.mundaneSamplingRate >= 1) return true;
            this._mundaneCounter = (this._mundaneCounter || 0) + 1;
            const interval = Math.round(1 / this.mundaneSamplingRate);
            return (this._mundaneCounter % interval) === 1;
        }

        // Always sample all other commands (click, keypress, fill, navigate, etc.)
        return true;
    }

    scrubPII(value, depth = 0) {
        if (depth > 5 || value === null || value === undefined) return value;
        if (typeof value === 'string') {
            let str = value;
            // Scrub 16-digit credit cards
            str = str.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[SCRUBBED_CARD]');
            // Scrub 9-digit SSNs
            str = str.replace(/\b\d{3}[ -]\d{2}[ -]\d{4}\b/g, '[SCRUBBED_SSN]');
            // Scrub Email addresses
            str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[SCRUBBED_EMAIL]');
            // Scrub tokens and secrets
            str = str.replace(/\b(?:bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [SCRUBBED_TOKEN]');
            str = str.replace(/(password|passwd|pwd|secret|token)(\s*(?:[=:]|\bis\b)\s*)([^\s,;"]+)/gi, '$1$2[SCRUBBED]');
            return str;
        }
        if (Array.isArray(value)) {
            return value.map(v => this.scrubPII(v, depth + 1));
        }
        if (typeof value === 'object') {
            const scrubbed = {};
            for (const [k, v] of Object.entries(value)) {
                scrubbed[k] = this.scrubPII(v, depth + 1);
            }
            return scrubbed;
        }
        return value;
    }

    flush() {
        if (!this.dispatchQueue || !this.dispatchQueue.length) return;
        const batch = this.dispatchQueue.splice(0, this.dispatchQueue.length);
        this.drainScheduled = false;
        try {
            const serialized = JSON.stringify(batch);
            if (typeof this.onDispatch === 'function') {
                this.onDispatch(serialized, batch);
            }
            if (typeof window !== 'undefined' && typeof window.dispatchLifecycleEvent === 'function') {
                for (const ev of batch) {
                    window.dispatchLifecycleEvent(ev).catch(() => {});
                }
            }
        } catch (e) {
            // Passive error handling
        }
    }

    _scheduleDrain() {
        if (this.drainScheduled) return;
        this.drainScheduled = true;
        const scheduleFn = (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function')
            ? window.requestIdleCallback
            : (cb) => setTimeout(cb, 0);
        scheduleFn(() => {
            this.drainScheduled = false;
            this.flush();
        });
    }

    /**
     * Returns an immutable snapshot of current metrics.
     */
    snapshot() {
        // Since snapshot returns a deeply cloned/mapped structure, it's safe to return directly.
        return this.registry.snapshot();
    }

    /**
     * Records telemetry from the RankingEngine.
     * @param {RankingResult} rankingResult
     */
    recordRanking(rankingResult) {
        try {
            if (!rankingResult) return;
            const candidates = rankingResult.candidates || [];
            this.registry.ranking.candidateCount.push(candidates.length);
            
            let totalConf = 0, ambiguityCount = 0, corroborationCount = 0;
            
            for (const c of candidates) {
                totalConf += c.ranking?.finalScore || 0;
                // These are heuristics, we assume the scores exist inside the candidate metadata
                if (c.ranking?.breakdown?.corroborationScore > 0) corroborationCount++;
            }
            
            if (candidates.length > 0) {
                this.registry.ranking.finalConfidence.push(totalConf / candidates.length);
            }
            this.registry.ranking.corroborationCount.push(corroborationCount);
        } catch (e) {
            // Passive - ignore errors
        }
    }

    /**
     * Records telemetry from the CandidateValidator.
     * @param {string} status e.g., UNIQUE, AMBIGUOUS, NOT_VERIFIABLE
     */
    recordValidation(status) {
        try {
            if (featureFlags.isEnabled('LI_REMOVE_VALIDATOR')) return;
            if (this.registry.validation[status] !== undefined) {
                this.registry.validation[status]++;
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the LocatorResolver.
     * @param {ResolutionResult} resolutionResult
     */
    recordResolution(resolutionResult) {
        try {
            if (!resolutionResult) return;
            
            this.registry.resolution.total++;
            this.registry.resolution.latency.push(resolutionResult.duration || 0);
            
            if (resolutionResult.success) {
                this.registry.resolution.success++;
                this.registry.recordStrategyResult(resolutionResult.winningStrategy, true);
                
                // Track execution attempts before finding success
                let resolutionAttempts = 0;
                if (resolutionResult.telemetry && resolutionResult.telemetry.length > 0) {
                     for (const t of resolutionResult.telemetry) {
                          resolutionAttempts += t.attempts || 0;
                     }
                }
                this.registry.resolution.retries.push(resolutionAttempts);
                
            } else {
                this.registry.resolution.failed++;
                if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-504')) {
                    this.registry.resolution.timeout++;
                    this.registry.recordFailureCode('LF-504');
                } else if (resolutionResult.failureReason && resolutionResult.failureReason.includes('LF-505')) {
                    this.registry.recordFailureCode('LF-505');
                } else {
                    this.registry.recordFailureCode('UNKNOWN_FAILURE');
                }
            }
            
            // Record strategy failures
            if (resolutionResult.telemetry) {
                for (const ctx of resolutionResult.telemetry) {
                    // ctx is either a stripped object `{ rank, attempts, state }` or full `ResolutionContext`
                    // We only count strategies that were exhausted or had terminal failures as failed.
                    if (ctx.state === 'EXHAUSTED' || ctx.state === 'TERMINAL_FAILURE') {
                        // We need the strategy name, full context has candidate.strategy.
                        const strategyName = ctx.candidate?.strategy || ctx.strategy;
                        if (strategyName) {
                            this.registry.recordStrategyResult(strategyName, false);
                        }
                        
                        // Count LF codes from failures
                        if (ctx.lastFailure?.code) {
                            this.registry.recordFailureCode(ctx.lastFailure.code);
                        } else if (ctx.failureHistory && ctx.failureHistory.length > 0) {
                            const last = ctx.failureHistory[ctx.failureHistory.length - 1];
                            if (last.code) this.registry.recordFailureCode(last.code);
                        }
                    }
                }
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry from the ActionSimulator.
     */
    recordExecution() {
        // Placeholder for future auditing
        try {
            this.registry.execution.total++;
        } catch (e) {}
    }

    /**
     * Records telemetry from EID Extraction.
     */
    recordEIDExtraction(durationMs) {
        try {
            if (typeof durationMs === 'number') {
                this.registry.extraction.eidTime.push(durationMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from BatchResolver.
     */
    recordBatchResolution(durationMs, candidateCount, roundTrips = 1) {
        try {
            if (typeof durationMs === 'number') this.registry.batch.evaluationTime.push(durationMs);
            if (typeof candidateCount === 'number') this.registry.batch.candidateCount.push(candidateCount);
            if (typeof roundTrips === 'number') this.registry.batch.roundTrips.push(roundTrips);
        } catch (e) {}
    }

    /**
     * Records telemetry from DisambiguationEngine.
     */
    recordDisambiguation(success) {
        try {
            if (success) {
                this.registry.disambiguation.triggered++;
            } else {
                this.registry.disambiguation.failed++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from VerificationEngine.
     */
    recordVerification(success, similarityScore = 0) {
        try {
            if (success) {
                this.registry.verification.passed++;
            } else {
                this.registry.verification.failed++;
            }
            if (typeof similarityScore === 'number') {
                this.registry.verification.similarityScore.push(similarityScore);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from RecoveryOrchestrator.
     */
    recordRecovery(level) {
        try {
            const levelKey = `L${level}`;
            const keyMap = { 'L1': 'L1_RETRY', 'L2': 'L2_WAIT', 'L3': 'L3_SKIP', 'L4': 'L4_RELOAD' };
            const mapped = keyMap[levelKey];
            if (mapped && this.registry.recovery[mapped] !== undefined) {
                this.registry.recovery[mapped]++;
            }
        } catch (e) {}
    }

    /**
     * Records telemetry from ResolutionMemory.
     */
    recordMemory(hit) {
        try {
            if (hit) {
                this.registry.memory.hits++;
            } else {
                this.registry.memory.misses++;
            }
        } catch (e) {}
    }

    recordMemoryHit() {
        try { this.registry.memory.hits++; } catch (e) {}
    }

    recordMemoryMiss() {
        try { this.registry.memory.misses++; } catch (e) {}
    }

    recordMemoryEviction() {
        try { if (this.registry.memory.evictions !== undefined) this.registry.memory.evictions++; } catch (e) {}
    }

    /**
     * Records telemetry from StaleEpoch aborts.
     */
    recordEpochSkip() {
        try {
            this.registry.execution.epochSkips++;
        } catch (e) {}
    }

    /**
     * Records telemetry from the ConfidenceGate.
     * @param {object} decision - ConfidenceDecision object
     */
    recordConfidenceGateDecision(decision) {
        try {
            if (!decision || !decision.decision) return;
            if (this.registry.confidence && this.registry.confidence[decision.decision] !== undefined) {
                this.registry.confidence[decision.decision]++;
            }
        } catch (e) {
            // Passive
        }
    }

    /**
     * Records telemetry for epoch injection attempts.
     * @param {boolean} success
     * @param {number} [latencyMs]
     */
    recordEpochInjection(success, latencyMs) {
        try {
            if (success) {
                this.registry.epochSync.injectionSuccess++;
            } else {
                this.registry.epochSync.injectionFailure++;
            }
            if (typeof latencyMs === 'number' && !isNaN(latencyMs)) {
                this.registry.epochSync.injectionLatency.push(latencyMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for epoch injection retries.
     */
    recordEpochInjectionRetry() {
        try {
            this.registry.epochSync.injectionRetry++;
        } catch (e) {}
    }

    /**
     * Records telemetry when a mismatch between client and server epoch is detected.
     * @param {number} clientEpoch
     * @param {number} serverEpoch
     */
    recordEpochMismatch(clientEpoch, serverEpoch) {
        try {
            this.registry.epochSync.mismatchDetected++;
            if (typeof clientEpoch === 'number' && typeof serverEpoch === 'number') {
                this.registry.epochSync.epochDrift.push(Math.abs(clientEpoch - serverEpoch));
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for epoch validation decisions.
     * @param {string|object} decision - Decision string ('PROCEED', 'SKIP', 'WAIT') or decision object
     * @param {number} [waitDurationMs]
     * @param {string} [reason]
     */
    recordEpochDecision(decision, waitDurationMs, reason) {
        try {
            const decStr = typeof decision === 'object' ? decision?.decision : decision;
            const resStr = typeof decision === 'object' ? decision?.reason : reason;

            if (decStr === 'PROCEED') {
                this.registry.epochSync.proceeded++;
            } else if (decStr === 'WAIT') {
                this.registry.epochSync.waited++;
            } else if (decStr === 'SKIP') {
                if (resStr && (resStr.includes('within') || resStr.includes('timeout') || resStr.includes('failed to navigate'))) {
                    this.registry.epochSync.skippedTimeout++;
                } else {
                    this.registry.epochSync.skippedStale++;
                }
            }

            if (typeof waitDurationMs === 'number' && !isNaN(waitDurationMs) && waitDurationMs > 0) {
                this.registry.epochSync.epochWaitDuration.push(waitDurationMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for epoch barrier stalls.
     * @param {object} probeData 
     */
    recordBarrierProbe(probeData) {
        try {
            if (!this.registry.epochSync.barrierProbes) {
                this.registry.epochSync.barrierProbes = [];
            }
            this.registry.epochSync.barrierProbes.push({
                eventType: 'EPOCH_BARRIER_PROBE',
                timestamp: Date.now(),
                ...probeData
            });
        } catch (e) {}
    }

    /**
     * Records telemetry for IPC message delivery.
     * @param {number} [latencyMs]
     */
    recordIpcDelivery(latencyMs) {
        try {
            this.registry.epochSync.ipcReceived++;
            if (typeof latencyMs === 'number' && !isNaN(latencyMs)) {
                this.registry.epochSync.ipcDeliveryLatency.push(latencyMs);
            }
        } catch (e) {}
    }

    /**
     * Records telemetry for lost IPC messages.
     */
    recordIpcLost() {
        try {
            this.registry.epochSync.ipcLost++;
        } catch (e) {}
    }

    /**
     * Records telemetry for dropped duplicate IPC messages.
     */
    recordIpcDuplicate() {
        try {
            this.registry.epochSync.ipcDuplicatesDropped++;
        } catch (e) {}
    }

    /**
     * Records telemetry for out-of-order IPC messages.
     */
    recordIpcOutOfOrder() {
        try {
            this.registry.epochSync.ipcOutOfOrder++;
        } catch (e) {}
    }

    /**
     * Records telemetry for SPA navigation detection.
     * @param {string} [type]
     */
    recordSpaNavigation(type) {
        try {
            this.registry.epochSync.spaNavigationDetected++;
        } catch (e) {}
    }

    /**
     * Records telemetry for shadow mode execution comparison between legacy and v2 resolution pipelines.
     * @param {string} commandId
     * @param {object} legacyResult
     * @param {object} v2Result
     */
    recordShadowMode(commandId, legacyResult, v2Result) {
        try {
            if (!this.registry.shadowMode) {
                this.registry.shadowMode = { total: 0, matches: 0, mismatches: 0 };
            }
            this.registry.shadowMode.total++;
            let legacyLoc = legacyResult?.locator || legacyResult?.playwrightLocator || null;
            let v2Loc = v2Result?.locator || v2Result?.playwrightLocator || null;
            
            // Support passing a single combined object { legacyLocator, newLocator } as second argument
            if (v2Result === undefined && legacyResult && (legacyResult.legacyLocator !== undefined || legacyResult.newLocator !== undefined)) {
                legacyLoc = legacyResult.legacyLocator || null;
                v2Loc = legacyResult.newLocator || null;
            }
            
            if (legacyLoc !== v2Loc) {
                this.registry.shadowMode.mismatches++;
            } else {
                this.registry.shadowMode.matches++;
            }
        } catch (e) {
            // Passive - ignore errors
        }
    }

    /**
     * Computes a deterministic 64-character hex cryptographic hash of a normalized EID object.
     * Works synchronously in both Browser and Node.js environments without async crypto dependencies.
     * @param {object} eid
     * @returns {string|null}
     */
    computeEIDHash(eid) {
        if (!eid || typeof eid !== 'object') return null;
        try {
            const str = typeof eid.serialize === 'function' ? JSON.stringify(eid.serialize()) : JSON.stringify(eid);
            let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length, h3 = 0x811c9dc5 ^ str.length, h4 = 0xc761c23c ^ str.length;
            for (let i = 0, ch; i < str.length; i++) {
                ch = str.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
                h3 = Math.imul(h3 ^ ch, 3266489917);
                h4 = Math.imul(h4 ^ ch, 668265263);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489917);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489917);
            h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489917);
            h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489917);
            const hex = (n) => (n >>> 0).toString(16).padStart(8, '0');
            return hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h1 ^ h3) + hex(h2 ^ h4) + hex(h1 ^ h4) + hex(h2 ^ h3);
        } catch (e) {
            return null;
        }
    }

    /**
     * Emits and stores a structured telemetry lifecycle span event.
     * Enforces schema normalization and forwards across browser-to-node boundary if in injected browser script.
     * @param {object} event
     */
    recordLifecycleEvent(event) {
        try {
            if (!event) return;

            // Asymmetrical sampling check
            if (!this.shouldSample(event)) {
                if (this.registry && this.registry.sampling) {
                    this.registry.sampling.suppressed++;
                }
                return;
            }
            if (this.registry && this.registry.sampling) {
                this.registry.sampling.sampled++;
            }

            const normalized = {
                eventId: event.eventId || ('ev-' + Math.random().toString(16).slice(2, 10)),
                traceId: event.traceId || 'tr-unknown',
                spanId: event.spanId || ('sp-' + Math.random().toString(16).slice(2, 10)),
                parentSpanId: event.parentSpanId || null,
                stageSequence: typeof event.stageSequence === 'number' ? event.stageSequence : 0,
                stageName: event.stageName || 'UNKNOWN_STAGE',
                component: event.component || 'Unknown.mjs',
                method: event.method || 'unknown',
                timestamp: typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
                browserId: event.browserId || (typeof window !== 'undefined' ? 'master' : 'node_controller'),
                epoch: typeof event.epoch === 'number' ? event.epoch : (typeof window !== 'undefined' ? (window.__ANTIGRAVITY_EPOCH__ || 0) : 0),
                interactionId: event.interactionId || 'ia-unknown',
                commandId: event.commandId || null,
                interactionType: event.interactionType || 'CLICK',
                payloadSize: typeof event.payloadSize === 'number' ? event.payloadSize : 0,
                eidPresent: !!event.eidPresent,
                eidHash: event.eidHash || null,
                serializationSize: typeof event.serializationSize === 'number' ? event.serializationSize : 0,
                validationResult: event.validationResult || 'PASS',
                stageDurationMs: typeof event.stageDurationMs === 'number' ? event.stageDurationMs : 0,
                errorDetails: event.errorDetails || null
            };

            // PII Scrubbing on string properties
            const scrubbed = this.scrubPII(normalized);

            if (this.registry && Array.isArray(this.registry.lifecycleEvents)) {
                this.registry.lifecycleEvents.push(scrubbed);
                if (this.registry.lifecycleEvents.length > 500) {
                    this.registry.lifecycleEvents.shift();
                }
            }

            if (scrubbed.validationResult && scrubbed.validationResult.startsWith('FAIL')) {
                const code = scrubbed.errorDetails?.errorCode || scrubbed.validationResult.replace('FAIL_', '');
                if (this.registry && typeof this.registry.recordFailureCode === 'function') {
                    this.registry.recordFailureCode(code);
                }
            }

            // Deferred asynchronous dispatch off the critical path
            this.dispatchQueue.push(scrubbed);
            if (scrubbed.validationResult && scrubbed.validationResult.startsWith('FAIL')) {
                // Synchronous immediate flush on failure/error to prevent loss on crash
                this.flush();
            } else {
                this._scheduleDrain();
            }
        } catch (e) {
            // Passive telemetry
        }
    }

    /**
     * Records a SYNC-100: MSN Gap Detected event.
     * @param {string} browserId
     * @param {number} expectedMsn
     * @param {number} actualMsn
     */
    recordSyncGap(browserId, expectedMsn, actualMsn) {
        try {
            this.registry.epochSync.syncGap++;
            this.recordLifecycleEvent({
                stageName: 'SYNC_ERROR',
                component: 'SequenceGate.mjs',
                method: 'validateMsn',
                browserId,
                errorDetails: { errorCode: 'SYNC-100', expectedMsn, actualMsn }
            });
        } catch (e) {}
    }

    /**
     * Records a SYNC-201: URL Assertion Failure event.
     * @param {string} browserId
     * @param {string} expectedUrl
     * @param {string} actualUrl
     */
    recordSyncAssertionFailure(browserId, expectedUrl, actualUrl) {
        try {
            this.registry.epochSync.syncAssertionFailure++;
            this.recordLifecycleEvent({
                stageName: 'SYNC_ERROR',
                component: 'SynchronizationBarrier.mjs',
                method: 'assertUrl',
                browserId,
                errorDetails: { errorCode: 'SYNC-201', expectedUrl, actualUrl }
            });
        } catch (e) {}
    }

    /**
     * Records a SYNC-300: Ingress ACK Timeout event.
     * @param {string} interactionId
     */
    recordSyncAckTimeout(interactionId) {
        try {
            this.registry.epochSync.syncAckTimeout++;
            this.recordLifecycleEvent({
                stageName: 'SYNC_ERROR',
                component: 'ActionDispatcher.mjs',
                method: 'ackTimeout',
                interactionId,
                errorDetails: { errorCode: 'SYNC-300', interactionId }
            });
        } catch (e) {}
    }
}

export const TelemetryCollector = new TelemetryCollectorImpl();
