import { describe, it, expect } from 'vitest';
import {
  validateBaseFact,
  validateDecisionFact,
  validateMeasurementFact,
  validateStateDeltaFact,
  validateFailureFact
} from './index.mjs';

describe('RKP Models', () => {
  it('should validate a correct base fact', () => {
    const fact = {
      domain: 'Execution',
      type: 'Decision',
      traceId: 'trace-1',
      spanId: 'span-1'
    };
    expect(() => validateBaseFact(fact)).not.toThrow();
  });

  it('should reject a fact with invalid domain', () => {
    const fact = {
      domain: 'InvalidDomain',
      type: 'Decision',
      traceId: 'trace-1',
      spanId: 'span-1'
    };
    expect(() => validateBaseFact(fact)).toThrow(/Invalid domain/);
  });

  it('should validate a correct Decision fact', () => {
    const fact = {
      domain: 'Locator',
      type: 'Decision',
      traceId: 'trace-1',
      spanId: 'span-1',
      actionTaken: 'WAIT',
      alternativesDiscarded: ['FAIL'],
      confidenceScore: 0.9,
      evidence: {
        constraintsEvaluated: ['timeout < 5000']
      }
    };
    expect(() => validateDecisionFact(fact)).not.toThrow();
  });

  it('should reject Decision fact missing evidence', () => {
    const fact = {
      domain: 'Locator',
      type: 'Decision',
      traceId: 'trace-1',
      spanId: 'span-1',
      actionTaken: 'WAIT',
      alternativesDiscarded: ['FAIL'],
      confidenceScore: 0.9
    };
    expect(() => validateDecisionFact(fact)).toThrow(/Decision must have evidence object/);
  });

  it('should validate a correct Measurement fact', () => {
    const fact = {
      domain: 'Network',
      type: 'Measurement',
      traceId: 'trace-1',
      spanId: 'span-1',
      metricName: 'Latency',
      value: 120,
      unit: 'ms'
    };
    expect(() => validateMeasurementFact(fact)).not.toThrow();
  });

  it('should validate a correct State fact', () => {
    const fact = {
      domain: 'Browser',
      type: 'State',
      traceId: 'trace-1',
      spanId: 'span-1',
      version: 2,
      parentVersion: 1,
      delta: { prop: 'updated' }
    };
    expect(() => validateStateDeltaFact(fact)).not.toThrow();
  });

  it('should validate a correct Failure fact', () => {
    const fact = {
      domain: 'Recovery',
      type: 'Failure',
      traceId: 'trace-1',
      spanId: 'span-1',
      recoveryStrategy: 'RESTART',
      errorMessage: 'Crash',
      errorCode: 'E_CRASH'
    };
    expect(() => validateFailureFact(fact)).not.toThrow();
  });
});
