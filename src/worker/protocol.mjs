// @ts-check
import crypto from 'node:crypto';

/**
 * Canonical Message Types for Control Plane <-> Execution Plane Communication.
 */
export const ExecutionMessageType = Object.freeze({
  // Inbound Requests (CP -> EP)
  INITIALIZE: 'LIFECYCLE:INITIALIZE',
  START_CLUSTER: 'LIFECYCLE:START_CLUSTER',
  STOP_CLUSTER: 'LIFECYCLE:STOP_CLUSTER',
  PLACE_BET: 'TACTICAL:PLACE_BET',
  CASH_OUT: 'TACTICAL:CASH_OUT',
  VALIDATE: 'TACTICAL:VALIDATE',
  ACTIVATE_ACCOUNT: 'FLEET:ACTIVATE_ACCOUNT',
  DEACTIVATE_ACCOUNT: 'FLEET:DEACTIVATE_ACCOUNT',
  SET_BET_CYCLE: 'FLEET:SET_BET_CYCLE',
  UPDATE_POLICY: 'CONFIG:UPDATE_POLICY',

  // Outbound Telemetry & Data (EP -> CP)
  HEARTBEAT: 'TELEMETRY:HEARTBEAT',
  STATE_CHANGED: 'LIFECYCLE:STATE_CHANGED',
  BROWSER_STATUS: 'FLEET:BROWSER_STATUS',
  OPERATION_ACK: 'TACTICAL:OPERATION_ACK',
  OPERATION_RESULT: 'TACTICAL:OPERATION_RESULT',
  ODDS_TICK: 'DATA:ODDS_TICK',
  AUDIT_EVENT: 'SECURITY:AUDIT_EVENT'
});

/**
 * Creates a canonical execution envelope for outbound messages from the worker.
 * @template T
 * @param {string} type
 * @param {T} payload
 * @param {string} [traceId]
 * @returns {{ msgId: string, traceId: string, type: string, timestamp: number, source: 'EXECUTION_PLANE', payload: T }}
 */
export function createExecutionEnvelope(type, payload, traceId) {
  return {
    msgId: crypto.randomUUID(),
    traceId: traceId || crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    source: 'EXECUTION_PLANE',
    payload: payload || /** @type {T} */ ({})
  };
}

/**
 * Validates an incoming execution envelope structure.
 * @param {any} raw
 * @returns {{ valid: boolean, envelope?: any, error?: string }}
 */
export function validateExecutionEnvelope(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Envelope must be an object' };
  }

  const { msgId, traceId, type, timestamp, source, payload } = raw;

  if (typeof msgId !== 'string' || !msgId) return { valid: false, error: 'Missing msgId' };
  if (typeof traceId !== 'string' || !traceId) return { valid: false, error: 'Missing traceId' };
  if (typeof type !== 'string' || !type) return { valid: false, error: 'Missing type' };
  if (typeof timestamp !== 'number' || timestamp <= 0) return { valid: false, error: 'Invalid timestamp' };
  if (source !== 'CONTROL_PLANE' && source !== 'EXECUTION_PLANE') return { valid: false, error: 'Invalid source' };
  if (payload === undefined || payload === null || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };

  return { valid: true, envelope: raw };
}
