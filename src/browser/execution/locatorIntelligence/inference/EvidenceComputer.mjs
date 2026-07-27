export class EvidenceComputer {
    static computeScore(candidate, identityDoc, customWeights = {}) {
        const floor = 0.01;
        const weights = {
            text: customWeights.text || 1.0,
            role: customWeights.role || 1.0,
            testId: customWeights.testId || 1.5, // Stronger weight for data-testid
            tag: customWeights.tag || 0.8,
            memory: customWeights.memory || 1.2
        };

        const dimensions = {
            text: EvidenceComputer._computeTextScore(candidate, identityDoc, floor),
            role: EvidenceComputer._computeRoleScore(candidate, identityDoc, floor),
            testId: EvidenceComputer._computeTestIdScore(candidate, identityDoc, floor),
            tag: EvidenceComputer._computeTagScore(candidate, identityDoc, floor),
            memory: candidate.isMemoryHit ? Math.max(candidate.memoryConfidence || 1.0, floor) : 1.0
        };

        let totalScore = 1.0;
        for (const [key, rawScore] of Object.entries(dimensions)) {
            const w = weights[key] || 1.0;
            const clampedScore = Math.max(rawScore, floor);
            totalScore *= Math.pow(clampedScore, w);
        }

        totalScore = Math.max(Math.min(totalScore, 1.0), floor);

        return {
            totalScore,
            dimensions,
            weights
        };
    }

    static _computeTextScore(candidate, identityDoc, floor) {
        const targetText = (identityDoc.textContent || identityDoc.lexical?.normalizedText || identityDoc.text?.normalized || identityDoc.text?.exact || '').trim().toLowerCase();
        let candText = (candidate.textContent || candidate.features?.text?.normalized || candidate.features?.text?.exact || candidate.node?._text || candidate.node?.textContent || '').trim().toLowerCase();

        if (!candText && candidate.locator) {
            const match = candidate.locator.match(/(?:has-)?text=['"]?([^'"]+)['"]?/i);
            if (match) candText = match[1].trim().toLowerCase();
        }

        if (!targetText && !candText) return 1.0;
        if (!targetText || !candText) return floor;
        if (targetText === candText) return 1.0;

        if (candText.includes(targetText) || targetText.includes(candText)) {
            const ratio = Math.min(targetText.length, candText.length) / Math.max(targetText.length, candText.length);
            return Math.max(0.5 + 0.5 * ratio, floor);
        }

        // Token Jaccard similarity
        const targetTokens = new Set(targetText.split(/\s+/));
        const candTokens = new Set(candText.split(/\s+/));
        let intersection = 0;
        for (const t of targetTokens) {
            if (candTokens.has(t)) intersection++;
        }
        const union = new Set([...targetTokens, ...candTokens]).size;
        if (union === 0) return 1.0;
        const jaccard = intersection / union;
        return jaccard > 0 ? Math.max(jaccard, floor) : floor;
    }

    static _computeRoleScore(candidate, identityDoc, floor) {
        const targetRole = (identityDoc.ariaRole || identityDoc.semantic?.ariaRole || '').toLowerCase();
        let candRole = (candidate.ariaRole || candidate.features?.role || candidate.features?.attributes?.role || candidate.node?.role || candidate.node?._attributes?.get?.('role') || '').toLowerCase();

        if (!candRole && candidate.locator) {
            const match = candidate.locator.match(/role=['"]?([^'"]+)['"]?/i);
            if (match) candRole = match[1].trim().toLowerCase();
        }

        if (!targetRole && !candRole) return 1.0;
        if (!targetRole || !candRole) return 0.9; // Neutral slight discount if one has role and other doesn't
        if (targetRole === candRole) return 1.0;
        return floor;
    }

    static _computeTestIdScore(candidate, identityDoc, floor) {
        const targetId = identityDoc.dataTestId || identityDoc.semantic?.dataTestId || identityDoc.element?.dataAttributes?.['data-testid'] || '';
        let candId = candidate.dataTestId || candidate.features?.attributes?.['data-testid'] || candidate.node?._attributes?.get?.('data-testid') || '';

        if (!candId && candidate.locator) {
            const match = candidate.locator.match(/data-testid=['"]?([^'"]+)['"]?/i);
            if (match) candId = match[1].trim();
        }

        if (!targetId && !candId) return 1.0;
        if (!targetId || !candId) return 0.8;
        if (targetId === candId) return 1.0;
        return floor;
    }

    static _computeTagScore(candidate, identityDoc, floor) {
        const targetTag = (identityDoc.tagName || identityDoc.element?.tagName || '').toUpperCase();
        const candTag = (candidate.tagName || candidate.features?.tagName || candidate.node?.tagName || candidate.node?.nodeName || '').toUpperCase();

        if (!targetTag && !candTag) return 1.0;
        if (!targetTag || !candTag) return 1.0; // Selector might not specify tag name
        if (targetTag === candTag) return 1.0;
        return floor;
    }
}
export default EvidenceComputer;
