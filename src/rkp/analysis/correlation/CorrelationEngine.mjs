/**
 * @typedef {Object} CausalLink
 * @property {import('../../models/index.mjs').BaseFact} source
 * @property {import('../../models/index.mjs').BaseFact} target
 * @property {'chronological' | 'causal' | 'hierarchy'} type
 * @property {string} label
 */

/**
 * Recovers causal relationships from a chronologically ordered Timeline.
 * STRICT RESPONSIBILITY: Causality only. Does not sort or re-order facts.
 */
export class CorrelationEngine {
    /**
     * Discovers relationships using TraceId, SpanId, and ParentVersion.
     * @param {import('../../models/index.mjs').BaseFact[]} timeline
     * @returns {CausalLink[]}
     */
    static correlate(timeline) {
        const links = [];
        
        // Indexes to speed up correlation
        const factsByTrace = new Map();
        const factsBySpan = new Map();
        const stateFactsByVersion = new Map(); // traceId -> version -> Fact

        for (const fact of timeline) {
            // 1. Chronological correlation within the same TraceId
            if (!factsByTrace.has(fact.traceId)) {
                factsByTrace.set(fact.traceId, []);
            }
            const traceSequence = factsByTrace.get(fact.traceId);
            if (traceSequence.length > 0) {
                const previousFact = traceSequence[traceSequence.length - 1];
                links.push({
                    source: previousFact,
                    target: fact,
                    type: 'chronological',
                    label: 'next'
                });
            }
            traceSequence.push(fact);

            // 2. Hierarchical correlation within the same SpanId
            if (!factsBySpan.has(fact.spanId)) {
                factsBySpan.set(fact.spanId, []);
            }
            const spanSequence = factsBySpan.get(fact.spanId);
            if (spanSequence.length > 0) {
                const headOfSpan = spanSequence[0];
                // Link the head of the span to this fact if it's not the same fact
                if (headOfSpan !== fact) {
                    links.push({
                        source: headOfSpan,
                        target: fact,
                        type: 'hierarchy',
                        label: 'child_of_span'
                    });
                }
            }
            spanSequence.push(fact);

            // 3. Causal correlation via State Versions
            if (fact.type === 'State') {
                if (!stateFactsByVersion.has(fact.traceId)) {
                    stateFactsByVersion.set(fact.traceId, new Map());
                }
                const versionMap = stateFactsByVersion.get(fact.traceId);
                versionMap.set(fact.version, fact);

                if (fact.parentVersion > 0 && versionMap.has(fact.parentVersion)) {
                    const parentStateFact = versionMap.get(fact.parentVersion);
                    links.push({
                        source: parentStateFact,
                        target: fact,
                        type: 'causal',
                        label: 'state_derivation'
                    });
                }
            }
        }

        return links;
    }
}
