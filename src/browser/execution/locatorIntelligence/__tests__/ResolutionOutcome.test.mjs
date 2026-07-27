import { describe, it, expect } from 'vitest';
import { ResolutionOutcome } from '../models/ResolutionOutcome.mjs';
import { ConfidenceReport } from '../models/ConfidenceReport.mjs';
import { SimilarityScore } from '../models/SimilarityScore.mjs';
import { 
    VerificationMismatchError, 
    ConfidenceBelowThresholdError, 
    AmbiguousResolutionError, 
    RecoveryExhaustedError 
} from '../../errors.mjs';

describe('ResolutionOutcome & New Errors', () => {
    it('should determine success correctly based on status and success flag', () => {
        const successOutcome = new ResolutionOutcome({ success: true, status: 'RESOLVED' });
        expect(successOutcome.isSuccess()).toBe(true);

        const failOutcome = new ResolutionOutcome({ success: true, status: 'REJECTED' });
        expect(failOutcome.isSuccess()).toBe(false);

        const errorOutcome = new ResolutionOutcome({ success: false, status: 'ERROR' });
        expect(errorOutcome.isSuccess()).toBe(false);
    });

    it('should serialize cleanly while stripping playwrightLocator', () => {
        const outcome = new ResolutionOutcome({
            success: true,
            status: 'RESOLVED',
            playwrightLocator: { click: () => {} }, // Mock Playwright locator
            winningCandidate: { id: 'lc-1', strategy: 'DataAttribute' },
            confidenceReport: new ConfidenceReport({ decision: 'ACCEPT', confidence: 0.9 }),
            similarityScore: new SimilarityScore({ tagMatch: 1.0 }),
            recoveryLevel: 'L1_RETRY',
            durationMs: 42,
            attempts: 2,
            error: new VerificationMismatchError('ID did not match')
        });

        const serialized = outcome.serialize();
        expect(serialized.playwrightLocator).toBeUndefined();
        expect(serialized.success).toBe(true);
        expect(serialized.status).toBe('RESOLVED');
        expect(serialized.recoveryLevel).toBe('L1_RETRY');
        expect(serialized.confidenceReport.decision).toBe('ACCEPT');
        expect(serialized.similarityScore.overallScore).toBeDefined();
        expect(serialized.error).toContain('[LF-601] ID did not match');
    });

    it('should instantiate all new LF-601 through LF-605 error classes properly', () => {
        const err601 = new VerificationMismatchError('Mismatch');
        expect(err601.code).toBe('LF-601');
        expect(err601.severity).toBe('ERROR');

        const err602 = new ConfidenceBelowThresholdError('Below threshold');
        expect(err602.code).toBe('LF-602');

        const err603 = new AmbiguousResolutionError('Ambiguous');
        expect(err603.code).toBe('LF-603');
        expect(err603.severity).toBe('WARNING');

        const err605 = new RecoveryExhaustedError('Recovery failed');
        expect(err605.code).toBe('LF-605');
        expect(err605.severity).toBe('CRITICAL');
    });
});
