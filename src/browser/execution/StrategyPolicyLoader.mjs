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
                    MaxRebetAttempts: 3,
                    RebetStakeIncrement: 0,
                    RebetCooldownMs: 1500
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
                    MinimumStake: 10,
                    AbortOnMarketSuspend: true
                }
            }
        };

        try {
            const policyPath = path.join(__dirname, '..', '..', '..', 'betting_strategy.ini');
            
            if (fs.existsSync(policyPath)) {
                const raw = fs.readFileSync(policyPath, 'utf-8');
                const parsed = ini.parse(raw);
                
                // Helper to safely parse numbers, allowing 0 to pass through without falling back to truthy defaults.
                const parseNum = (val, defaultVal) => {
                    if (val === undefined || val === null || val === '') return defaultVal;
                    const num = parseFloat(val);
                    return isNaN(num) ? defaultVal : num;
                };

                // Boolean parsing helper
                const parseBool = (val, defaultVal) => {
                    if (val === undefined || val === null || val === '') return defaultVal;
                    return val === true || val === 'true';
                };

                // --- Risk Management Auto-Corrections ---
                let minStake = parseNum(parsed.RiskManagement?.Policy?.MinimumStake, defaultPolicy.RiskManagement.Policy.MinimumStake);
                let maxStake = parseNum(parsed.RiskManagement?.Policy?.MaxStake, defaultPolicy.RiskManagement.Policy.MaxStake);

                if (maxStake <= 0) {
                    logger.warn('[StrategyPolicy] MaxStake is <= 0. Auto-correcting to 1,000,000,000 to prevent immediate UNRESOLVABLE lock.');
                    maxStake = 1000000000;
                }

                if (minStake > maxStake) {
                    logger.warn(`[StrategyPolicy] Inverted limits detected (Min: ${minStake} > Max: ${maxStake}). Auto-correcting by swapping them.`);
                    const temp = minStake;
                    minStake = maxStake;
                    maxStake = temp;
                }

                // --- Pricing Auto-Corrections ---
                let mode = parsed.Pricing?.Strategy?.Mode || defaultPolicy.Pricing.Strategy.Mode;
                let targetProfit = parseNum(parsed.Pricing?.Strategy?.TargetProfit, defaultPolicy.Pricing.Strategy.TargetProfit);
                let baseStake = parseNum(parsed.Pricing?.Strategy?.BaseStake, defaultPolicy.Pricing.Strategy.BaseStake);
                
                if (mode === 'PROFIT_TARGET' && targetProfit <= 0) {
                    if (baseStake > 0) {
                        logger.warn(`[StrategyPolicy] PROFIT_TARGET mode selected but TargetProfit is ${targetProfit}. Auto-correcting to FIXED mode using BaseStake (${baseStake}).`);
                        mode = 'FIXED';
                    } else {
                        logger.warn(`[StrategyPolicy] TargetProfit and BaseStake are both <= 0. Auto-correcting TargetProfit to safe default (1000).`);
                        targetProfit = 1000;
                    }
                }

                return {
                    Pricing: {
                        Strategy: {
                            Mode: mode,
                            BaseStake: baseStake,
                            TargetProfit: targetProfit,
                            MinimumAcceptableProfit: parseNum(parsed.Pricing?.Strategy?.MinimumAcceptableProfit, 0), // Default to 0 if missing!
                            ResolutionStrategy: parsed.Pricing?.Strategy?.ResolutionStrategy || defaultPolicy.Pricing.Strategy.ResolutionStrategy
                        },
                        Behavior: {
                            PlatformIncrement: parseNum(parsed.Pricing?.Behavior?.PlatformIncrement, defaultPolicy.Pricing.Behavior.PlatformIncrement),
                            SelectionPreference: parsed.Pricing?.Behavior?.SelectionPreference || defaultPolicy.Pricing.Behavior.SelectionPreference,
                            RestorePolicyOnRebet: parseBool(parsed.Pricing?.Behavior?.RestorePolicyOnRebet, defaultPolicy.Pricing.Behavior.RestorePolicyOnRebet)
                        }
                    },
                    Rebet: {
                        Strategy: {
                            MaxRebetAttempts: parseNum(parsed.Rebet?.Strategy?.MaxRebetAttempts, defaultPolicy.Rebet.Strategy.MaxRebetAttempts),
                            RebetStakeIncrement: parseNum(parsed.Rebet?.Strategy?.RebetStakeIncrement, defaultPolicy.Rebet.Strategy.RebetStakeIncrement),
                            RebetCooldownMs: parseNum(parsed.Rebet?.Strategy?.RebetCooldownMs, defaultPolicy.Rebet.Strategy.RebetCooldownMs)
                        }
                    },
                    Execution: { 
                        Timeouts: {
                            ResultTimeoutMs: parseNum(parsed.Execution?.Timeouts?.ResultTimeoutMs, defaultPolicy.Execution.Timeouts.ResultTimeoutMs),
                            NavigationTimeoutMs: parseNum(parsed.Execution?.Timeouts?.NavigationTimeoutMs, defaultPolicy.Execution.Timeouts.NavigationTimeoutMs),
                            LoginTimeoutMs: parseNum(parsed.Execution?.Timeouts?.LoginTimeoutMs, defaultPolicy.Execution.Timeouts.LoginTimeoutMs),
                            DecisionFreshnessTTLMs: parseNum(parsed.Execution?.Timeouts?.DecisionFreshnessTTLMs, defaultPolicy.Execution.Timeouts.DecisionFreshnessTTLMs),
                            ReconciliationTimeoutMs: parseNum(parsed.Execution?.Timeouts?.ReconciliationTimeoutMs, defaultPolicy.Execution.Timeouts.ReconciliationTimeoutMs)
                        },
                        Pacing: {
                            KeyboardTypingDelayMs: parseNum(parsed.Execution?.Pacing?.KeyboardTypingDelayMs, defaultPolicy.Execution.Pacing.KeyboardTypingDelayMs)
                        },
                        Retries: {
                            MaxExecutionRetries: parseNum(parsed.Execution?.Retries?.MaxExecutionRetries, defaultPolicy.Execution.Retries.MaxExecutionRetries),
                            MaxRecoveryAttempts: parseNum(parsed.Execution?.Retries?.MaxRecoveryAttempts, defaultPolicy.Execution.Retries.MaxRecoveryAttempts),
                            RecoveryBaseDelayMs: parseNum(parsed.Execution?.Retries?.RecoveryBaseDelayMs, defaultPolicy.Execution.Retries.RecoveryBaseDelayMs)
                        },
                        Limits: {
                            MaxRecordedActions: parseNum(parsed.Execution?.Limits?.MaxRecordedActions, defaultPolicy.Execution.Limits.MaxRecordedActions)
                        }
                    },
                    RiskManagement: { 
                        Policy: {
                            AutoAcceptOddsChanges: parseBool(parsed.RiskManagement?.Policy?.AutoAcceptOddsChanges, defaultPolicy.RiskManagement.Policy.AutoAcceptOddsChanges),
                            MaxStake: maxStake,
                            MinimumStake: minStake,
                            AbortOnMarketSuspend: parseBool(parsed.RiskManagement?.Policy?.AbortOnMarketSuspend, defaultPolicy.RiskManagement.Policy.AbortOnMarketSuspend)
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
