import { SimilarityScore } from '../models/SimilarityScore.mjs';
import { LRUCache } from 'lru-cache';

export class EIDComparator {
    constructor(customWeights = null) {
        this.weights = customWeights || EIDComparator.getDefaultWeights();
        if (!EIDComparator._ancestryCache) {
            EIDComparator._ancestryCache = new LRUCache({ max: 2000 });
        }
    }

    static getDefaultWeights() {
        return {
            tagMatch: 0.20,
            textSimilarity: 0.15,
            roleMatch: 0.05,
            ancestrySimilarity: 0.25,
            siblingMatch: 0.10,
            positionProximity: 0.05,
            landmarkMatch: 0.05,
            dataAttributeMatch: 0.15
        };
    }

    static compare(originalEID, resolvedEID, customWeights = null) {
        const comparator = new EIDComparator(customWeights);
        return comparator.compare(originalEID, resolvedEID);
    }

    compare(originalEID, resolvedEID) {
        if (!originalEID || !resolvedEID) {
            const emptyScore = new SimilarityScore({}, this.weights);
            emptyScore.addRejectionReason('MISSING_EID: One or both EIDs are null/undefined');
            return emptyScore;
        }

        // Fast path: hash matching
        if (originalEID.identityHash && resolvedEID.identityHash && originalEID.identityHash === resolvedEID.identityHash) {
            const dimensions = {
                tagMatch: 1.0,
                textSimilarity: 1.0,
                roleMatch: 1.0,
                ancestrySimilarity: 1.0,
                siblingMatch: 1.0,
                positionProximity: 1.0,
                landmarkMatch: 1.0,
                dataAttributeMatch: 1.0,
                // Map Phase 1 legacy dimensions for compatibility
                idMatch: 1.0,
                classMatch: 1.0,
                attributeMatch: 1.0,
                textMatch: 1.0,
                hierarchyMatch: 1.0,
                semanticMatch: 1.0,
                positionMatch: 1.0
            };
            const score = new SimilarityScore(dimensions, this.weights);
            score.overallScore = 0.95;
            return score;
        }

        // Compute individual dimensions
        const tagMatch = this._compareTag(originalEID, resolvedEID);
        const textSimilarity = this._compareText(originalEID, resolvedEID);
        const roleMatch = this._compareRole(originalEID, resolvedEID);
        const ancestrySimilarity = this._compareAncestry(originalEID, resolvedEID);
        const siblingMatch = this._compareSiblings(originalEID, resolvedEID);
        const positionProximity = this._comparePosition(originalEID, resolvedEID);
        const landmarkMatch = this._compareLandmark(originalEID, resolvedEID);
        const dataAttributeMatch = this._compareDataAttributes(originalEID, resolvedEID);

        // Map Phase 1 dimensions
        const idMatch = (originalEID.element?.id && resolvedEID.element?.id && originalEID.element.id === resolvedEID.element.id) ? 1.0 : 0.0;
        const classMatch = this._computeJaccard(originalEID.element?.classes || [], resolvedEID.element?.classes || []);
        const semanticMatch = (roleMatch + landmarkMatch) / 2.0;

        const dimensions = {
            tagMatch,
            textSimilarity,
            roleMatch,
            ancestrySimilarity,
            siblingMatch,
            positionProximity,
            landmarkMatch,
            dataAttributeMatch,
            // Phase 1 aliases
            idMatch,
            classMatch,
            attributeMatch: dataAttributeMatch,
            textMatch: textSimilarity,
            hierarchyMatch: ancestrySimilarity,
            semanticMatch,
            positionMatch: positionProximity
        };

        return new SimilarityScore(dimensions, this.weights);
    }

    _compareTag(a, b) {
        const tagA = (a.element?.tagName || '').toUpperCase();
        const tagB = (b.element?.tagName || '').toUpperCase();
        if (!tagA || !tagB) return 0.0;
        return tagA === tagB ? 1.0 : 0.0;
    }

    _compareText(a, b) {
        const strA = (a.text?.normalized || a.text?.exact || '').trim();
        const strB = (b.text?.normalized || b.text?.exact || '').trim();
        if (!strA && !strB) return 1.0;
        if (!strA || !strB) return 0.0;

        const sliceA = strA.substring(0, 50);
        const sliceB = strB.substring(0, 50);
        const dist = this._levenshtein(sliceA, sliceB);
        const maxLen = Math.max(sliceA.length, sliceB.length);
        return maxLen === 0 ? 1.0 : Math.max(0.0, 1.0 - (dist / maxLen));
    }

    _compareRole(a, b) {
        const roleA = (a.element?.role || '').toLowerCase().trim();
        const roleB = (b.element?.role || '').toLowerCase().trim();
        if (!roleA && !roleB) return 1.0;
        return roleA === roleB ? 1.0 : 0.0;
    }

