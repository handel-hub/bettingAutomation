export class ComplexityRule extends RankingRule {
    constructor() {
        super('ComplexityRule');
    }

    evaluate(candidate, context) {
        let complexityScore = 0;
        const loc = candidate.locator || '';
        
        // Strip out anything inside quotes to avoid false counting
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        // Length penalty
        if (loc.length > 100) complexityScore += 20;
        else if (loc.length > 60) complexityScore += 10;
        else if (loc.length > 40) complexityScore += 5;
        
        // Descendant combinators (spaces or >)
        const combinators = (strippedLoc.match(/\s+>|\s+/g) || []).length;
        complexityScore += combinators * 5;
        
        // Wildcard selectors (*)
        const wildcards = (strippedLoc.match(/\*/g) || []).length;
        complexityScore += wildcards * 15;
        
        // Pseudo selectors heavily impacting layout search (e.g. :nth-child, :nth-of-type, :has)
        const structuralPseudos = (strippedLoc.match(/:nth|:has/g) || []).length;
        complexityScore += structuralPseudos * 15;
        
        // Convert to multiplier (Higher complexity = lower multiplier)
        let multiplier = 1.0;
        if (complexityScore >= 40) multiplier = 0.5;
        else if (complexityScore >= 25) multiplier = 0.7;
        else if (complexityScore >= 15) multiplier = 0.85;
        else if (complexityScore >= 5) multiplier = 0.95;
        
        return { multiplier };
    }
}
