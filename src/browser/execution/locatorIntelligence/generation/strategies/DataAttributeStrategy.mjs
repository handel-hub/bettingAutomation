import { LocatorCandidate } from '../../models/LocatorCandidate.mjs';

export class DataAttributeStrategy {
    static generate(el, features) {
        let candidates = [];
        for (const [attr, val] of Object.entries(features.dataOps)) {
            const escapedVal = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(val) : val;
            candidates.push(new LocatorCandidate({
                strategy: 'DataAttributeStrategy',
                locator: '[' + attr + '="' + escapedVal + '"]',
                features,
                reason: 'Matches ' + attr
            }));
        }
        return candidates;
    }
}
