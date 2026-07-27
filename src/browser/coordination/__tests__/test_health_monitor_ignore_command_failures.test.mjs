import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventEmitter from 'node:events';
import { HealthMonitor } from '../HealthMonitor.mjs';
import { BrowserStateRegistry } from '../../synchronization/BrowserStateRegistry.mjs';
import { EventBusRegistrar } from '../EventBusRegistrar.mjs';
import featureFlags from '../../execution/locatorIntelligence/FeatureFlags.mjs';

describe('Task 3.1 & 3.2: HealthMonitor Decoupled from Command Execution Failures', () => {
    let registry;
    let healthMonitor;
    let simulator;
    let registrar;
    let healCommands;

    beforeEach(() => {
        featureFlags.resetForTesting({ V3_DECOUPLE_HEALTH_MONITOR: true });
        registry = new BrowserStateRegistry();
        healthMonitor = new HealthMonitor(registry);
        simulator = new EventEmitter();
        healCommands = [];

        healthMonitor.on('Command', (cmd) => {
            if (cmd.type === 'HEAL_REQUESTED') {
                healCommands.push(cmd);
            }
        });

        // Initialize registrar bridge
        registrar = new EventBusRegistrar({
            commandRouter: { register: vi.fn(), route: vi.fn() },
            targetResolver: {},
            macroEngine: {},
            scheduler: {},
            registry,
            lockManager: {},
            workflowEngine: {},
            recoveryManager: new EventEmitter(),
            navSync: new EventEmitter(),
            actionDispatcher: new EventEmitter(),
            commandReceiver: new EventEmitter(),
            healthMonitor,
            syncRecoveryActionExecutor: new EventEmitter(),
            simulator
        });

        registrar.registerAll();

        const mockBrowser = { isConnected: () => true };
        const mockContext = {};
        const mockPage = { isClosed: () => false };
        registry.register('slave-1', 'slave', mockBrowser, mockContext, mockPage);
        registry.updateState('slave-1', 'Ready');
    });

    afterEach(() => {
        healthMonitor.stopMonitoring();
    });

    it('should ignore 50 consecutive LF-505 command execution failures when V3_DECOUPLE_HEALTH_MONITOR is true', () => {
        for (let i = 0; i < 50; i++) {
            simulator.emit('ActionFailure', {
                id: 'slave-1',
                command: { id: `cmd-${i}`, lifecycle: 'FAILED' },
                error: new Error('[LF-505] Resolution Aborted at L4 after 14 attempts')
            });
        }

        const stateObj = registry.get('slave-1');
        expect(stateObj.state).toBe('Ready');

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(0);
        expect(registry.get('slave-1').state).toBe('Ready');
    });

    it('should ignore 10 consecutive LF-505 locator errors without emitting HEAL_REQUESTED', () => {
        for (let i = 0; i < 10; i++) {
            simulator.emit('ActionFailure', {
                id: 'slave-1',
                error: new Error('[LF-505] Locator not found')
            });
        }

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(0);
    });

    it('should NOT trigger recovery in decoupled mode even if browser state was marked Error by legacy code', () => {
        registry.updateState('slave-1', 'Error'); // simulated legacy state setting
        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(0);
    });

});
