import { LocatorCandidate } from '../../models/LocatorCandidate.mjs';

export class RoleStrategy {
    static generate(el, features) {
        if (features.role) {
            const escapedRole = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(features.role) : features.role;
            let loc = 'role=' + escapedRole;
            if (features.name && features.name.length < 50) {
                loc += '[name="' + features.name.replace(/"/g, '\\"') + '"]';
            }
            return [new LocatorCandidate({
                strategy: 'RoleStrategy',
                locator: loc,
                features,
                reason: 'Has explicit role'
            })];
        }
        return [];
    }
}
