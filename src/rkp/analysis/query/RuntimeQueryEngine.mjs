/**
 * Executes efficient read queries against pre-built indexes and Knowledge Graphs.
 * STRICT RESPONSIBILITY: Execution only. Does not build indices.
 */
export class RuntimeQueryEngine {
    /**
     * @param {import('../correlation/KnowledgeGraph.mjs').KnowledgeGraph} graph 
     * @param {import('../indexing/IndexBuilder.mjs').Indexes} indexes 
     */
    constructor(graph, indexes) {
        this.graph = graph;
        this.indexes = indexes;
    }

    /**
     * @param {string} traceId 
     * @returns {import('../../models/index.mjs').BaseFact[]}
     */
    findByTraceId(traceId) {
        return this.indexes.traceIndex.get(traceId) || [];
    }

    /**
     * @param {string} spanId 
     * @returns {import('../../models/index.mjs').BaseFact[]}
     */
    findBySpanId(spanId) {
        return this.indexes.spanIndex.get(spanId) || [];
    }

    /**
     * @param {string} type 
     * @returns {import('../../models/index.mjs').BaseFact[]}
     */
    findByType(type) {
        return this.indexes.typeIndex.get(type) || [];
    }

    /**
     * Traverses predecessors using the knowledge graph causality links.
     * @param {import('../../models/index.mjs').BaseFact} fact 
     * @returns {import('../correlation/CorrelationEngine.mjs').CausalLink[]}
     */
    findPredecessors(fact) {
        return this.graph.getPredecessors(fact);
    }
}
