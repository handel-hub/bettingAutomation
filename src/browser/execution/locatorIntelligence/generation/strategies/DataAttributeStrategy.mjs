export class DataAttributeStrategy {
    static generate(el, features) {
        let candidates = [];
        for (const [attr, val] of Object.entries(features.dataOps)) {
            candidates.push(new LocatorCandidate({
                strategy: 'DataAttributeStrategy',
                locator: '[' + attr + '="' + CSS.escape(val) + '"]',
                features,
                reason: 'Matches ' + attr
            }));
        }
        return candidates;
    }
}
