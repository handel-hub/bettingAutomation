/**
 * @file ViewportIsomorphicGatingController.mjs
 * @description Stage 2 — Viewport Isomorphic Gating Subsystem.
 * Replaces informal viewport resizing with strict 5-tuple CDP locking:
 * (width, height, dpr, orientation, scale).
 * Enforces invariant INV-VP-ISOMORPHISM within 0.001 tolerance before any interaction executes.
 */

import EventEmitter from 'node:events';
import { logger } from '../../../../config.mjs';

export const ISOMORPHISM_TOLERANCE = 0.001;

export class ViewportIsomorphicGatingController extends EventEmitter {
    /**
     * @param {string} browserId 
     * @param {Object} registry - BrowserStateRegistry instance
     * @param {Object} [telemetryCollector=null] - SanraTelemetryCollector instance
     * @param {Object} [options={}]
     */
    constructor(browserId, registry, telemetryCollector = null, options = {}) {
        super();
        this.browserId = browserId;
        this.registry = registry;
        this.telemetryCollector = telemetryCollector;
        this.tolerance = options.tolerance || ISOMORPHISM_TOLERANCE;
        this.lockTimeoutMs = options.lockTimeoutMs || 3000;
        this.cdpSessions = new WeakMap();
    }

    /**
     * Sets or updates the telemetry collector.
     * @param {Object} collector 
     */
    setTelemetryCollector(collector) {
        this.telemetryCollector = collector;
    }

    /**
     * Helper to emit telemetry events cleanly if collector is attached.
     */
    _emitEvent(eventName, data) {
        if (this.telemetryCollector && typeof this.telemetryCollector.emitEvent === 'function') {
            return this.telemetryCollector.emitEvent(eventName, {
                browserId: this.browserId,
                subsystem: 'VP',
                ...data
            });
        }
        return null;
    }

    /**
     * Helper to emit Failure Taxonomy codes if collector is attached.
     */
    _emitFailure(errorCode, payload) {
        if (this.telemetryCollector && typeof this.telemetryCollector.emitFailure === 'function') {
            return this.telemetryCollector.emitFailure(errorCode, {
                browserId: this.browserId,
                subsystem: 'VP',
                ...payload
            });
        }
        logger.error(`[ViewportIsomorphicGatingController:${this.browserId}] Failure ${errorCode}: ${JSON.stringify(payload)}`);
        return null;
    }

