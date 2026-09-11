import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryPolicyProvider } from '../../../src/worker/MemoryPolicyProvider.mjs';
import { IpcIngress } from '../../../src/worker/IpcIngress.mjs';
import { ExecutionMessageType, createExecutionEnvelope } from '../../../src/worker/protocol.mjs';

describe('MultiPolicyProvider Core Architecture', () => {
    const baseDefaultPolicy = {
        Pricing: {
            Strategy: {
                Mode: 'PROFIT_TARGET',
                BaseStake: 100,
                TargetProfit: 1000
            },
            Behavior: {
                PlatformIncrement: 1
            }
        },
        RiskManagement: {
            Policy: {
                MaxStake: 5000,
                MinimumStake: 10
            }
        }
    };

    it('initializes with a default policy and resolves it when accountId is unknown', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);
        
        expect(provider.getPolicy()).toEqual(baseDefaultPolicy);
        expect(provider.getPolicy('unknown_account')).toEqual(baseDefaultPolicy);
        expect(provider.policy).toEqual(baseDefaultPolicy);
    });

    it('initializes with pre-configured account-specific overrides', () => {
        const customAccountPolicy = {
            Pricing: {
                Strategy: {
                    Mode: 'FIXED',
                    BaseStake: 50
                }
            }
        };

        const provider = new MemoryPolicyProvider({
            defaultPolicy: baseDefaultPolicy,
            accountPolicies: {
                'user_alpha': customAccountPolicy
            }
        });

        expect(provider.getPolicy('user_alpha').Pricing.Strategy.Mode).toBe('FIXED');
        expect(provider.getPolicy('user_alpha').Pricing.Strategy.BaseStake).toBe(50);
        expect(provider.getPolicy('user_beta').Pricing.Strategy.Mode).toBe('PROFIT_TARGET');
    });

    it('performs targeted update on specific account without mutating default policy or other accounts', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        // Target Account A
        provider.updatePolicy({
            target: 'acc_A',
            category: 'Pricing',
            values: {
                Strategy: {
                    TargetProfit: 5000
                }
            }
        });

        const policyA = provider.getPolicy('acc_A');
        const policyB = provider.getPolicy('acc_B');
        const defaultPol = provider.getPolicy();

        // Account A has the updated target profit
        expect(policyA.Pricing.Strategy.TargetProfit).toBe(5000);
        // Account B and default policy remain at 1000
        expect(policyB.Pricing.Strategy.TargetProfit).toBe(1000);
        expect(defaultPol.Pricing.Strategy.TargetProfit).toBe(1000);
    });

    it('applies consecutive targeted updates to the same account cleanly', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        provider.updatePolicy({ target: 'acc_A', category: 'Pricing', values: { Strategy: { TargetProfit: 3000 } } });
        provider.updatePolicy({ target: 'acc_A', category: 'RiskManagement', values: { Policy: { MaxStake: 8000 } } });

        const policyA = provider.getPolicy('acc_A');
        expect(policyA.Pricing.Strategy.TargetProfit).toBe(3000);
        expect(policyA.RiskManagement.Policy.MaxStake).toBe(8000);
        // BaseStake preserved
        expect(policyA.Pricing.Strategy.BaseStake).toBe(100);
    });

    it('performs cluster-wide update targeting ALL explicitly', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        // Account A already has an override
        provider.updatePolicy({ target: 'acc_A', category: 'Pricing', values: { Strategy: { TargetProfit: 2500 } } });

        // Broadcast update to ALL
        provider.updatePolicy({ target: 'ALL', category: 'RiskManagement', values: { Policy: { MaxStake: 15000 } } });

        expect(provider.getPolicy('acc_A').RiskManagement.Policy.MaxStake).toBe(15000);
        expect(provider.getPolicy('acc_B').RiskManagement.Policy.MaxStake).toBe(15000);
        expect(provider.getPolicy().RiskManagement.Policy.MaxStake).toBe(15000);

        // Specific override on Account A was preserved
        expect(provider.getPolicy('acc_A').Pricing.Strategy.TargetProfit).toBe(2500);
    });

    it('performs cluster-wide update with default target (ALL)', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        provider.updatePolicy({ category: 'RiskManagement', values: { Policy: { MinimumStake: 50 } } });

        expect(provider.getPolicy('acc_X').RiskManagement.Policy.MinimumStake).toBe(50);
        expect(provider.getPolicy().RiskManagement.Policy.MinimumStake).toBe(50);
    });

    it('resolves policy across aliases (e.g. browser slotId <-> account username)', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        provider.addAlias('slave_0', '08107992381');

        // Update using slot ID
        provider.updatePolicy({ target: 'slave_0', category: 'Pricing', values: { Strategy: { TargetProfit: 7777 } } });

        // Retrieve using username
        expect(provider.getPolicy('08107992381').Pricing.Strategy.TargetProfit).toBe(7777);
        // Retrieve using slot ID
        expect(provider.getPolicy('slave_0').Pricing.Strategy.TargetProfit).toBe(7777);
    });

    it('guarantees deep isolation so nested property mutation does not leak', () => {
        const provider = new MemoryPolicyProvider(baseDefaultPolicy);

        provider.updatePolicy({ target: 'acc_1', category: 'Pricing', values: { Strategy: { Mode: 'CUSTOM' } } });
        const p1 = provider.getPolicy('acc_1');
        p1.Pricing.Strategy.Mode = 'MUTATED_DIRECTLY';

        // Default policy remains PROFIT_TARGET
        expect(provider.getPolicy().Pricing.Strategy.Mode).toBe('PROFIT_TARGET');
    });
});

