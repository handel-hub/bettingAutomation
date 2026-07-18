export class AriaStrategy {
    static generate(el, features) {
        if (features.ariaLabel) {
            return [new LocatorCandidate({
                strategy: 'AriaStrategy',
                locator: '[aria-label="' + CSS.escape(features.ariaLabel) + '"]',
                features,
                reason: 'Has aria-label'
            })];
        }
        return [];
    }
}
