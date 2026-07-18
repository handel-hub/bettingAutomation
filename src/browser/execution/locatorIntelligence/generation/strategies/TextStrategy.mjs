export class TextStrategy {
    static generate(el, features) {
        if (features.text && features.text.length > 0 && features.text.length < 50) {
            return [new LocatorCandidate({
                strategy: 'TextStrategy',
                locator: 'text="' + features.text.replace(/"/g, '\\"') + '"',
                features,
                reason: 'Visible short text'
            })];
        }
        return [];
    }
}
