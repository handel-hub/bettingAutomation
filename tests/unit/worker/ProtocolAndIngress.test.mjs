import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionMessageType, createExecutionEnvelope, validateExecutionEnvelope } from '../../../src/worker/protocol.mjs';
import { IpcIngress } from '../../../src/worker/IpcIngress.mjs';

describe('Standardized Execution Protocol', () => {
    it('creates a compliant ExecutionEnvelope with defaults', () => {
        const envelope = createExecutionEnvelope(ExecutionMessageType.PLACE_BET, { test: 123 });
        expect(envelope.msgId).toBeDefined();
        expect(envelope.traceId).toBeDefined();
        expect(envelope.type).toBe(ExecutionMessageType.PLACE_BET);
        expect(envelope.source).toBe('EXECUTION_PLANE');
        expect(envelope.payload).toEqual({ test: 123 });
        expect(typeof envelope.timestamp).toBe('number');
    });

    it('validates a correct envelope', () => {
        const envelope = createExecutionEnvelope(ExecutionMessageType.HEARTBEAT, { pid: 100 });
        const res = validateExecutionEnvelope(envelope);
        expect(res.valid).toBe(true);
        expect(res.envelope).toEqual(envelope);
    });

    it('rejects an invalid envelope', () => {
        expect(validateExecutionEnvelope(null).valid).toBe(false);
        expect(validateExecutionEnvelope({}).valid).toBe(false);
        expect(validateExecutionEnvelope({ msgId: '1', type: 'INVALID' }).valid).toBe(false);
    });
});

describe('IpcIngress Standardized Ingress Routing', () => {
    let mockLogger;
    let mockTransport;
    let ingress;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };
        mockTransport = {
            sendEnvelope: vi.fn(),
            send: vi.fn(),
            on: vi.fn()
        };
        ingress = new IpcIngress(mockLogger, mockTransport);
        ingress.start();
    });

    it('routes PLACE_BET and emits ACK reply', () => {
        const commandSpy = vi.fn();
        ingress.on('Command', commandSpy);

        const envelope = createExecutionEnvelope(ExecutionMessageType.PLACE_BET, {
            operationId: 'op-bet-1',
            stake: 100
        }, 'trace-001');

        ingress._routeMessage(envelope);

        // Verify ACK sent back
        expect(mockTransport.sendEnvelope).toHaveBeenCalledWith(
            ExecutionMessageType.OPERATION_ACK,
            { operationId: 'op-bet-1', status: 'IN_FLIGHT' },
            'trace-001'
        );

        // Verify Command event emitted
        expect(commandSpy).toHaveBeenCalledTimes(1);
        const cmd = commandSpy.mock.calls[0][0];
        expect(cmd.category).toBe('Workflow');
        expect(cmd.type).toBe('placebet');
        expect(cmd.runId).toBe('op-bet-1');
        expect(cmd.traceId).toBe('trace-001');
    });

    it('routes CASH_OUT and emits ACK reply', () => {
        const commandSpy = vi.fn();
        ingress.on('Command', commandSpy);

        const envelope = createExecutionEnvelope(ExecutionMessageType.CASH_OUT, {
            operationId: 'op-cash-1',
            betId: 'bet-999'
        }, 'trace-002');

        ingress._routeMessage(envelope);

        expect(mockTransport.sendEnvelope).toHaveBeenCalledWith(
            ExecutionMessageType.OPERATION_ACK,
            { operationId: 'op-cash-1', status: 'IN_FLIGHT' },
            'trace-002'
        );

        expect(commandSpy).toHaveBeenCalledTimes(1);
        const cmd = commandSpy.mock.calls[0][0];
        expect(cmd.category).toBe('Workflow');
        expect(cmd.type).toBe('cashout');
        expect(cmd.runId).toBe('op-cash-1');
    });

    it('routes VALIDATE macro command', () => {
        const commandSpy = vi.fn();
        ingress.on('Command', commandSpy);

        const envelope = createExecutionEnvelope(ExecutionMessageType.VALIDATE, { seqNum: '2' }, 'trace-val');
        ingress._routeMessage(envelope);

        expect(commandSpy).toHaveBeenCalledTimes(1);
        const cmd = commandSpy.mock.calls[0][0];
        expect(cmd.category).toBe('Execution');
        expect(cmd.type).toBe('macro');
        expect(cmd.payload.validateOnly).toBe(true);
    });

    it('routes SET_BET_CYCLE to SET_BETTING_AUTHORIZATION control command', () => {
        const commandSpy = vi.fn();
        ingress.on('Command', commandSpy);

        const envelope = createExecutionEnvelope(ExecutionMessageType.SET_BET_CYCLE, {
            targetBrowserId: 'slave_0',
            isEnabled: false
        });
        ingress._routeMessage(envelope);

        expect(commandSpy).toHaveBeenCalledTimes(1);
        const cmd = commandSpy.mock.calls[0][0];
        expect(cmd.category).toBe('Control');
        expect(cmd.type).toBe('SET_BETTING_AUTHORIZATION');
        expect(cmd.payload.targetBrowserId).toBe('slave_0');
        expect(cmd.payload.isEnabled).toBe(false);
    });

    it('delegates ACTIVATE_ACCOUNT to controller and replies with BROWSER_STATUS', async () => {
        const mockController = {
            activateAccount: vi.fn().mockResolvedValue({ id: 'slave_10' })
        };
        ingress.setController(mockController);

        const envelope = createExecutionEnvelope(ExecutionMessageType.ACTIVATE_ACCOUNT, {
            accountId: 'acc-1',
            account: { username: 'user1', password: 'pw1' }
        }, 'trace-act');

        ingress._routeMessage(envelope);

        expect(mockController.activateAccount).toHaveBeenCalledWith(
            { username: 'user1', password: 'pw1' },
            undefined
        );

        await new Promise(r => setTimeout(r, 10));

        expect(mockTransport.sendEnvelope).toHaveBeenCalledWith(
            ExecutionMessageType.BROWSER_STATUS,
            { accountId: 'acc-1', username: 'user1', status: 'READY' },
            'trace-act'
        );
    });

    it('delegates DEACTIVATE_ACCOUNT to controller and replies with BROWSER_STATUS', async () => {
        const mockController = {
            deactivateAccount: vi.fn().mockResolvedValue(true)
        };
        ingress.setController(mockController);

        const envelope = createExecutionEnvelope(ExecutionMessageType.DEACTIVATE_ACCOUNT, {
            accountId: 'slave_1'
        }, 'trace-deact');

        ingress._routeMessage(envelope);

        expect(mockController.deactivateAccount).toHaveBeenCalledWith('slave_1');

        await new Promise(r => setTimeout(r, 10));

        expect(mockTransport.sendEnvelope).toHaveBeenCalledWith(
            ExecutionMessageType.BROWSER_STATUS,
            { accountId: 'slave_1', status: 'TERMINATED' },
            'trace-deact'
        );
    });

    it('delegates UPDATE_POLICY to policyManager', () => {
        const mockPolicyManager = {
            updatePolicy: vi.fn()
        };
        ingress.setController({ policyManager: mockPolicyManager });

        const envelope = createExecutionEnvelope(ExecutionMessageType.UPDATE_POLICY, {
            category: 'Staking',
            values: { maxStake: 500 }
        });

        ingress._routeMessage(envelope);

        expect(mockPolicyManager.updatePolicy).toHaveBeenCalledWith('Staking', { maxStake: 500 });
    });
});
