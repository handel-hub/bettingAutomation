export class AnchorResolver {
    static resolve(tiedCandidates, identityDoc, spatialCallback = null, docRoot = null) {
        if (!Array.isArray(tiedCandidates) || tiedCandidates.length < 2) {
            return { winner: tiedCandidates?.[0]?.candidate || tiedCandidates?.[0] || null, isResolved: false, trace: { reason: 'INSUFFICIENT_CANDIDATES' } };
        }

        const anchor = identityDoc?.anchor || identityDoc?.relational?.anchor || identityDoc?.anchorDescriptor || null;
        if (!anchor) {
            return { winner: null, isResolved: false, trace: { reason: 'NO_MASTER_ANCHOR' } };
        }

        const doc = docRoot || (typeof document !== 'undefined' ? document : null);
        let slaveAnchorNodes = [];

        if (doc && typeof doc.querySelectorAll === 'function') {
            if (anchor.cssSelector) {
                try {
                    const matches = doc.querySelectorAll(anchor.cssSelector);
                    for (let i = 0; i < matches.length; i++) slaveAnchorNodes.push(matches[i]);
                } catch (e) {}
            }
            if (slaveAnchorNodes.length === 0 && anchor.textContent) {
                try {
                    const all = doc.querySelectorAll('*');
                    for (let i = 0; i < all.length; i++) {
                        if ((all[i].textContent || '').trim() === anchor.textContent.trim()) {
                            slaveAnchorNodes.push(all[i]);
                        }
                    }
                } catch (e) {}
            }
        }

        if (slaveAnchorNodes.length === 0) {
            return { winner: null, isResolved: false, trace: { reason: 'SLAVE_ANCHOR_NOT_FOUND' } };
        }

        const slaveAnchor = slaveAnchorNodes[0];
        const getBox = (node) => {
            if (spatialCallback && typeof spatialCallback === 'function') {
                const res = spatialCallback(node);
                if (res) return res;
            }
            if (node && typeof node.getBoundingClientRect === 'function') {
                return node.getBoundingClientRect();
            }
            if (node && node._rect) {
                return node._rect;
            }
            return { x: 0, y: 0, width: 0, height: 0 };
        };

        const anchorBox = getBox(slaveAnchor);
        const anchorCenter = { x: anchorBox.x + (anchorBox.width || 0) / 2, y: anchorBox.y + (anchorBox.height || 0) / 2 };
        const masterVec = anchor.spatialVector || { dx: anchor.dx || 0, dy: anchor.dy || 0 };

        let bestCand = null;
        let bestScore = -Infinity;
        let secondBestScore = -Infinity;
        const candidateScores = [];

        for (const item of tiedCandidates) {
            const cand = item.candidate || item;
            const candBox = cand.approximateBounds || getBox(cand.node);
            const candCenter = { x: (candBox.x || 0) + (candBox.width || candBox.w || 0) / 2, y: (candBox.y || 0) + (candBox.height || candBox.h || 0) / 2 };

            const slaveVec = {
                dx: candCenter.x - anchorCenter.x,
                dy: candCenter.y - anchorCenter.y
            };

            const edgeDistanceDelta = Math.abs((anchor.edgeDistance || 0) - (cand.edgeDistance || cand.node?._edgeDistance || 0));
            const spatialDelta = Math.sqrt(Math.pow(slaveVec.dx - masterVec.dx, 2) + Math.pow(slaveVec.dy - masterVec.dy, 2));
            
            // Formula from §1.3.4: anchorScore = 1.0 / (1.0 + edgeDistanceDelta + spatialDelta/100)
            const anchorScore = 1.0 / (1.0 + edgeDistanceDelta + spatialDelta / 100);
            candidateScores.push({ candidate: cand, anchorScore, edgeDistanceDelta, spatialDelta, slaveVec });

            if (anchorScore > bestScore) {
                secondBestScore = bestScore;
                bestScore = anchorScore;
                bestCand = cand;
            } else if (anchorScore > secondBestScore) {
                secondBestScore = anchorScore;
            }
        }

        const isResolved = bestCand !== null && (bestScore > secondBestScore || tiedCandidates.length === 2);

        return {
            winner: isResolved ? bestCand : null,
            isResolved,
            trace: {
                reason: isResolved ? 'ANCHOR_RESOLVED_TIE' : 'ANCHOR_RESOLUTION_AMBIGUOUS',
                bestScore,
                secondBestScore,
                candidateScores
            }
        };
    }
}
export default AnchorResolver;
