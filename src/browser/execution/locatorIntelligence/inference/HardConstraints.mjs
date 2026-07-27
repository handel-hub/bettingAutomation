export class HardConstraints {
    static evaluate(candidate, identityDoc) {
        if (!candidate) {
            return { passed: false, reason: 'NULL_CANDIDATE' };
        }
        if (!identityDoc) {
            return { passed: true };
        }

        // Constraint 1: Visibility
        // If Master element was explicitly visible, eliminate candidates that are explicitly invisible
        if (identityDoc.isVisible !== false && candidate.isVisible === false) {
            return { passed: false, reason: 'INVISIBLE_ELEMENT' };
        }

        // Constraint 2: Disabled state
        // If Master element was enabled (isDisabled === false), eliminate disabled candidates
        if (identityDoc.isDisabled === false && candidate.isDisabled === true) {
            return { passed: false, reason: 'DISABLED_MISMATCH' };
        }

        // Constraint 3: Tag Family Mismatch
        const masterTag = (identityDoc.tagName || identityDoc.element?.tagName || '').toUpperCase();
        const candTag = (candidate.tagName || candidate.features?.tagName || candidate.node?.tagName || candidate.node?.nodeName || '').toUpperCase();
        
        if (masterTag && candTag && masterTag !== candTag) {
            // Allow compatible families (e.g., BUTTON and INPUT[type=submit], or A and interactive ROLE)
            const isMasterBtn = masterTag === 'BUTTON' || (masterTag === 'INPUT' && identityDoc.elementType && ['submit', 'button', 'reset'].includes(identityDoc.elementType.toLowerCase()));
            const isCandBtn = candTag === 'BUTTON' || candidate.ariaRole === 'button' || candidate.features?.role === 'button' || (candTag === 'INPUT' && candidate.node?.getAttribute?.('type') && ['submit', 'button', 'reset'].includes(candidate.node.getAttribute('type').toLowerCase()));
            
            const isMasterLink = masterTag === 'A' || identityDoc.ariaRole === 'link';
            const isCandLink = candTag === 'A' || candidate.ariaRole === 'link' || candidate.features?.role === 'link';

            if ((isMasterBtn && !isCandBtn) && !isCandLink) {
                return { passed: false, reason: 'TAG_FAMILY_MISMATCH_BUTTON' };
            }
            if ((isMasterLink && !isCandLink) && !isCandBtn) {
                return { passed: false, reason: 'TAG_FAMILY_MISMATCH_LINK' };
            }
            if (masterTag === 'SELECT' && candTag !== 'SELECT' && candidate.ariaRole !== 'combobox') {
                return { passed: false, reason: 'TAG_FAMILY_MISMATCH_SELECT' };
            }
        }

        return { passed: true };
    }

    static filter(candidates, identityDoc) {
        if (!Array.isArray(candidates)) return { passing: [], eliminated: [] };
        const passing = [];
        const eliminated = [];

        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            const res = HardConstraints.evaluate(cand, identityDoc);
            if (res.passed) {
                passing.push(cand);
            } else {
                eliminated.push({ candidate: cand, reason: res.reason });
            }
        }

        return { passing, eliminated };
    }
}
export default HardConstraints;
