import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaselineMetrics } from './BaselineMetrics.mjs';

describe('BaselineMetrics', () => {
    let metrics;
    let tmpFile;

    beforeEach(() => {
        metrics = new BaselineMetrics();
        tmpFile = path.join(os.tmpdir(), `baseline-test-${Date.now()}.json`);
    });

    afterEach(() => {
        if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
        }
    });

    it('should record success and failure attempts accurately', () => {
        metrics.recordAttempt('http://site.com', 10, true, null, 'DataAttribute');
        metrics.recordAttempt('http://site.com', 50, false, 'LF-101', 'Text');
        metrics.recordAttempt('http://site.com', 20, true, null, 'DataAttribute');

        const summary = metrics.getSummary();
        expect(summary.totalAttempts).toBe(3);
        expect(summary.successRate).toBeCloseTo(2 / 3);
        expect(summary.failureDistribution['LF-101']).toBe(1);
        expect(summary.strategySuccess['DataAttribute']).toBe(1.0);
        expect(summary.strategySuccess['Text']).toBe(0.0);
    });

    it('should compute latency percentiles correctly', () => {
        for (let i = 1; i <= 100; i++) {
            metrics.recordAttempt('url', i, true);
        }
        const summary = metrics.getSummary();
        expect(summary.latency.p50).toBe(51);
        expect(summary.latency.p95).toBe(96);
        expect(summary.latency.p99).toBe(100);
        expect(summary.latency.mean).toBe(50.5);
    });

    it('should detect regressions when comparing against baseline', () => {
        metrics.recordAttempt('url', 20, true);
        metrics.recordAttempt('url', 20, true);

        const regressedSummary = {
            totalAttempts: 10,
            successRate: 0.90, // Regressed > 0.5% from 1.0
            latency: { p50: 20, p95: 50, p99: 60, mean: 30 } // P95 latency increased by 30ms (> 25ms)
        };

        const result = metrics.compareAgainst(regressedSummary);
        expect(result.regressed).toBe(true);
        expect(result.reasons.length).toBe(2);
        expect(result.reasons[0]).toContain('Success rate regressed');
        expect(result.reasons[1]).toContain('P95 latency increased');
    });

    it('should not flag regression for minor variance within thresholds', () => {
        metrics.recordAttempt('url', 30, true);
        metrics.recordAttempt('url', 30, true);

        const okaySummary = {
            totalAttempts: 10,
            successRate: 0.998, // Only 0.2% drop (threshold is 0.5%)
            latency: { p50: 30, p95: 45, p99: 50, mean: 35 } // Only 15ms increase (threshold is 25ms)
        };

        const result = metrics.compareAgainst(okaySummary);
        expect(result.regressed).toBe(false);
        expect(result.reasons.length).toBe(0);
    });

    it('should export and load from filesystem', () => {
        metrics.recordAttempt('url', 15, true, null, 'Css');
        metrics.exportToFile(tmpFile);
        expect(fs.existsSync(tmpFile)).toBe(true);

        const loaded = BaselineMetrics.loadFromFile(tmpFile);
        const summary = loaded.getSummary();
        expect(summary.totalAttempts).toBe(1);
        expect(summary.successRate).toBe(1.0);
    });
});