describe('IpcIngress Targeted Policy Routing Integration', () => {
    let mockLogger;
    let mockTransport;
    let ingress;
    let mockPolicyManager;

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
        mockPolicyManager = {
            updatePolicy: vi.fn()
        };
        ingress = new IpcIngress(mockLogger, mockTransport);
        ingress.setController({ policyManager: mockPolicyManager });
        ingress.start();
    });

    it('routes targeted UPDATE_POLICY with accountId and operationId ACK', () => {
        const envelope = createExecutionEnvelope(ExecutionMessageType.UPDATE_POLICY, {
            accountId: 'slave_0',
            category: 'Pricing',
            values: { TargetProfit: 5000 },
            operationId: 'op-pol-1'
        }, 'trace-pol-1');

        ingress._routeMessage(envelope);

        expect(mockPolicyManager.updatePolicy).toHaveBeenCalledWith({
            target: 'slave_0',
            category: 'Pricing',
            values: { TargetProfit: 5000 }
        });

        expect(mockTransport.sendEnvelope).toHaveBeenCalledWith(
            ExecutionMessageType.OPERATION_ACK,
            expect.objectContaining({
                operationId: 'op-pol-1',
                operation: 'UPDATE_POLICY',
                target: 'slave_0',
                status: 'APPLIED'
            }),
            'trace-pol-1'
        );
    });

    it('routes targeted UPDATE_POLICY with target property', () => {
        const envelope = createExecutionEnvelope(ExecutionMessageType.UPDATE_POLICY, {
            target: 'user_99',
            category: 'RiskManagement',
            values: { MaxStake: 500 }
        });

        ingress._routeMessage(envelope);

        expect(mockPolicyManager.updatePolicy).toHaveBeenCalledWith({
            target: 'user_99',
            category: 'RiskManagement',
            values: { MaxStake: 500 }
        });
    });

    it('routes default untargeted UPDATE_POLICY with target ALL', () => {
        const envelope = createExecutionEnvelope(ExecutionMessageType.UPDATE_POLICY, {
            category: 'Staking',
            values: { maxStake: 1000 }
        });

        ingress._routeMessage(envelope);

        expect(mockPolicyManager.updatePolicy).toHaveBeenCalledWith({
            target: 'ALL',
            category: 'Staking',
            values: { maxStake: 1000 }
        });
    });
});
