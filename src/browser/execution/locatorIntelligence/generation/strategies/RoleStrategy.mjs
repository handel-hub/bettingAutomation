export class RoleStrategy {
    static generate(el, features) {
        if (features.role) {
            let loc = 'role=' + CSS.escape(features.role);
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
