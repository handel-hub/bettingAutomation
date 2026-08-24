import { logger } from '../../../../config.mjs';
import { LifecycleState } from '../../models/BrowserStateModel.mjs';

/**
 * Handles trailing-edge scroll convergence for Slave browsers.
 * 
 * When the Master's ScrollStateMachine reaches READY (scroll activity has settled),
 * this handler reads the Master's authoritative scroll state, compares it against
 * each Slave's actual scroll position, and applies corrections via direct
 * page.evaluate(scrollTo(...)) to guarantee convergence.
 * 
 * Design decisions incorporated from adversarial review:
 *   F-001: Only Master-originated events are processed (Slave events filtered)
 *   F-002: Bounded delayed re-verification catches post-correction interference
 *   F-003: Single atomic page.evaluate for read+compare+correct+verify
 *   F-004: Depends on scrollend for settling detection (verified in Chromium)
 *   F-005: NaN/undefined guard on Master rhoX/rhoY
 * 
 * Invariants:
 *   - Never writes to Master state (read-only)
 *   - Never consumes GES numbers (outside causal ordering)
 *   - Never enters ExecutionScheduler queue
 *   - Max 2 corrections per stability cycle (initial + 1 re-verify)
 *   - O(1) per-Slave state (lastAppliedVersion + convergenceInProgress)
 */
export class ScrollConvergenceHandler {
    constructor(registry) {
        this.registry = registry;
        
        /** @type {Map<string, number>} Highest applied scrollContextVersion per Slave */
        this.lastAppliedVersion = new Map();
        
        /** @type {Map<string, boolean>} Prevents concurrent corrections per Slave */
        this.convergenceInProgress = new Map();
        
        /** @type {Map<string, NodeJS.Timeout>} Delayed re-verify timers per Slave (F-002) */
        this.reverifyTimers = new Map();
        
        /** Spatial tolerance for rho comparison (0.001 = 0.1%) */
        this.TOLERANCE = 0.001;
        
        /** Delay before re-verification to allow in-flight commands to drain (F-002) */
        this.REVERIFY_DELAY_MS = 500;
    }

    /**
     * Main entry point. Called when ScrollConvergenceRequired fires from any browser's
     * ScrollStateMachine. F-001: filters to Master-only events before processing.
     */
    async handleScrollConvergenceRequired(event) {
        // F-001: Only process events from the Master browser
        const master = this.registry.getMaster();
        if (!master || event.browserId !== master.id) {
            return;
        }

        const { rhoX: masterRhoX, rhoY: masterRhoY, scrollContextVersion: version, containerId } = event;

        // F-005: Reject NaN/undefined rho values
        if (typeof masterRhoX !== 'number' || typeof masterRhoY !== 'number' ||
            isNaN(masterRhoX) || isNaN(masterRhoY)) {
            logger.debug(`[ScrollConvergence] Skipping — invalid Master rho (rhoX=${masterRhoX}, rhoY=${masterRhoY})`);
            this._emitTelemetry('SCROLL_CONVERGENCE_SKIPPED_INVALID_RHO', { masterRhoX, masterRhoY });
            return;
        }

        // Initial implementation: window-level scroll only
        if (containerId && containerId !== 'window') {
            logger.debug(`[ScrollConvergence] Skipping element-level container: ${containerId}`);
            return;
        }

        const slaves = this.registry.getReadySlaves();
        
        this._emitTelemetry('SCROLL_CONVERGENCE_REQUIRED', {
            masterId: event.browserId,
            rhoX: masterRhoX,
            rhoY: masterRhoY,
            version,
            slaveCount: slaves.length
        });

        for (const slave of slaves) {
            await this._converge(slave, masterRhoX, masterRhoY, version);
        }
    }

