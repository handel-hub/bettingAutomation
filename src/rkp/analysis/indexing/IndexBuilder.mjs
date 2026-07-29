/**
 * @typedef {Object} Indexes
 * @property {Map<string, import('../../models/index.mjs').BaseFact[]>} traceIndex
 * @property {Map<string, import('../../models/index.mjs').BaseFact[]>} spanIndex
 * @property {Map<string, import('../../models/index.mjs').BaseFact[]>} typeIndex
 * @property {Map<string, import('../../models/index.mjs').BaseFact[]>} domainIndex
 */

/**
 * Constructs optimized lookup indices for the Knowledge Graph.
 * STRICT RESPONSIBILITY: Indexing only. Does not execute queries.
 */
export class IndexBuilder {
    /**
     * Builds standard indexes from a projected Knowledge Graph.
     * @param {import('../correlation/KnowledgeGraph.mjs').KnowledgeGraph} graph 
     * @returns {Indexes}
     */
    static buildIndexes(graph) {
        const traceIndex = new Map();
        const spanIndex = new Map();
        const typeIndex = new Map();
        const domainIndex = new Map();

        for (const fact of graph.nodes) {
            // Trace Index
            if (!traceIndex.has(fact.traceId)) traceIndex.set(fact.traceId, []);
            traceIndex.get(fact.traceId).push(fact);

            // Span Index
            if (!spanIndex.has(fact.spanId)) spanIndex.set(fact.spanId, []);
            spanIndex.get(fact.spanId).push(fact);

            // Type Index
            if (!typeIndex.has(fact.type)) typeIndex.set(fact.type, []);
            typeIndex.get(fact.type).push(fact);

            // Domain Index
            if (!domainIndex.has(fact.domain)) domainIndex.set(fact.domain, []);
            domainIndex.get(fact.domain).push(fact);
        }

        return {
            traceIndex,
            spanIndex,
            typeIndex,
            domainIndex
        };
    }
}
