import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventEmitter from 'node:events';
import { HealthMonitor } from '../HealthMonitor.mjs';
import { BrowserStateRegistry } from '../../synchronization/BrowserStateRegistry.mjs';
import featureFlags from '../../execution/locatorIntelligence/FeatureFlags.mjs';

describe('Task 3.2: Watchdog Reboots Strictly Restricted to Physical Crashes & Heartbeat Silence', () => {
    let registry;
    let healthMonitor;
    let healCommands;
    let mockBrowser;

    beforeEach(() => {
        featureFlags.resetForTesting({ V3_DECOUPLE_HEALTH_MONITOR: true });
        registry = new BrowserStateRegistry();
        healthMonitor = new HealthMonitor(registry);
        healCommands = [];

        healthMonitor.on('Command', (cmd) => {
            if (cmd.type === 'HEAL_REQUESTED') {
                healCommands.push(cmd);
            }
        });

        mockBrowser = { isConnected: () => true };
        const mockContext = {};
        const mockPage = { isClosed: () => false };
        registry.register('slave-1', 'slave', mockBrowser, mockContext, mockPage);
        registry.updateState('slave-1', 'Ready');
    });

    afterEach(() => {
        healthMonitor.stopMonitoring();
        vi.restoreAllMocks();
    });

    it('should trigger HEAL_REQUESTED when Playwright browser disconnected (BrowserDisconnectedError)', () => {
        mockBrowser.isConnected = () => false;
        
        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(1);
        expect(healCommands[0].target).toBe('slave-1');
        expect(healCommands[0].payload.reason).toContain('BrowserDisconnectedError');
        expect(registry.get('slave-1').state).toBe('Recovering');
    });

    it('should trigger HEAL_REQUESTED on physical browser disconnect flag', () => {
        const stateObj = registry.get('slave-1');
        stateObj.isDisconnected = true;

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(1);
        expect(healCommands[0].payload.reason).toContain('Physical browser disconnect');
    });

    it('should trigger HEAL_REQUESTED on OS process crash or OOM fault', () => {
        const stateObj = registry.get('slave-1');
        stateObj.oomFault = true;

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(1);
        expect(healCommands[0].payload.reason).toContain('OOM fault detected');
    });

    it('should trigger HEAL_REQUESTED on WebSocket heartbeat silence (> 5,000ms)', () => {
        const stateObj = registry.get('slave-1');
        stateObj.healthMetrics.lastHeartbeat = Date.now() - 6000; // 6 seconds silent

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(1);
        expect(healCommands[0].payload.reason).toContain('WebSocket heartbeat silence exceeded 5,000ms');
    });

    it('should NOT trigger HEAL_REQUESTED when heartbeat silence is under 5,000ms', () => {
        const stateObj = registry.get('slave-1');
        stateObj.healthMetrics.lastHeartbeat = Date.now() - 2000; // 2 seconds silent

        healthMonitor.checkHealth();
        expect(healCommands.length).toBe(0);
    });
});
