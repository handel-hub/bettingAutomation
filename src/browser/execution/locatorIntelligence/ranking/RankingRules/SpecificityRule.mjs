export class SpecificityRule extends RankingRule {
    constructor() {
        super('SpecificityRule');
    }

    evaluate(candidate, context) {
        let specificityScore = 0;
        const loc = candidate.locator || '';
        
        // Very rough specificity heuristic for Playwright/CSS selectors
        // We strip out anything inside quotes to avoid false counting
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        // Count ID selectors (#id)
        const ids = (strippedLoc.match(/#/g) || []).length;
        specificityScore += ids * 100;
        
        // Count class selectors (.class), attributes ([attr]), and pseudo-classes (:hover)
        const classes = (strippedLoc.match(/\./g) || []).length;
        const attrs = (strippedLoc.match(/\[/g) || []).length;
        const pseudos = (strippedLoc.match(/:[a-zA-Z-]/g) || []).length; // avoiding counting "text="
        specificityScore += (classes + attrs + pseudos) * 10;
        
        // Count tag names (very rough: words at start or following space/combinator that aren't engine prefixes)
        const tags = (strippedLoc.match(/(^|[\s>+~])([a-zA-Z0-9_-]+)(?=[#\.\[:]|\s|$)/g) || [])
                     .filter(t => !['text', 'role', 'css', 'xpath'].includes(t.trim())).length;
        specificityScore += tags * 1;
        
        // Playwright specific engine boosts
        if (loc.startsWith('role=')) specificityScore += 15;
        if (loc.startsWith('text=') || loc.startsWith('internal:text=')) specificityScore += 5;
        
        // Convert to multiplier
        let multiplier = 1.0;
        if (specificityScore >= 100) multiplier = 1.3;
        else if (specificityScore >= 30) multiplier = 1.2;
        else if (specificityScore >= 20) multiplier = 1.15;
        else if (specificityScore >= 10) multiplier = 1.1;
        else if (specificityScore > 0) multiplier = 1.05;
        
        return { multiplier };
    }
}
