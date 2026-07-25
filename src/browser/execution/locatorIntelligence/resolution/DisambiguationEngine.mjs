import { EIDComparator } from './EIDComparator.mjs';
import { SlaveEIDExtractor } from './SlaveEIDExtractor.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

export class DisambiguationEngine {
    constructor(config = {}) {
        this.minConfidence = config.minConfidence !== undefined ? Number(config.minConfidence) : 0.40;
        this.minMargin = config.minMargin !== undefined ? Number(config.minMargin) : 0.10;
        this.comparator = new EIDComparator(config.weights || null);
    }

    /**
     * Disambiguates between multiple matching elements on the slave DOM.
     * @param {object} page Playwright Page or MockPage instance
     * @param {string} locator The locator selector string
     * @param {number} count Number of matching elements reported by batch resolver
     * @param {ElementIdentityDocument} originalEID Master-side EID to match against
     * @returns {Promise<{ resolved: boolean, elementIndex: number, score: object|null, margin: number, candidatesScored: Array, error: string|null }>}
     */
    async disambiguate(page, locator, count, originalEID) {
        if (!originalEID) {
            return {
                resolved: false,
                elementIndex: -1,
                score: null,
                margin: 0,
                candidatesScored: [],
                error: 'LF-603: Disambiguation failed - no master EID provided for comparison (implicit .first() fallback is disabled)'
            };
        }

        const maxToExtract = Math.min(Math.max(2, count), 10);
        const eids = await SlaveEIDExtractor.extractAll(page, locator, maxToExtract);

        if (!eids || eids.length === 0) {
            TelemetryCollector.recordDisambiguation(false);
            return {
                resolved: false,
                elementIndex: -1,
                score: null,
                margin: 0,
                candidatesScored: [],
                error: 'LF-301: Element vanished during disambiguation (0 elements extracted)'
            };
        }

        const scored = eids.map((eid, idx) => {
            const score = this.comparator.compare(originalEID, eid);
            return {
                elementIndex: idx,
                eid,
                score,
                overallScore: score.overallScore
            };
        });

        scored.sort((a, b) => b.overallScore - a.overallScore);

        const top = scored[0];
        const second = scored[1] || { overallScore: 0.0 };
        const margin = Number((top.overallScore - second.overallScore).toFixed(4));

        if (top.overallScore < this.minConfidence) {
            TelemetryCollector.recordDisambiguation(false);
            return {
                resolved: false,
                elementIndex: -1,
                score: top.score,
                margin,
                candidatesScored: scored,
                error: `LF-603: Disambiguation failed - top match score (${top.overallScore.toFixed(2)}) below minConfidence (${this.minConfidence})`
            };
        }

        if (scored.length > 1 && margin < this.minMargin) {
            TelemetryCollector.recordDisambiguation(false);
            return {
                resolved: false,
                elementIndex: -1,
                score: top.score,
                margin,
                candidatesScored: scored,
                error: `LF-603: Disambiguation failed - ambiguous match with insufficient margin (${margin} < ${this.minMargin})`
            };
        }

        TelemetryCollector.recordDisambiguation(true);
        return {
            resolved: true,
            elementIndex: top.elementIndex,
            score: top.score,
            margin,
            candidatesScored: scored,
            error: null
        };
    }
}
export default DisambiguationEngine;
