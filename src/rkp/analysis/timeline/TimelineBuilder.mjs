import { FactNormalizer } from '../normalization/FactNormalizer.mjs';

/**
 * Constructs chronological execution timelines from normalized Runtime Facts.
 * STRICT RESPONSIBILITY: Chronological ordering only. Does not infer causality.
 */
export class TimelineBuilder {
    /**
     * Consumes raw facts from an IFactSource, normalizes them, and builds a strict 
     * chronologically sorted timeline.
     * 
     * Ordering precedence:
     * 1. HLC (Hybrid Logical Clock) - for distributed, cross-process ordering
     * 2. LSN (Local Sequence Number) - for local node tie-breaking
     * 3. TraceId / SpanId - for absolute global determinism
     * 4. Physical Time - fallback
     * 
     * @param {import('../ingestion/IFactSource.mjs').IFactSource} factSource
     * @returns {Promise<import('../../models/index.mjs').BaseFact[]>}
     */
    static async build(factSource) {
        const timeline = [];

        for await (const rawFact of factSource.read()) {
            try {
                const fact = FactNormalizer.normalize(rawFact);
                timeline.push(fact);
            } catch (err) {
                console.warn('[TimelineBuilder] Discarding invalid fact:', err.message);
            }
        }

        // Sort the timeline based on HLC and LSN
        timeline.sort((a, b) => {
            // 1. Compare by HLC if both exist
            if (a.hlc && b.hlc) {
                if (a.hlc < b.hlc) return -1;
                if (a.hlc > b.hlc) return 1;
            }
            
            // 2. Compare by LSN if HLCs are identical or missing
            if (a.lsn !== undefined && b.lsn !== undefined && a.lsn !== b.lsn) {
                return a.lsn - b.lsn;
            }
            
            // 3. Compare by TraceId and SpanId for absolute global determinism
            if (a.traceId && b.traceId && a.traceId !== b.traceId) {
                return a.traceId.localeCompare(b.traceId);
            }
            if (a.spanId && b.spanId && a.spanId !== b.spanId) {
                return a.spanId.localeCompare(b.spanId);
            }

            // 4. Compare by Physical Time as last resort
            if (a.physicalTime && b.physicalTime && a.physicalTime !== b.physicalTime) {
                return a.physicalTime - b.physicalTime;
            }

            return 0;
        });

        return timeline;
    }
}
