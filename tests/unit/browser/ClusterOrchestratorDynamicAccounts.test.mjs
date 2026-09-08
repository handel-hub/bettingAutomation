import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClusterOrchestrator } from '../../../src/browser/coordination/ClusterOrchestrator.mjs';

describe('ClusterOrchestrator Dynamic Account Management', () => {
    let orchestrator;
    let mockRegistry;
    let mockLifecycleManager;
    let mockSessionManager;
    let mockStateObserver;
    let mockBettingAuth;

    beforeEach(() => {
        const browsers = new Map();

        mockRegistry = {
            states: browsers,
            getAll: vi.fn(() => Array.from(browsers.values())),
            get: vi.fn((id) => browsers.get(id)),
            remove: vi.fn((id) => browsers.delete(id))
        };

        mockLifecycleManager = {
            spawnBrowser: vi.fn(async (id, role, proxyUrl, username) => {
                browsers.set(id, {
                    id,
                    role,
                    username,
                    proxyUrl,
                    state: 'Ready',
                    page: {},
                    browser: {
                        close: vi.fn().mockResolvedValue()
                    }
                });
            })
        };

        mockSessionManager = {
            restoreOrLogin: vi.fn().mockResolvedValue(true)
        };

        mockStateObserver = {
            injectObservers: vi.fn().mockResolvedValue()
        };

        mockBettingAuth = {
            enable: vi.fn(),
            disable: vi.fn()
        };

        orchestrator = new ClusterOrchestrator({
            settings: {
                Spawning: { max_accounts_to_spawn: '1' },
                Proxy: { proxy_failure_mode: 'relaxed' },
                Memory: {}
            },
            accounts: [{ username: 'master_user', password: 'pw' }],
            proxies: ['http://proxy1:8080'],
            registry: mockRegistry,
            lifecycleManager: mockLifecycleManager,
            sessionManager: mockSessionManager,
            stateObserver: mockStateObserver,
            bettingAuthorizationRegistry: mockBettingAuth,
            capabilityRegistry: { registerProvider: vi.fn() },
            syncManager: {},
            macroEngine: {},
            actionDispatcher: {},
            healthMonitor: {},
            commandReceiver: {},
            scheduler: {},
            navSync: {},
            passiveShadowDaemon: null
        });
    });

    it('returns accurate active browser count', () => {
        expect(orchestrator.getActiveBrowserCount()).toBe(0);

        mockRegistry.states.set('master', { id: 'master', state: 'Ready' });
        mockRegistry.states.set('slave_0', { id: 'slave_0', state: 'Busy' });
        mockRegistry.states.set('slave_1', { id: 'slave_1', state: 'Error' });

        expect(orchestrator.getActiveBrowserCount()).toBe(2);
    });

    it('dynamically activates a new slave account', async () => {
        const slave = await orchestrator.activateAccount({
            username: 'slave_user_99',
            password: 'secret_password'
        });

        expect(slave).toBeDefined();
        expect(slave.username).toBe('slave_user_99');
        expect(mockLifecycleManager.spawnBrowser).toHaveBeenCalled();
        expect(mockSessionManager.restoreOrLogin).toHaveBeenCalledWith(slave.id, 'slave_user_99', 'secret_password');
        expect(mockStateObserver.injectObservers).toHaveBeenCalled();
        expect(mockBettingAuth.enable).toHaveBeenCalledWith(slave.id);
    });

    it('returns existing browser if account is already active', async () => {
        const existingBrowser = { id: 'slave_existing', username: 'existing_user', state: 'Ready' };
        mockRegistry.states.set('slave_existing', existingBrowser);

        const result = await orchestrator.activateAccount({
            username: 'existing_user',
            password: 'pw'
        });

        expect(result).toBe(existingBrowser);
        expect(mockLifecycleManager.spawnBrowser).not.toHaveBeenCalled();
    });

    it('dynamically deactivates an existing account', async () => {
        const closeMock = vi.fn().mockResolvedValue();
        mockRegistry.states.set('slave_to_remove', {
            id: 'slave_to_remove',
            username: 'remove_user',
            browser: { close: closeMock }
        });

        const ok = await orchestrator.deactivateAccount('slave_to_remove');
        expect(ok).toBe(true);
        expect(mockBettingAuth.disable).toHaveBeenCalledWith('slave_to_remove');
        expect(closeMock).toHaveBeenCalled();
        expect(mockRegistry.remove).toHaveBeenCalledWith('slave_to_remove');
    });

    it('returns false when deactivating non-existent account', async () => {
        const ok = await orchestrator.deactivateAccount('non_existent_id');
        expect(ok).toBe(false);
    });
});
