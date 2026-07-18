export class SemanticClassStrategy {
    static generate(el, features) {
        if (!features.className) return [];
        const classes = features.className.trim().split(/\s+/).filter(c => {
            if (/^[a-z0-9]{5,8}$/i.test(c)) return false; 
            if (/^(p|m|w|h|text|bg|flex|items|justify|hover|focus|active)-/.test(c)) return false; 
            if (c.includes(':')) return false; 
            return true;
        });
        if (classes.length > 0) {
            const selector = features.tagName + '.' + classes.map(c => CSS.escape(c)).join('.');
            return [new LocatorCandidate({
                strategy: 'SemanticClassStrategy',
                locator: selector,
                features,
                reason: 'Semantic class combination'
            })];
        }
        return [];
    }
}
