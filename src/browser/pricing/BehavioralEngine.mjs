/**
 * Behavioral Engine for the Autonomous Pricing Edge-Compute Subsystem.
 * Selects a single candidate stake from a mathematically valid set
 * using a deterministic waterfall of user-preferred behaviors.
 */

export const BehaviorFunctions = {
    /**
     * Prefers round currency units. 
     * e.g., if currency increment is smaller, it prefers values ending in .00
     */
    PREFER_ROUND: (candidates) => {
        const preferred = candidates.filter(c => c % 1000 === 0);
        return preferred.length > 0 ? preferred : candidates;
    },
    /**
     * Prefers the absolute minimum valid stake
     */
    PREFER_MIN: (candidates) => {
        return [Math.min(...candidates)];
    },
    /**
     * Prefers the absolute maximum valid stake
     */
    PREFER_MAX: (candidates) => {
        return [Math.max(...candidates)];
    }
};

/**
 * Applies the behavioral waterfall to the candidate set.
 * 
 * @param {number[]} candidates - Array of mathematically valid stakes (in cents)
 * @param {string[]} behaviorNames - Array of behavioral function names (e.g. ['PREFER_ROUND', 'PREFER_MAX'])
 * @returns {number|null} The single selected stake, or null if input was empty.
 */
export function applyBehavior(candidates, behaviorNames) {
    if (!candidates || candidates.length === 0) {
        return null;
    }

    let currentSet = [...candidates];
    
    // Fallback if no behaviors are provided
    if (!behaviorNames || behaviorNames.length === 0) {
        return Math.min(...currentSet);
    }

    for (const name of behaviorNames) {
        if (currentSet.length <= 1) {
            break; // Optimization: Absolute certainty reached
        }
        
        const fn = BehaviorFunctions[name];
        if (fn) {
            const nextSet = fn(currentSet);
            // Guard: A behavioral function may never eliminate all candidates.
            if (nextSet && nextSet.length > 0) {
                currentSet = nextSet;
            }
        }
    }
    
    // Deterministic Tie-Breaker: Always return the lowest numerical value remaining.
    return Math.min(...currentSet);
}
