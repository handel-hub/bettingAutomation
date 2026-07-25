import { LocatorCandidate } from '../../models/LocatorCandidate.mjs';

export class AriaStrategy {
    static generate(el, features) {
        if (features.ariaLabel) {
            const escapedVal = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(features.ariaLabel) : features.ariaLabel;
            return [new LocatorCandidate({
                strategy: 'AriaStrategy',
                locator: '[aria-label="' + escapedVal + '"]',
                features,
                reason: 'Has aria-label'
            })];
        }
        return [];
    }
}