    /**
     * Attempts convergence for a single Slave browser.
     */
    async _converge(slave, masterRhoX, masterRhoY, version) {
        const slaveBrowserId = slave.id || slave.browserId;

        // Guard 1: Lifecycle
        if (slave.lifecycleState !== LifecycleState.READY) {
            this._emitTelemetry('SCROLL_CONVERGENCE_SKIPPED_LIFECYCLE', {
                slaveBrowserId,
                lifecycleState: slave.lifecycleState
            });
            return;
        }

        // Guard 2: Version staleness
        const lastVersion = this.lastAppliedVersion.get(slaveBrowserId) || 0;
        if (version <= lastVersion) {
            this._emitTelemetry('SCROLL_CONVERGENCE_SKIPPED_STALE', {
                slaveBrowserId,
                eventVersion: version,
                lastApplied: lastVersion
            });
            return;
        }

        // Guard 3: Concurrency
        if (this.convergenceInProgress.get(slaveBrowserId)) {
            this._emitTelemetry('SCROLL_CONVERGENCE_SKIPPED_IN_PROGRESS', { slaveBrowserId });
            return;
        }

        this.convergenceInProgress.set(slaveBrowserId, true);
        const startTime = Date.now();

        try {
            const page = slave.page;
            if (!page) {
                this._emitTelemetry('SCROLL_CONVERGENCE_SKIPPED_NO_PAGE', { slaveBrowserId });
                return;
            }

            // F-003: Single atomic page.evaluate for read + compare + correct + verify
            const result = await page.evaluate(({ masterRhoX, masterRhoY, tolerance }) => {
                const maxX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
                const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

                const preRhoX = maxX > 0 ? window.scrollX / maxX : 0;
                const preRhoY = maxY > 0 ? window.scrollY / maxY : 0;

                const deltaX = Math.abs(masterRhoX - preRhoX);
                const deltaY = Math.abs(masterRhoY - preRhoY);

                if (deltaX <= tolerance && deltaY <= tolerance) {
                    return { action: 'ALREADY_ALIGNED', preRhoX, preRhoY, deltaX, deltaY };
                }

                // Apply correction (behavior:'instant' is synchronous in Chromium)
                window.scrollTo({
                    left: maxX > 0 ? Math.round(masterRhoX * maxX) : 0,
                    top: maxY > 0 ? Math.round(masterRhoY * maxY) : 0,
                    behavior: 'instant'
                });

                // Verify immediately (synchronous after instant scrollTo)
                const postRhoX = maxX > 0 ? window.scrollX / maxX : 0;
                const postRhoY = maxY > 0 ? window.scrollY / maxY : 0;
                const postDeltaX = Math.abs(masterRhoX - postRhoX);
                const postDeltaY = Math.abs(masterRhoY - postRhoY);

                return {
                    action: (postDeltaX <= tolerance && postDeltaY <= tolerance)
                        ? 'VERIFIED_CONVERGED' : 'CONVERGENCE_INCOMPLETE',
                    preRhoX, preRhoY,
                    postRhoX, postRhoY,
                    deltaX, deltaY,
                    postDeltaX, postDeltaY,
                    appliedX: maxX > 0 ? Math.round(masterRhoX * maxX) : 0,
                    appliedY: maxY > 0 ? Math.round(masterRhoY * maxY) : 0
                };
            }, { masterRhoX, masterRhoY, tolerance: this.TOLERANCE });

            const latencyMs = Date.now() - startTime;

            if (result.action === 'ALREADY_ALIGNED') {
                this._emitTelemetry('SCROLL_CONVERGENCE_ALREADY_ALIGNED', {
                    slaveBrowserId, deltaRhoX: result.deltaX, deltaRhoY: result.deltaY, latencyMs
                });
            } else if (result.action === 'VERIFIED_CONVERGED') {
                this._emitTelemetry('SCROLL_CONVERGENCE_VERIFIED', {
                    slaveBrowserId,
                    preRhoX: result.preRhoX, preRhoY: result.preRhoY,
                    postRhoX: result.postRhoX, postRhoY: result.postRhoY,
                    postDeltaX: result.postDeltaX, postDeltaY: result.postDeltaY,
                    latencyMs
                });
            } else {
                this._emitTelemetry('SCROLL_CONVERGENCE_INCOMPLETE', {
                    slaveBrowserId,
                    preRhoX: result.preRhoX, preRhoY: result.preRhoY,
                    postRhoX: result.postRhoX, postRhoY: result.postRhoY,
                    postDeltaX: result.postDeltaX, postDeltaY: result.postDeltaY,
                    latencyMs
                });
            }

            this.lastAppliedVersion.set(slaveBrowserId, version);

            // F-002: Schedule delayed re-verification to catch post-correction interference
            // from stale commands still in the ExecutionScheduler queue
            if (result.action === 'VERIFIED_CONVERGED' || result.action === 'CONVERGENCE_INCOMPLETE') {
                this._scheduleReverify(slaveBrowserId, masterRhoX, masterRhoY, version);
            }

        } catch (error) {
            const msg = error.message || '';
            if (msg.includes('context was destroyed') || msg.includes('has been closed') ||
                msg.includes('Target closed') || msg.includes('Navigation')) {
                this._emitTelemetry('SCROLL_CONVERGENCE_NAVIGATION_INTERRUPTED', {
                    slaveBrowserId, error: msg
                });
            } else {
                this._emitTelemetry('SCROLL_CONVERGENCE_ERROR', {
                    slaveBrowserId, error: msg
                });
                logger.warn(`[ScrollConvergence] Error correcting ${slaveBrowserId}: ${msg}`);
            }
        } finally {
            this.convergenceInProgress.set(slaveBrowserId, false);
        }
    }

