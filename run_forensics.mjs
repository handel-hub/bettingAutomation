import { BetCycle } from './src/browser/workflows/BetCycle.mjs';
import { PassiveShadowDaemon } from './src/browser/coordination/PassiveShadowDaemon.mjs';
import { RunOrchestrator } from './src/browser/coordination/RunOrchestrator.mjs';
import { TriggerRouter } from './src/browser/execution/TriggerRouter.mjs';
import { ActionSimulator } from './src/browser/execution/ActionSimulator.mjs';
import { forensicLogger } from './src/browser/forensics/ForensicLogger.mjs';
import { Command } from './src/browser/execution/Command.mjs';

// Mocks
const mockRunLedger = { append: () => {} };
const mockRegistry = { getState: () => ({ currentGes: 1 }) };
const mockCommandRouter = { route: () => {} };
const mockPolicyManager = { getPolicy: () => ({ Pricing: { Strategy: { Mode: 'DYNAMIC' } }, RiskManagement: { Policy: { AutoAcceptOddsChanges: false } }, Execution: { Timeouts: { ResultTimeoutMs: 5000 } } }) };
const mockAdapter = {
    getBalance: async () => 5000,
    readCurrentOdds: async () => 1.85,
    translateStake: (stake) => Array.from(String(stake)).map(k => ({ type: 'KEYBOARD', payload: { key: k } })),
    translateOpenBetslip: async () => ({ type: 'CLICK', payload: { selector: '.m-betslip' } }),
    checkInterrupts: async () => ({ status: 'NO_INTERRUPT' }),
    translateAtomicPlaceBet: (odds) => ({ type: 'ATOMIC_PLACE_BET', payload: { expectedOdds: odds } }),
    observeResult: async () => ({ status: 'SUCCESS' })
};

class MockSimulator extends ActionSimulator {
    async execute(browserObj, command, options = {}) {
        await super.execute(browserObj, command, options);
        // Simulate some execution time
        await new Promise(r => setTimeout(r, 10));
        return true;
    }
    
    // Override the actual Playwright stuff
    async _executeWithRecovery(cmd, page, name, fn) {
        if (name === 'atomic_place') {
            await new Promise(r => setTimeout(r, 20));
        }
        return { strategy: 'mock', locator: 'mock' };
    }
}

async function runExperiment() {
    const orchestrator = new RunOrchestrator(mockRunLedger, mockRegistry, mockCommandRouter);
    const simulator = new MockSimulator(orchestrator);
    const daemon = new PassiveShadowDaemon(orchestrator, simulator, mockPolicyManager, mockAdapter);
    
    const router = new TriggerRouter(orchestrator, null, daemon);

    const mockBrowserObj = {
        id: 'browser-1',
        page: {
            on: () => {},
            evaluate: async () => ({}),
            waitForTimeout: async (ms) => new Promise(r => setTimeout(r, ms)),
            url: () => 'http://mock.com',
            goto: async () => {}
        }
    };

    console.log("=== EXPERIMENT 1: NORMAL TRANSACTION ===");
    // Force a daemon cycle
    await daemon._evaluateLoop([mockBrowserObj], 1.85, 0);
    
    // Simulate Place Bet
    const cmd = new Command({ type: 'click', payload: { selector: '.m-btn-place', sid: { text: 'place bet' } } });
    const intercepted = router.interceptDomSync(cmd, 'browser-1');
    const workflowCmd = intercepted[1];

    if (!workflowCmd) throw new Error("Intercept failed!");

    const cycle = new BetCycle({
        runId: workflowCmd.runId,
        cycleId: 'C1',
        policySnapshot: mockPolicyManager.getPolicy(),
        adapter: mockAdapter,
        simulator: simulator,
        runOrchestrator: orchestrator
    });
    
    await cycle.execute(mockBrowserObj);
    orchestrator.releaseOwnership('browser-1', workflowCmd.runId);

    console.log("=== EXPERIMENT 2: TYPING RACE ===");
    const daemonPromise = daemon._evaluateLoop([mockBrowserObj], 1.85, 0);
    
    // Trigger halfway through
    setTimeout(async () => {
        const cmdRace = new Command({ type: 'click', payload: { selector: '.m-btn-place', sid: { text: 'place bet' } } });
        const interceptedRace = router.interceptDomSync(cmdRace, 'browser-1');
        const workflowCmdRace = interceptedRace[1];

        if (!workflowCmdRace) throw new Error("Race Intercept failed!");

        const cycleRace = new BetCycle({
            runId: workflowCmdRace.runId,
            cycleId: 'C2',
            policySnapshot: mockPolicyManager.getPolicy(),
            adapter: mockAdapter,
            simulator: simulator,
            runOrchestrator: orchestrator
        });
        
        await cycleRace.execute(mockBrowserObj);
        orchestrator.releaseOwnership('browser-1', workflowCmdRace.runId);
    }, 15);

    await daemonPromise;
    await new Promise(r => setTimeout(r, 2000));
}

runExperiment().then(() => console.log('Done')).catch(console.error);
