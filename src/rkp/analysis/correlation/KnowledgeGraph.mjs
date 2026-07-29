/**
 * Represents the execution history as a Directed Acyclic Graph (DAG).
 * STRICT RESPONSIBILITY: Graph projection only. The WAL is the source of truth.
 */
export class KnowledgeGraph {
    constructor() {
        this.nodes = new Set();
        /** @type {Map<import('../../models/index.mjs').BaseFact, import('../correlation/CorrelationEngine.mjs').CausalLink[]>} */
        this.outgoingEdges = new Map();
        /** @type {Map<import('../../models/index.mjs').BaseFact, import('../correlation/CorrelationEngine.mjs').CausalLink[]>} */
        this.incomingEdges = new Map();
    }

    /**
     * Projects causal links and timeline facts into an in-memory graph.
     * @param {import('../../models/index.mjs').BaseFact[]} timeline 
     * @param {import('../correlation/CorrelationEngine.mjs').CausalLink[]} causalLinks 
     * @returns {KnowledgeGraph}
     */
    static project(timeline, causalLinks) {
        const graph = new KnowledgeGraph();

        // 1. Add all nodes
        for (const fact of timeline) {
            graph.nodes.add(fact);
            graph.outgoingEdges.set(fact, []);
            graph.incomingEdges.set(fact, []);
        }

        // 2. Add all edges
        for (const link of causalLinks) {
            // Only add edges between facts that exist in the timeline projection
            if (graph.nodes.has(link.source) && graph.nodes.has(link.target)) {
                graph.outgoingEdges.get(link.source).push(link);
                graph.incomingEdges.get(link.target).push(link);
            }
        }

        return graph;
    }

    /**
     * Retrieves all immediate predecessors of a fact.
     * @param {import('../../models/index.mjs').BaseFact} fact 
     * @returns {import('../correlation/CorrelationEngine.mjs').CausalLink[]}
     */
    getPredecessors(fact) {
        return this.incomingEdges.get(fact) || [];
    }

    /**
     * Retrieves all immediate successors of a fact.
     * @param {import('../../models/index.mjs').BaseFact} fact 
     * @returns {import('../correlation/CorrelationEngine.mjs').CausalLink[]}
     */
    getSuccessors(fact) {
        return this.outgoingEdges.get(fact) || [];
    }
}