    /**
     * F-002: Schedules a single delayed re-verification to catch post-correction
     * interference from stale commands executing after the convergence correction.
     * 
     * Bounded: max 1 timer per Slave. Self-cleaning on fire.
     * Cancelled: when a newer convergence event arrives (version supersedes).
     */
    _scheduleReverify(slaveBrowserId, masterRhoX, masterRhoY, version, attempt = 0) {
        // Cancel any existing timer for this Slave
        const existingTimer = this.reverifyTimers.get(slaveBrowserId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const MAX_REVERIFY_ATTEMPTS = 2;
        if (attempt >= MAX_REVERIFY_ATTEMPTS) return;

        const delay = this.REVERIFY_DELAY_MS * (attempt + 1);

        const timerId = setTimeout(async () => {
            this.reverifyTimers.delete(slaveBrowserId);
            const lastVersion = this.lastAppliedVersion.get(slaveBrowserId) || 0;
            if (version < lastVersion) return;

            const corrected = await this._delayedReverify(slaveBrowserId, masterRhoX, masterRhoY, version);
            if (corrected) {
                this._scheduleReverify(slaveBrowserId, masterRhoX, masterRhoY, version, attempt + 1);
            }
        }, delay);

        this.reverifyTimers.set(slaveBrowserId, timerId);
    }

    /**
     * F-002: Delayed re-verification. Re-reads Slave position and re-corrects if
     * stale commands have undone the initial convergence correction.
     */
    async _delayedReverify(slaveBrowserId, masterRhoX, masterRhoY, version) {
        // Guard: skip if a newer version has been applied since this timer was scheduled
        const lastVersion = this.lastAppliedVersion.get(slaveBrowserId) || 0;
        if (version < lastVersion) {
            this._emitTelemetry('SCROLL_CONVERGENCE_REVERIFY_SUPERSEDED', {
                slaveBrowserId, timerVersion: version, currentVersion: lastVersion
            });
            return false;
        }

        // Guard: skip if lifecycle changed
        const slave = this.registry.getState(slaveBrowserId);
        if (!slave || slave.lifecycleState !== LifecycleState.READY) {
            return false;
        }

        const page = slave.page;
        if (!page) return false;

        try {
            // Atomic read + compare + correct in single page.evaluate
            const result = await page.evaluate(({ masterRhoX, masterRhoY, tolerance }) => {
                const maxX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
                const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

                const currentRhoX = maxX > 0 ? window.scrollX / maxX : 0;
                const currentRhoY = maxY > 0 ? window.scrollY / maxY : 0;

                const deltaX = Math.abs(masterRhoX - currentRhoX);
                const deltaY = Math.abs(masterRhoY - currentRhoY);

                if (deltaX <= tolerance && deltaY <= tolerance) {
                    return { action: 'CONFIRMED', currentRhoX, currentRhoY, deltaX, deltaY };
                }

                // Re-correct
                window.scrollTo({
                    left: maxX > 0 ? Math.round(masterRhoX * maxX) : 0,
                    top: maxY > 0 ? Math.round(masterRhoY * maxY) : 0,
                    behavior: 'instant'
                });

                const postRhoX = maxX > 0 ? window.scrollX / maxX : 0;
                const postRhoY = maxY > 0 ? window.scrollY / maxY : 0;

                return {
                    action: 'CORRECTED',
                    previousRhoX: currentRhoX, previousRhoY: currentRhoY,
                    postRhoX, postRhoY,
                    deltaX, deltaY
                };
            }, { masterRhoX, masterRhoY, tolerance: this.TOLERANCE });

            if (result.action === 'CONFIRMED') {
                this._emitTelemetry('SCROLL_CONVERGENCE_REVERIFY_CONFIRMED', {
                    slaveBrowserId, deltaX: result.deltaX, deltaY: result.deltaY
                });
                return false;
            } else {
                this._emitTelemetry('SCROLL_CONVERGENCE_REVERIFY_CORRECTED', {
                    slaveBrowserId,
                    previousRhoX: result.previousRhoX, previousRhoY: result.previousRhoY,
                    postRhoX: result.postRhoX, postRhoY: result.postRhoY,
                    driftX: result.deltaX, driftY: result.deltaY
                });
                return true;
            }
        } catch (error) {
            // Navigation or crash during re-verify — safe to ignore
            logger.debug(`[ScrollConvergence] Re-verify failed for ${slaveBrowserId}: ${error.message}`);
            return false;
        }
    }

    /**
     * Resets tracking state for a Slave after worker failover.
     * Called when WORKER_FAILOVER event fires for a browser.
     */
    resetSlaveVersion(browserId) {
        this.lastAppliedVersion.delete(browserId);
        this.convergenceInProgress.delete(browserId);
        
        const existingTimer = this.reverifyTimers.get(browserId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.reverifyTimers.delete(browserId);
        }
        
        logger.debug(`[ScrollConvergence] Reset tracking state for ${browserId} after failover`);
    }

    /**
     * Emits structured telemetry event for convergence observability.
     */
    _emitTelemetry(eventName, data) {
        logger.info(`[Telemetry] {"event":"${eventName}",${Object.entries(data).map(([k, v]) => `"${k}":${JSON.stringify(v)}`).join(',')}}`);
    }
}
