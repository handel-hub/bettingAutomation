import { RankingRule } from '../RankingRule.mjs';

export class NormalizedSpecificityRule extends RankingRule {
    constructor() {
        super('NormalizedSpecificityRule');
    }

    evaluate(candidate, context) {
        let specificityScore = 0;
        const loc = candidate.locator || '';
        
        const strippedLoc = loc.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '');
        
        const ids = (strippedLoc.match(/#/g) || []).length;
        specificityScore += ids * 100;
        
        const classes = (strippedLoc.match(/\./g) || []).length;
        const attrs = (strippedLoc.match(/\[/g) || []).length;
        const pseudos = (strippedLoc.match(/:[a-zA-Z-]/g) || []).length;
        specificityScore += (classes + attrs + pseudos) * 10;
        
        const tags = (strippedLoc.match(/(^|[\s>+~])([a-zA-Z0-9_-]+)(?=[#\.\[:]|\s|$)/g) || [])
                     .filter(t => !['text', 'role', 'css', 'xpath'].includes(t.trim())).length;
        specificityScore += tags * 1;
        
        if (loc.startsWith('role=')) specificityScore += 15;
        if (loc.startsWith('text=') || loc.startsWith('internal:text=')) specificityScore += 5;
        
        let score = 0.3;
        if (specificityScore >= 100) score = 1.0;
        else if (specificityScore >= 30) score = 0.8;
        else if (specificityScore >= 20) score = 0.7;
        else if (specificityScore >= 10) score = 0.6;
        else if (specificityScore > 0) score = 0.5;
        
        return {
            dimension: 'specificity',
            score,
            reason: `Specificity score ${specificityScore} mapped to normalized score ${score}`
        };
    }
}
export default NormalizedSpecificityRule;