    _compareAncestry(a, b) {
        // Phase 14: EID Comparison Caching
        const cacheKey = a.identityHash && b.identityHash ? `${a.identityHash}::${b.identityHash}` : null;
        if (cacheKey && EIDComparator._ancestryCache && EIDComparator._ancestryCache.has(cacheKey)) {
            return EIDComparator._ancestryCache.get(cacheKey);
        }

        const ancA = a.hierarchy?.ancestors || [];
        const ancB = b.hierarchy?.ancestors || [];
        const minLen = Math.min(ancA.length, ancB.length);
        const maxLen = Math.max(ancA.length, ancB.length);
        if (maxLen === 0) return 1.0;
        if (minLen === 0) return 0.5;

        let totalScore = 0.0;
        for (let i = 0; i < minLen; i++) {
            const nodeA = ancA[i] || {};
            const nodeB = ancB[i] || {};
            let levelScore = 0.0;
            if (nodeA.tagName && nodeB.tagName && nodeA.tagName.toUpperCase() === nodeB.tagName.toUpperCase()) {
                levelScore += 0.4;
            }
            if (nodeA.id && nodeB.id && nodeA.id === nodeB.id) {
                levelScore += 0.3;
            }
            const classJaccard = this._computeJaccard(nodeA.classes || [], nodeB.classes || []);
            levelScore += 0.2 * classJaccard;
            if (nodeA.role && nodeB.role && nodeA.role.toLowerCase() === nodeB.role.toLowerCase()) {
                levelScore += 0.1;
            }
            totalScore += Math.min(1.0, levelScore);
        }

        const avgScore = totalScore / minLen;
        const penalty = minLen / maxLen;
        const finalScore = avgScore * penalty;
        
        if (cacheKey && EIDComparator._ancestryCache) {
            EIDComparator._ancestryCache.set(cacheKey, finalScore);
        }
        
        return finalScore;
    }

    _compareSiblings(a, b) {
        const sibA = a.hierarchy?.siblings || [];
        const sibB = b.hierarchy?.siblings || [];
        if (sibA.length === 0 && sibB.length === 0) return 1.0;
        if (sibA.length === 0 || sibB.length === 0) return 0.5;

        let matches = 0.0;
        const count = Math.min(2, Math.max(sibA.length, sibB.length));
        for (let i = 0; i < Math.min(2, sibA.length, sibB.length); i++) {
            const sA = sibA[i] || {};
            const sB = sibB[i] || {};
            let pairScore = 0.0;
            if (sA.tagName && sB.tagName && sA.tagName.toUpperCase() === sB.tagName.toUpperCase()) {
                pairScore += 0.25;
            }
            const txtA = (sA.text || '').trim();
            const txtB = (sB.text || '').trim();
            if (txtA && txtB && txtA === txtB) {
                pairScore += 0.25;
            } else if (!txtA && !txtB) {
                pairScore += 0.25;
            }
            matches += pairScore;
        }
        return Math.min(1.0, matches);
    }

    _comparePosition(a, b) {
        const posA = a.position || {};
        const posB = b.position || {};

        // If normalized coordinates are present, compute Euclidean distance
        if (posA.normalizedX !== undefined && posB.normalizedX !== undefined && posA.normalizedY !== undefined && posB.normalizedY !== undefined) {
            const dx = Number(posA.normalizedX) - Number(posB.normalizedX);
            const dy = Number(posA.normalizedY) - Number(posB.normalizedY);
            const dist = Math.sqrt(dx * dx + dy * dy);
            return Math.max(0.0, 1.0 - (dist / 0.5));
        }

        // Fallback to viewportQuadrant match if coordinates missing
        if (posA.viewportQuadrant && posB.viewportQuadrant) {
            return posA.viewportQuadrant === posB.viewportQuadrant ? 1.0 : 0.5;
        }
        return 0.5; // Neutral fallback when position data is uninformative
    }

    _compareLandmark(a, b) {
        const lA = (a.semantics?.landmark || '').toLowerCase().trim();
        const lB = (b.semantics?.landmark || '').toLowerCase().trim();
        if (!lA && !lB) return 1.0;
        return lA === lB ? 1.0 : 0.0;
    }

    _compareDataAttributes(a, b) {
        const getAttrMap = (eid) => {
            const el = eid?.element || {};
            const map = { ...el.dataAttributes, ...el.ariaAttributes };
            if (el.id) map.id = String(el.id);
            if (el.name) map.name = String(el.name);
            if (el.type) map.type = String(el.type);
            if (el.value) map.value = String(el.value);
            if (el.href) map.href = String(el.href);
            if (el.classes && el.classes.length > 0) map.class = el.classes.join(' ');
            return map;
        };

        const attrsA = getAttrMap(a);
        const attrsB = getAttrMap(b);
        const keysA = Object.keys(attrsA);
        const keysB = Object.keys(attrsB);

        if (keysA.length === 0 && keysB.length === 0) return 1.0;
        if (keysA.length === 0 || keysB.length === 0) return 0.0;

        const keyJaccard = this._computeJaccard(keysA, keysB);
        
        const setB = new Set(keysB);
        const matchingKeys = keysA.filter(k => setB.has(k));
        let valueMatchSum = 0.0;
        for (const k of matchingKeys) {
            const vA = String(attrsA[k] || '');
            const vB = String(attrsB[k] || '');
            if (vA === vB) {
                valueMatchSum += 1.0;
            } else {
                const dist = this._levenshtein(vA, vB);
                const maxLen = Math.max(vA.length, vB.length);
                valueMatchSum += maxLen === 0 ? 1.0 : Math.max(0.0, 1.0 - (dist / maxLen));
            }
        }

        const valueMatch = matchingKeys.length > 0 ? (valueMatchSum / matchingKeys.length) : 0.0;
        return 0.6 * keyJaccard + 0.4 * valueMatch;
    }

    _computeJaccard(arrA, arrB) {
        if (!arrA || !arrB) return 0.0;
        if (arrA.length === 0 && arrB.length === 0) return 1.0;
        if (arrA.length === 0 || arrB.length === 0) return 0.0;

        const setA = new Set(arrA);
        const setB = new Set(arrB);
        let intersection = 0;
        for (const item of setA) {
            if (setB.has(item)) intersection++;
        }
        const union = new Set([...arrA, ...arrB]).size;
        return union === 0 ? 1.0 : intersection / union;
    }

    _levenshtein(s1, s2) {
        const len1 = s1.length;
        const len2 = s2.length;
        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[len1][len2];
    }
}
export default EIDComparator;
