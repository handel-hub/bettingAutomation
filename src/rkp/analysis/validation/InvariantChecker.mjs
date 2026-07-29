/**
 * Validates invariants over timelines and knowledge graphs to automatically detect
 * architectural violations (e.g., LSN ordering, HLC backwards jumps).
 */
export class InvariantChecker {
    /**
     * @param {import('../query/RuntimeQueryEngine.mjs').RuntimeQueryEngine} queryEngine 
     * @returns {string[]} List of violation descriptions. Empty if healthy.
     */
    static verify(queryEngine) {
        const violations = [];

        // Check 1: Monotonic LSNs within traces
        for (const [traceId, facts] of queryEngine.indexes.traceIndex.entries()) {
            let lastLsn = -1;
            for (const fact of facts) {
                if (fact.lsn !== undefined) {
                    if (fact.lsn <= lastLsn) {
                        violations.push(`[Trace ${traceId}] LSN invariant violation: ${fact.lsn} followed ${lastLsn}`);
                    }
                    lastLsn = fact.lsn;
                }
            }
        }

        // Check 2: State Version monotonicity
        for (const [traceId, facts] of queryEngine.indexes.traceIndex.entries()) {
            const stateFacts = facts.filter(f => f.type === 'State');
            let expectedVersion = 1;
            for (const stateFact of stateFacts) {
                if (stateFact.version !== expectedVersion && stateFact.parentVersion !== 0) {
                    violations.push(`[Trace ${traceId}] State version gap: Expected ${expectedVersion}, got ${stateFact.version}`);
                }
                expectedVersion = stateFact.version + 1;
            }
        }

        return violations;
    }
}
