import { HardConstraints } from './HardConstraints.mjs';
import { EvidenceComputer } from './EvidenceComputer.mjs';
import { AnchorResolver } from './AnchorResolver.mjs';
import { EntropyScaler } from './EntropyScaler.mjs';

export class InferenceEngine {
    constructor(customWeights = {}) {
        this.weights = customWeights;
    }

    infer(identityDoc, candidates, spatialCallback = null, docRoot = null) {
        if (!identityDoc || !Array.isArray(candidates) || candidates.length === 0) {
            return {
                outcome: 'NO_MATCH',
                candidate: null,
                confidence: 0,
                trace: { reason: 'EMPTY_INPUTS', identityDoc, candidateCount: candidates?.length || 0 }
            };
        }

        // Step 1: Hard Constraint Elimination
        const { passing, eliminated } = HardConstraints.filter(candidates, identityDoc);
        if (passing.length === 0) {
            return {
                outcome: 'NO_MATCH',
                candidate: null,
                confidence: 0,
                trace: { reason: 'ALL_CANDIDATES_ELIMINATED', eliminated }
            };
        }

        // Step 2: Soft Scoring
        const scoredCandidates = [];
        for (let i = 0; i < passing.length; i++) {
            const cand = passing[i];
            const scoreObj = EvidenceComputer.computeScore(cand, identityDoc, this.weights);
            scoredCandidates.push({
                candidate: cand,
                score: scoreObj.totalScore,
                dimensions: scoreObj.dimensions
            });
        }

        // Sort descending by score
        scoredCandidates.sort((a, b) => b.score - a.score);

        // Attach scores to candidate objects for pipeline interoperability
        for (const item of scoredCandidates) {
            item.candidate.ranking = item.candidate.ranking || {};
            item.candidate.ranking.finalScore = item.score;
            item.candidate.ranking.scoreBreakdown = item.dimensions;
            item.candidate.scoringVector = item.dimensions;
        }
        candidates.sort((a, b) => (b.ranking?.finalScore || 0) - (a.ranking?.finalScore || 0));

        const top = scoredCandidates[0];
        if (!top || top.score < 0.05) {
            return {
                outcome: 'NO_MATCH',
                candidate: null,
                confidence: 0,
                trace: { reason: 'LOW_TOP_SCORE', topScore: top ? top.score : 0, eliminated, scoredCandidates }
            };
        }

        // Step 3: Ambiguity Check
        if (scoredCandidates.length > 1) {
            const second = scoredCandidates[1];
            const ratio = top.score / Math.max(second.score, 0.0001);
            if (ratio < 1.5 && (top.score - second.score) < 0.15) {
                // Ambiguous! Attempt Anchor Resolution
                const tied = scoredCandidates.filter(item => (top.score / Math.max(item.score, 0.0001)) < 1.5 && (top.score - item.score) < 0.15);
                const anchorRes = AnchorResolver.resolve(tied, identityDoc, spatialCallback, docRoot);
                if (anchorRes.isResolved && anchorRes.winner) {
                    const winItem = scoredCandidates.find(item => item.candidate === anchorRes.winner) || { candidate: anchorRes.winner, score: top.score };
                    const finalConfidence = EntropyScaler.scale(winItem.score, identityDoc);
                    return {
                        outcome: 'MATCH',
                        candidate: winItem.candidate,
                        confidence: finalConfidence,
                        trace: {
                            reason: 'MATCH_VIA_ANCHOR_RESOLUTION',
                            rawScore: winItem.score,
                            entropyScale: EntropyScaler.computeEntropy(identityDoc),
                            anchorTrace: anchorRes.trace,
                            eliminated,
                            scoredCandidates
                        }
                    };
                } else {
                    return {
                        outcome: 'AMBIGUOUS',
                        candidates: tied.map(t => t.candidate),
                        confidence: EntropyScaler.scale(top.score, identityDoc),
                        trace: {
                            reason: 'AMBIGUOUS_TIE_UNRESOLVED',
                            topScore: top.score,
                            secondScore: second.score,
                            ratio,
                            anchorTrace: anchorRes.trace,
                            eliminated,
                            scoredCandidates
                        }
                    };
                }
            }
        }

        // Unambiguous Match
        const finalConfidence = EntropyScaler.scale(top.score, identityDoc);
        return {
            outcome: 'MATCH',
            candidate: top.candidate,
            confidence: finalConfidence,
            trace: {
                reason: 'UNAMBIGUOUS_MATCH',
                rawScore: top.score,
                entropyScale: EntropyScaler.computeEntropy(identityDoc),
                eliminated,
                scoredCandidates
            }
        };
    }
}
export default InferenceEngine;