    /**
     * Enforces strict 5-tuple locking on the provided Playwright page via CDP or emulation methods.
     * 5-tuple: (width, height, dpr, orientation, scale)
     * @param {Object} page - Playwright Page object
     * @param {Object} targetViewport - Target 5-tuple metadata
     * @returns {Promise<boolean>} True if lock acquired successfully
     */
    async lockViewport(page, targetViewport) {
        const width = Math.round(targetViewport.width || targetViewport.layoutViewportWidth || 1280);
        const height = Math.round(targetViewport.height || targetViewport.layoutViewportHeight || 720);
        const dpr = targetViewport.dpr ?? targetViewport.deviceScaleFactor ?? 1;
        const orientation = this._normalizeOrientation(targetViewport.orientation);
        const scale = targetViewport.visualScale ?? targetViewport.visualViewportScale ?? 1;

        const startTime = Date.now();

        try {
            // Attempt CDP locking first if available
            let cdpUsed = false;
            if (page && typeof page.context === 'function' && page.context()) {
                try {
                    let cdp = this.cdpSessions.get(page);
                    if (!cdp && typeof page.context().newCDPSession === 'function') {
                        cdp = await Promise.race([
                            page.context().newCDPSession(page),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('CDP session creation timeout')), this.lockTimeoutMs))
                        ]);
                        this.cdpSessions.set(page, cdp);
                    }

                    if (cdp && typeof cdp.send === 'function') {
                        const metricsPayload = {
                            width,
                            height,
                            deviceScaleFactor: dpr,
                            mobile: targetViewport.isMobile || false
                        };
                        if (orientation) {
                            metricsPayload.screenOrientation = {
                                type: orientation.type || 'portraitPrimary',
                                angle: orientation.angle || 0
                            };
                        }

                        await Promise.race([
                            cdp.send('Emulation.setDeviceMetricsOverride', metricsPayload),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('CDP Emulation.setDeviceMetricsOverride timeout')), this.lockTimeoutMs))
                        ]);

                        if (scale !== 1) {
                            await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale }).catch(() => {});
                        }
                        cdpUsed = true;
                    }
                } catch (cdpErr) {
                    // CDP error or timeout -> emit VP-004 if it was a timeout or connection issue
                    if (cdpErr.message.includes('timeout') || cdpErr.message.includes('CDP')) {
                        this._emitFailure('VP-004', {
                            reason: cdpErr.message,
                            durationUs: (Date.now() - startTime) * 1000
                        });
                    }
                    logger.debug(`[ViewportIsomorphicGatingController:${this.browserId}] CDP locking fallback: ${cdpErr.message}`);
                }
            }

            // Fallback or reinforcement via standard Playwright page methods
            if (!cdpUsed && page && typeof page.setViewportSize === 'function') {
                await page.setViewportSize({ width, height });
            }

            const durationUs = (Date.now() - startTime) * 1000;
            this._emitEvent('ViewportLockAcquired', {
                pipelineStage: 'LOCK',
                durationUs,
                payload: { width, height, dpr, orientation: orientation?.type || 'unknown', scale, cdpUsed }
            });

            this.emit('ViewportLocked', { width, height, dpr, orientation, scale, cdpUsed });
            return true;
        } catch (error) {
            const durationUs = (Date.now() - startTime) * 1000;
            this._emitFailure('VP-004', {
                reason: `Viewport locking failed completely: ${error.message}`,
                durationUs
            });
            return false;
        }
    }

    /**
     * Evaluates 5-tuple isomorphism between Master and Slave viewports.
     * Enforces INV-VP-ISOMORPHISM within 0.001 tolerance.
     * @param {Object} masterViewport 
     * @param {Object} slaveViewport 
     * @returns {{isIsomorphic: boolean, failureCode?: string, reason?: string, details?: Object}}
     */
    evaluateIsomorphism(masterViewport, slaveViewport) {
        if (!masterViewport) {
            return { isIsomorphic: true, reason: 'No master viewport expectation provided' };
        }
        if (!slaveViewport) {
            const result = { isIsomorphic: false, failureCode: 'VP-001', reason: 'Slave viewport context unavailable' };
            this._emitIsomorphismFailure(result, masterViewport, slaveViewport);
            return result;
        }

        const mWidth = masterViewport.width ?? masterViewport.layoutViewportWidth ?? 0;
        const mHeight = masterViewport.height ?? masterViewport.layoutViewportHeight ?? 0;
        const sWidth = slaveViewport.width ?? slaveViewport.layoutViewportWidth ?? 0;
        const sHeight = slaveViewport.height ?? slaveViewport.layoutViewportHeight ?? 0;

        const mDpr = masterViewport.dpr ?? masterViewport.deviceScaleFactor ?? 1;
        const sDpr = slaveViewport.dpr ?? slaveViewport.deviceScaleFactor ?? 1;

        const mScale = masterViewport.visualScale ?? masterViewport.visualViewportScale ?? 1;
        const sScale = slaveViewport.visualScale ?? slaveViewport.visualViewportScale ?? 1;

        const mOrient = this._normalizeOrientationString(masterViewport.orientation);
        const sOrient = this._normalizeOrientationString(slaveViewport.orientation);

        const details = {
            master: { width: mWidth, height: mHeight, dpr: mDpr, orientation: mOrient, scale: mScale },
            slave: { width: sWidth, height: sHeight, dpr: sDpr, orientation: sOrient, scale: sScale }
        };

        // 1. Check Dimensions (VP-001)
        if (Math.abs(mWidth - sWidth) > this.tolerance || Math.abs(mHeight - sHeight) > this.tolerance) {
            const result = { isIsomorphic: false, failureCode: 'VP-001', reason: `Layout dimensions mismatch: Master(${mWidth}x${mHeight}) vs Slave(${sWidth}x${sHeight})`, details };
            this._emitIsomorphismFailure(result, masterViewport, slaveViewport);
            return result;
        }

        // 2. Check Orientation (VP-001)
        if (mOrient !== 'unknown' && sOrient !== 'unknown' && mOrient !== sOrient) {
            const result = { isIsomorphic: false, failureCode: 'VP-001', reason: `Orientation mismatch: Master(${mOrient}) vs Slave(${sOrient})`, details };
            this._emitIsomorphismFailure(result, masterViewport, slaveViewport);
            return result;
        }

        // 3. Check DPR (VP-003)
        if (Math.abs(mDpr - sDpr) > this.tolerance) {
            const result = { isIsomorphic: false, failureCode: 'VP-003', reason: `DevicePixelRatio mismatch: Master(${mDpr}) vs Slave(${sDpr})`, details };
            this._emitIsomorphismFailure(result, masterViewport, slaveViewport);
            return result;
        }

        // 4. Check Visual Scale (VP-002)
        if (Math.abs(mScale - sScale) > this.tolerance) {
            const result = { isIsomorphic: false, failureCode: 'VP-002', reason: `Visual scale divergence: Master(${mScale}) vs Slave(${sScale})`, details };
            this._emitIsomorphismFailure(result, masterViewport, slaveViewport);
            return result;
        }

        // INV-VP-ISOMORPHISM satisfied!
        this._emitEvent('ViewportIsomorphismValidated', {
            pipelineStage: 'EVALUATE',
            payload: { tolerance: this.tolerance, details }
        });

        return { isIsomorphic: true, details };
    }

    /**
     * Enforces isomorphism on the given page against target master viewport.
     * Evaluates first; if non-isomorphic, locks viewport via CDP/Playwright and re-evaluates.
     * @param {Object} page 
     * @param {Object} masterViewport 
     * @returns {Promise<{isIsomorphic: boolean, failureCode?: string, reason?: string, details?: Object}>}
     */
    async enforceIsomorphism(page, masterViewport) {
        if (!masterViewport) {
            return { isIsomorphic: true };
        }

        let slaveViewport = this.registry?.getState(this.browserId)?.viewportContext;
        if (!slaveViewport && page) {
            slaveViewport = await this._scrapeViewportFromPage(page);
        }

        let evalResult = this.evaluateIsomorphism(masterViewport, slaveViewport);
        if (evalResult.isIsomorphic) {
            return evalResult;
        }

        // Attempt recovery via locking
        logger.info(`[ViewportIsomorphicGatingController:${this.browserId}] Isomorphism check failed (${evalResult.failureCode}). Attempting recovery lock...`);
        const locked = await this.lockViewport(page, masterViewport);
        if (!locked) {
            return evalResult;
        }

        // Re-scrape or get updated state after lock
        if (page) {
            slaveViewport = await this._scrapeViewportFromPage(page);
        } else {
            slaveViewport = this.registry?.getState(this.browserId)?.viewportContext;
        }

        evalResult = this.evaluateIsomorphism(masterViewport, slaveViewport);
        if (!evalResult.isIsomorphic) {
            logger.warn(`[ViewportIsomorphicGatingController:${this.browserId}] Isomorphism enforcement failed after lock: ${evalResult.reason}`);
        }
        return evalResult;
    }

    _emitIsomorphismFailure(result, masterViewport, slaveViewport) {
        this._emitFailure(result.failureCode, {
            reason: result.reason,
            masterViewport,
            slaveViewport,
            details: result.details
        });
        this._emitEvent('ViewportIsomorphismFailed', {
            severity: 'ERROR',
            pipelineStage: 'EVALUATE',
            payload: {
                failureCode: result.failureCode,
                reason: result.reason,
                details: result.details
            }
        });
    }

    _normalizeOrientation(orient) {
        if (!orient) return null;
        if (typeof orient === 'string') {
            return { type: orient, angle: 0 };
        }
        return {
            type: orient.type || 'portraitPrimary',
            angle: orient.angle || 0
        };
    }

    _normalizeOrientationString(orient) {
        if (!orient) return 'unknown';
        if (typeof orient === 'string') return orient;
        return orient.type || 'unknown';
    }

    async _scrapeViewportFromPage(page) {
        try {
            return await page.evaluate(() => ({
                layoutViewportWidth: window.innerWidth,
                layoutViewportHeight: window.innerHeight,
                dpr: window.devicePixelRatio,
                orientation: window.screen?.orientation?.type || 'unknown',
                visualViewportScale: window.visualViewport?.scale || 1
            }));
        } catch (e) {
            return null;
        }
    }
}
