/**
 * ConfidenceGate.mjs
 * 
 * Phase 8: Final accept/reject decision mechanism before physical execution.
 * Evaluates resolution confidence against interaction-type-dependent thresholds.
 */
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class ConfidenceDecision {
    constructor({
        decision = 'REJECT',
        confidence = 0.0,
        threshold = 0.50,
        margin = -0.50,
        interactionType = 'UNKNOWN',
        reason = '',
        thresholdApplied = 0.50
    } = {}) {
        this.decision = decision; // 'ACCEPT' | 'REJECT' | 'TENTATIVE'
        this.confidence = Number(confidence) || 0.0;
        this.threshold = Number(threshold) || 0.0;
        this.thresholdApplied = Number(thresholdApplied !== undefined ? thresholdApplied : threshold) || 0.0;
        this.margin = Number(margin) || 0.0;
        this.interactionType = String(interactionType || 'UNKNOWN');
        this.reason = String(reason || '');
    }

    isAcceptable() {
        return this.decision === 'ACCEPT' || this.decision === 'TENTATIVE';
    }

    toJSON() {
        return {
            decision: this.decision,
            confidence: this.confidence,
            threshold: this.threshold,
            thresholdApplied: this.thresholdApplied,
            margin: this.margin,
            interactionType: this.interactionType,
            reason: this.reason
        };
    }
}

export class ConfidenceGate {
    constructor(config = {}) {
        this.thresholds = {
            CLICK: 0.45,
            DOUBLE_CLICK: 0.45,
            DBLCLICK: 0.45,
            INPUT: 0.50,
            FILL: 0.50,
            TYPE: 0.50,
            PRESS: 0.50,
            KEYBOARD: 0.40,
            HOVER: 0.10,
            DRAG: 0.50,
            DROP: 0.50,
            SCROLL: 0.0,
            WHEEL: 0.0,
            DEFAULT: 0.50,
            ...(config.thresholds || {})
        };
    }

    /**
     * Evaluates whether a resolution's confidence score satisfies the threshold for the given interaction type.
     * 
     * @param {number|object} resolutionConfidence - Similarity score (0.0 to 1.0) or ranking score (0 to 100)
     * @param {string} interactionType - Type of interaction (e.g. 'click', 'input', 'hover')
     * @returns {ConfidenceDecision}
     */
    evaluate(resolutionConfidence, interactionType) {
        const typeStr = String(interactionType || 'UNKNOWN').toUpperCase().trim();
        const threshold = this._getThreshold(typeStr);

        let conf = NaN;
        if (resolutionConfidence !== null && resolutionConfidence !== undefined) {
            if (typeof resolutionConfidence === 'object') {
                if (typeof resolutionConfidence.overallScore === 'number') {
                    conf = resolutionConfidence.overallScore;
                } else if (typeof resolutionConfidence.confidence === 'number') {
                    conf = resolutionConfidence.confidence;
                } else if (typeof resolutionConfidence.finalScore === 'number') {
                    conf = resolutionConfidence.finalScore;
                } else {
                    conf = Number(resolutionConfidence);
                }
            } else {
                conf = Number(resolutionConfidence);
            }
        }

        // Normalize 0-100 scale scores to 0.0-1.0 scale
        if (typeof conf === 'number' && !isNaN(conf) && conf > 1.0 && conf <= 100.0) {
            conf = conf / 100.0;
        }

        if (typeof conf !== 'number' || isNaN(conf) || conf < 0) {
            const invalidConf = isNaN(conf) ? 0.0 : conf;
            const margin = Number((invalidConf - threshold).toFixed(4));
            TelemetryCollector.recordConfidenceGateDecision('REJECT');
            return new ConfidenceDecision({
                decision: 'REJECT',
                confidence: invalidConf,
                threshold,
                thresholdApplied: threshold,
                margin,
                interactionType: typeStr,
                reason: `Confidence is NaN or invalid for ${typeStr}`
            });
        }

        const margin = Number((conf - threshold).toFixed(4));
        const decisionObj = this._classifyMargin(conf, threshold, margin, typeStr);
        TelemetryCollector.recordConfidenceGateDecision(decisionObj.decision);
        return decisionObj;
    }

    _getThreshold(typeStr) {
        if (!typeStr || typeStr === 'UNKNOWN') {
            return Number(this.thresholds.DEFAULT || 0.50);
        }
        if (this.thresholds[typeStr] !== undefined) {
            return Number(this.thresholds[typeStr]);
        }
        if (typeStr.includes('CLICK') || typeStr === 'TAP') {
            return Number(this.thresholds.CLICK || 0.45);
        }
        if (typeStr.includes('INPUT') || typeStr.includes('KEY') || typeStr === 'FILL' || typeStr === 'TYPE' || typeStr === 'PRESS') {
            return Number(this.thresholds.INPUT || 0.50);
        }
        if (typeStr.includes('HOVER')) {
            return Number(this.thresholds.HOVER || 0.10);
        }
        if (typeStr.includes('DRAG') || typeStr === 'DROP') {
            return Number(this.thresholds.DRAG || 0.50);
        }
        if (typeStr.includes('SCROLL') || typeStr === 'WHEEL') {
            return Number(this.thresholds.SCROLL || 0.0);
        }
        return Number(this.thresholds.DEFAULT || 0.50);
    }

    _classifyMargin(confidence, threshold, margin, typeStr) {
        if (margin < 0) {
            return new ConfidenceDecision({
                decision: 'REJECT',
                confidence,
                threshold,
                thresholdApplied: threshold,
                margin,
                interactionType: typeStr,
                reason: `Confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)} for ${typeStr}`
            });
        }
        if (margin < 0.05) {
            return new ConfidenceDecision({
                decision: 'TENTATIVE',
                confidence,
                threshold,
                thresholdApplied: threshold,
                margin,
                interactionType: typeStr,
                reason: `Confidence ${confidence.toFixed(2)} marginally exceeds threshold ${threshold.toFixed(2)} for ${typeStr}`
            });
        }
        return new ConfidenceDecision({
            decision: 'ACCEPT',
            confidence,
            threshold,
            thresholdApplied: threshold,
            margin,
            interactionType: typeStr,
            reason: `Confidence ${confidence.toFixed(2)} firmly exceeds threshold ${threshold.toFixed(2)} for ${typeStr}`
        });
    }
}
