/**
 * Answers high-level "Why did this happen?" questions by traversing the KnowledgeGraph.
 */
export class ExplainabilityEngine {
    /**
     * @param {import('../../models/index.mjs').BaseFact} fact 
     * @param {import('../query/RuntimeQueryEngine.mjs').RuntimeQueryEngine} queryEngine 
     * @returns {string} Human readable explanation
     */
    static explain(fact, queryEngine) {
        if (!fact) return "No fact provided.";

        let explanation = `Fact [${fact.type}] in domain [${fact.domain}] occurred.`;

        if (fact.type === 'Failure') {
            explanation = `${fact.domain} failed with error: ${fact.errorMessage} (Code: ${fact.errorCode}).`;
            if (fact.recoveryStrategy && fact.recoveryStrategy !== 'NONE') {
                explanation += ` Recovery strategy attempted: ${fact.recoveryStrategy}.`;
            }
        }

        if (fact.type === 'Decision') {
            explanation = `${fact.domain} decided to ${fact.actionTaken}.`;
            if (fact.alternativesDiscarded?.length > 0) {
                explanation += ` Rejected alternatives: ${fact.alternativesDiscarded.join(', ')}.`;
            }
            if (fact.evidence?.constraintsEvaluated?.length > 0) {
                explanation += ` Based on constraints: ${fact.evidence.constraintsEvaluated.join(', ')}.`;
            }
        }

        // Traverse causal links for root cause
        const predecessors = queryEngine.findPredecessors(fact);
        if (predecessors.length > 0) {
            const causalParents = predecessors.filter(p => p.type === 'causal' || p.type === 'chronological');
            if (causalParents.length > 0) {
                explanation += `\nRoot Causality Trace:\n`;
                for (const parentLink of causalParents) {
                    const p = parentLink.source;
                    explanation += `  <- Triggered by [${p.domain}:${p.type}] (Trace: ${p.traceId})\n`;
                }
            }
        }

        return explanation;
    }
}
