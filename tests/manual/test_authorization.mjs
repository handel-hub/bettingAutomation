import assert from 'node:assert';
import { BettingAuthorizationRegistry } from '../../src/browser/execution/BettingAuthorizationRegistry.mjs';
import { RunOrchestrator } from '../../src/browser/coordination/RunOrchestrator.mjs';
import { BetCycle } from '../../src/browser/workflows/BetCycle.mjs';
import { logger } from '../../src/utils/logger.mjs';

// Suppress logs during testing
logger.level = 'silent';

async function runTests() {
    console.log('--- Running Betting Authorization Tests ---');
    
    // 1. Registry Basic
    const registry = new BettingAuthorizationRegistry();
    assert.strictEqual(registry.isAuthorized('slave_0'), false, 'Default should be FAIL-CLOSED (false)');
    
    registry.enable('slave_0');
    assert.strictEqual(registry.isAuthorized('slave_0'), true, 'Should be true after enable');
    
    registry.disable('slave_0');
    assert.strictEqual(registry.isAuthorized('slave_0'), false, 'Should be false after disable');
    
    // 2. Isolation
    registry.enable('master');
    registry.disable('slave_0');
    registry.enable('slave_1');
    assert.strictEqual(registry.isAuthorized('master'), true);
    assert.strictEqual(registry.isAuthorized('slave_0'), false);
    assert.strictEqual(registry.isAuthorized('slave_1'), true);
    
    // 3. Early Rejection in RunOrchestrator
    const activeRuns = new Map();
    // Stub RunLedger, registry, commandRouter
    const mockRunLedger = {};
    const mockStateRegistry = {};
    const mockCommandRouter = {};
    const orchestrator = new RunOrchestrator(mockRunLedger, mockStateRegistry, mockCommandRouter, registry);
    
    // Attempt acquire for disabled account
    const lease1 = orchestrator.acquireOwnership('slave_0', 'DOM_SYNC');
    assert.strictEqual(lease1, null, 'Should reject ownership for unauthorized account');
    
    // Attempt acquire for enabled account
    const lease2 = orchestrator.acquireOwnership('master', 'DOM_SYNC');
    assert.notStrictEqual(lease2, null, 'Should grant ownership for authorized account');
    
    // 4. Transaction Boundary in BetCycle
    // Let's create a cycle for an authorized account
    registry.enable('slave_2');
    let cycle = new BetCycle({
        runId: 'run-123',
        cycleId: 'cycle-123',
        policySnapshot: {},
        adapter: {},
        simulator: {},
        runOrchestrator: orchestrator,
        bettingAuthorizationRegistry: registry
    });
    
    // Mock browserObj
    let mockBrowserObj = {
        id: 'slave_2',
        page: { evaluate: async () => ({}) }
    };
    
    // Revoke before execute
    registry.disable('slave_2');
    let result = await cycle.execute(mockBrowserObj);
    assert.strictEqual(result.status, 'ABORTED', 'Should abort if revoked before execute');
    assert.strictEqual(result.reason, 'UNAUTHORIZED_FOR_BETTING');

    console.log('All tests passed successfully!');
}

runTests().catch(console.error);
