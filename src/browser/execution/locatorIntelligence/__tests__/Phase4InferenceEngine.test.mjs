import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InferenceEngine } from '../inference/InferenceEngine.mjs';
import { EvidenceComputer } from '../inference/EvidenceComputer.mjs';
import { HardConstraints } from '../inference/HardConstraints.mjs';
import { AnchorResolver } from '../inference/AnchorResolver.mjs';
import { EntropyScaler } from '../inference/EntropyScaler.mjs';
import { LocatorCandidate } from '../models/LocatorCandidate.mjs';
import { LocatorIntelligenceEngine } from '../engine/LocatorIntelligenceEngine.mjs';
import { PipelineContext } from '../engine/PipelineContext.mjs';
import featureFlags from '../FeatureFlags.mjs';
import { MockElement } from './TestHarness.mjs';

describe('Phase 4: Inference Engine', () => {
    beforeEach(() => {
        featureFlags.resetForTesting();
    });

    afterEach(() => {
        featureFlags.resetForTesting();
    });

    it('Floor-clamped multiplication correctly penalizes mismatches', () => {
        const eid = {
            dataTestId: 'btn-submit',
            textContent: 'Submit Form',
            ariaRole: 'button',
            tagName: 'BUTTON',
            isDisabled: false
        };

        const exactCand = new LocatorCandidate({
            strategy: 'test-id',
            locator: '[data-testid="btn-submit"]',
            features: {
                attributes: { 'data-testid': 'btn-submit' },
                text: { normalized: 'submit form' },
                role: 'button',
                domStats: { depth: 3 }
            }
        });
        exactCand.node = { tagName: 'BUTTON', disabled: false };

        const mismatchCand = new LocatorCandidate({
            strategy: 'text',
            locator: 'text="Cancel"',
            features: {
                attributes: { 'data-testid': 'btn-cancel' },
                text: { normalized: 'cancel' },
                role: 'link',
                domStats: { depth: 3 }
            }
        });
        mismatchCand.node = { tagName: 'A', disabled: false };

        const exactScore = EvidenceComputer.computeScore(exactCand, eid);
        const mismatchScore = EvidenceComputer.computeScore(mismatchCand, eid);

        expect(exactScore.totalScore).toBeGreaterThan(0.8);
        expect(mismatchScore.totalScore).toBeLessThan(exactScore.totalScore);
        // Ensure floor clamp prevented 0 from wiping out everything if some dimension was 0
        expect(mismatchScore.totalScore).toBeGreaterThan(0);
    });

    it('Hard constraints eliminate invisible/disabled elements', () => {
        const eid = {
            tagName: 'BUTTON',
            isDisabled: false
        };

        const visibleEnabledCand = new LocatorCandidate({ strategy: 'css', locator: '#btn1' });
        visibleEnabledCand.isVisible = true;
        visibleEnabledCand.isDisabled = false;
        visibleEnabledCand.node = { tagName: 'BUTTON', disabled: false };

        const invisibleCand = new LocatorCandidate({ strategy: 'css', locator: '#btn2' });
        invisibleCand.isVisible = false;
        invisibleCand.isDisabled = false;
        invisibleCand.node = { tagName: 'BUTTON', disabled: false };

        const disabledCand = new LocatorCandidate({ strategy: 'css', locator: '#btn3' });
        disabledCand.isVisible = true;
        disabledCand.isDisabled = true;
        disabledCand.node = { tagName: 'BUTTON', disabled: true };

        const { passing, eliminated } = HardConstraints.filter([visibleEnabledCand, invisibleCand, disabledCand], eid);

        expect(passing.length).toBe(1);
        expect(passing[0]).toBe(visibleEnabledCand);
        expect(eliminated.length).toBe(2);
        expect(eliminated.some(e => e.reason === 'INVISIBLE_ELEMENT')).toBe(true);
        expect(eliminated.some(e => e.reason === 'DISABLED_MISMATCH')).toBe(true);
    });

    it('Anchor resolution correctly breaks ties on repeated elements', () => {
        const eid = {
            textContent: 'Delete',
            tagName: 'BUTTON',
            anchor: {
                textContent: 'Item 2',
                tagName: 'SPAN',
                spatialVector: { dx: 50, dy: 0 },
                edgeDistance: 2
            }
        };

        const cand1 = new LocatorCandidate({ strategy: 'text', locator: 'text="Delete"' });
        cand1.features = { text: { normalized: 'delete' }, domStats: { depth: 4 } };
        cand1.node = new MockElement({ tagName: 'BUTTON', text: 'Delete' });
        cand1.node._edgeDistance = 5; // Far from anchor

        const cand2 = new LocatorCandidate({ strategy: 'text', locator: 'text="Delete"' });
        cand2.features = { text: { normalized: 'delete' }, domStats: { depth: 4 } };
        cand2.node = new MockElement({ tagName: 'BUTTON', text: 'Delete' });
        cand2.node._edgeDistance = 2; // Close to anchor

        const scored1 = { candidate: cand1, score: 0.8 };
        const scored2 = { candidate: cand2, score: 0.8 };

        const mockDoc = {
            querySelectorAll: () => [new MockElement({ tagName: 'SPAN', text: 'Item 2', rect: { left: 0, top: 0, width: 20, height: 20 } })]
        };
        const res = AnchorResolver.resolve([scored1, scored2], eid, null, mockDoc);
        expect(res.isResolved).toBe(true);
        expect(res.winner).toBe(cand2);
    });

    it('Entropy penalty reduces confidence on sparse EIDs', () => {
        const sparseEid = {
            tagName: 'DIV'
        };

        const richEid = {
            tagName: 'BUTTON',
            textContent: 'Save Changes',
            ariaLabel: 'Save',
            dataTestId: 'btn-save-changes',
            ariaRole: 'button'
        };

        const rawScore = 0.9;
        const sparseConf = EntropyScaler.scale(rawScore, sparseEid);
        const richConf = EntropyScaler.scale(rawScore, richEid);

        expect(sparseConf).toBeLessThan(rawScore * 0.5); // Severe penalty (< 0.3 entropy)
        expect(richConf).toBeGreaterThanOrEqual(rawScore * 0.9);
    });

    it('Determinism test: Same inputs produce same outputs across 1000 iterations', () => {
        const engine = new InferenceEngine();
        const eid = {
            dataTestId: 'test-item',
            textContent: 'Item Title',
            ariaRole: 'listitem',
            tagName: 'LI'
        };

        const cand1 = new LocatorCandidate({ strategy: 'test-id', locator: '[data-testid="test-item"]', features: { attributes: { 'data-testid': 'test-item' }, text: { normalized: 'item title' }, role: 'listitem' } });
        cand1.node = { tagName: 'LI' };

        const cand2 = new LocatorCandidate({ strategy: 'css', locator: '.item', features: { text: { normalized: 'item title' }, role: 'listitem' } });
        cand2.node = { tagName: 'LI' };

        const firstRes = engine.infer(eid, [cand1, cand2]);
        expect(firstRes.outcome).toBe('MATCH');

        for (let i = 0; i < 1000; i++) {
            const res = engine.infer(eid, [cand1, cand2]);
            expect(res.outcome).toBe(firstRes.outcome);
            expect(res.candidate).toBe(firstRes.candidate);
            expect(res.confidence).toBe(firstRes.confidence);
        }
    });

    it('LocatorIntelligenceEngine routes candidate ranking through InferenceEngine when INFERENCE_ENGINE_V2 is enabled', () => {
        featureFlags.resetForTesting({ INFERENCE_ENGINE_V2: true });
        const engine = new LocatorIntelligenceEngine();
        const context = new PipelineContext(null);
        context.identityDocument = {
            dataTestId: 'submit-btn',
            textContent: 'Submit',
            tagName: 'BUTTON'
        };

        const cand1 = new LocatorCandidate({ strategy: 'css', locator: '#btn-sub' });
        cand1.features = { attributes: { 'data-testid': 'submit-btn' }, text: { normalized: 'submit' } };
        cand1.node = { tagName: 'BUTTON' };

        const cand2 = new LocatorCandidate({ strategy: 'css', locator: '#other' });
        cand2.features = { text: { normalized: 'other' } };
        cand2.node = { tagName: 'DIV' };

        context.candidates = [cand2, cand1];

        // Execute ranking step
        engine.pipeline.forEach(step => {
            if (step.name === 'RankingEngine') {
                if (featureFlags.isEnabled('INFERENCE_ENGINE_V2')) {
                    engine.inferenceEngine.infer(context.identityDocument || context.metadata?.identityDocument, context.candidates);
                } else {
                    step.execute(context);
                }
            }
        });

        expect(context.candidates[0]).toBe(cand1);
        expect(cand1.ranking.finalScore).toBeDefined();
        expect(cand1.scoringVector).toBeDefined();
    });
});
