import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ini from 'ini';
import { logger } from '../../config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StrategyPolicyLoader {
    /**
     * Loads the betting_strategy.ini file to configure execution policies.
     * Extracts all Risk Management and Execution boundaries out of the code
     * and strictly into user-configurable space.
     */
    static loadPolicy() {
        const defaultPolicy = {
            Pricing: {
                Strategy: {
                    Mode: 'PROFIT_TARGET',
                    BaseStake: 100,
                    TargetProfit: 1000,
                    MinimumAcceptableProfit: 400,
                    ResolutionStrategy: 'CLAMP_THEN_REDUCE_PROFIT'
                },
                Behavior: {
                    PlatformIncrement: 1,
                    SelectionPreference: 'ROUND_NUMBERS',
                    RestorePolicyOnRebet: true
                }
            },
            Rebet: {
                Strategy: {
                    MaxRebetAttempts: 3
                }
            },
            Execution: {
                Timeouts: {
                    ResultTimeoutMs: 30000,
                    NavigationTimeoutMs: 10000,
                    LoginTimeoutMs: 15000,
                    DecisionFreshnessTTLMs: 3000,
                    ReconciliationTimeoutMs: 120000
                },
                Pacing: {
                    KeyboardTypingDelayMs: 250
                },
                Retries: {
                    MaxExecutionRetries: 3,
                    MaxRecoveryAttempts: 3,
                    RecoveryBaseDelayMs: 2000
                },
                Limits: {
                    MaxRecordedActions: 1000
                }
            },
            RiskManagement: {
                Policy: {
                    AutoAcceptOddsChanges: false,
                    MaxStake: 10000,
                    AbortOnMarketSuspend: true
                }
            }
        };

        try {
            const policyPath = path.join(__dirname, '..', '..', '..', 'betting_strategy.ini');
            
            if (fs.existsSync(policyPath)) {
                const raw = fs.readFileSync(policyPath, 'utf-8');
                const parsed = ini.parse(raw);
                
                return {
                    Pricing: {
                        Strategy: {
                            Mode: parsed['Pricing.Strategy']?.Mode || defaultPolicy.Pricing.Strategy.Mode,
                            BaseStake: parseFloat(parsed['Pricing.Strategy']?.BaseStake) || defaultPolicy.Pricing.Strategy.BaseStake,
                            TargetProfit: parseFloat(parsed['Pricing.Strategy']?.TargetProfit) || defaultPolicy.Pricing.Strategy.TargetProfit,
                            MinimumAcceptableProfit: parseFloat(parsed['Pricing.Strategy']?.MinimumAcceptableProfit) || defaultPolicy.Pricing.Strategy.MinimumAcceptableProfit,
                            ResolutionStrategy: parsed['Pricing.Strategy']?.ResolutionStrategy || defaultPolicy.Pricing.Strategy.ResolutionStrategy
                        },
                        Behavior: {
                            PlatformIncrement: parseFloat(parsed['Pricing.Behavior']?.PlatformIncrement) || defaultPolicy.Pricing.Behavior.PlatformIncrement,
                            SelectionPreference: parsed['Pricing.Behavior']?.SelectionPreference || defaultPolicy.Pricing.Behavior.SelectionPreference,
                            RestorePolicyOnRebet: parsed['Pricing.Behavior']?.RestorePolicyOnRebet === true || parsed['Pricing.Behavior']?.RestorePolicyOnRebet === 'true' || parsed['Pricing.Behavior']?.RestorePolicyOnRebet === undefined
                        }
                    },
                    Rebet: {
                        Strategy: {
                            MaxRebetAttempts: parseInt(parsed['Rebet.Strategy']?.MaxRebetAttempts) ?? defaultPolicy.Rebet.Strategy.MaxRebetAttempts
                        }
                    },
                    Execution: { 
                        Timeouts: {
                            ResultTimeoutMs: parseInt(parsed['Execution.Timeouts']?.ResultTimeoutMs) || defaultPolicy.Execution.Timeouts.ResultTimeoutMs,
                            NavigationTimeoutMs: parseInt(parsed['Execution.Timeouts']?.NavigationTimeoutMs) || defaultPolicy.Execution.Timeouts.NavigationTimeoutMs,
                            LoginTimeoutMs: parseInt(parsed['Execution.Timeouts']?.LoginTimeoutMs) || defaultPolicy.Execution.Timeouts.LoginTimeoutMs,
                            DecisionFreshnessTTLMs: parseInt(parsed['Execution.Timeouts']?.DecisionFreshnessTTLMs) || defaultPolicy.Execution.Timeouts.DecisionFreshnessTTLMs,
                            ReconciliationTimeoutMs: parseInt(parsed['Execution.Timeouts']?.ReconciliationTimeoutMs) || defaultPolicy.Execution.Timeouts.ReconciliationTimeoutMs
                        },
                        Pacing: {
                            KeyboardTypingDelayMs: parseInt(parsed['Execution.Pacing']?.KeyboardTypingDelayMs) || defaultPolicy.Execution.Pacing.KeyboardTypingDelayMs
                        },
                        Retries: {
                            MaxExecutionRetries: parseInt(parsed['Execution.Retries']?.MaxExecutionRetries) ?? defaultPolicy.Execution.Retries.MaxExecutionRetries,
                            MaxRecoveryAttempts: parseInt(parsed['Execution.Retries']?.MaxRecoveryAttempts) ?? defaultPolicy.Execution.Retries.MaxRecoveryAttempts,
                            RecoveryBaseDelayMs: parseInt(parsed['Execution.Retries']?.RecoveryBaseDelayMs) || defaultPolicy.Execution.Retries.RecoveryBaseDelayMs
                        },
                        Limits: {
                            MaxRecordedActions: parseInt(parsed['Execution.Limits']?.MaxRecordedActions) || defaultPolicy.Execution.Limits.MaxRecordedActions
                        }
                    },
                    RiskManagement: { 
                        Policy: {
                            AutoAcceptOddsChanges: parsed['RiskManagement.Policy']?.AutoAcceptOddsChanges === true || parsed['RiskManagement.Policy']?.AutoAcceptOddsChanges === 'true',
                            MaxStake: parseFloat(parsed['RiskManagement.Policy']?.MaxStake) || defaultPolicy.RiskManagement.Policy.MaxStake,
                            AbortOnMarketSuspend: parsed['RiskManagement.Policy']?.AbortOnMarketSuspend === true || parsed['RiskManagement.Policy']?.AbortOnMarketSuspend === 'true' || parsed['RiskManagement.Policy']?.AbortOnMarketSuspend === undefined
                        }
                    }
                };
            }
            
            logger.warn('[StrategyPolicy] betting_strategy.ini missing. Enforcing safe defaults.');
            return defaultPolicy;

        } catch (error) {
            logger.error('[StrategyPolicy] Failed to parse betting_strategy.ini, falling back to strict defaults', error);
            return defaultPolicy;
        }
    }
}
