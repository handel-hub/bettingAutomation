import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionDispatcher } from '../../ActionDispatcher.mjs';
import { BrowserStateRegistry } from '../../../synchronization/BrowserStateRegistry.mjs';
import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

describe('Phase 3 — Master Browser Epoch Lifecycle & Navigation Tracking Verification', () => {
    let dispatcher;
    let registry;
    let mockMasterPage;
    let bindings;
    let eventListeners;

    beforeEach(() => {
        TelemetryCollector.reset();
        registry = new BrowserStateRegistry();
        // Initialize master browser state in registry
        registry.update('master', {
            navigationContext: {
                currentURL: 'http://example.com/init',
                navigationId: 'nav-1',
                startedAt: Date.now(),
                navigationType: 'load'
            }
        });
        registry.updateUrl('master', 'http://example.com/init');

        bindings = {};
        eventListeners = {};

        mockMasterPage = {
            addInitScript: vi.fn().mockResolvedValue(),
            evaluate: vi.fn().mockResolvedValue(),
            exposeFunction: vi.fn().mockResolvedValue(),
            exposeBinding: vi.fn().mockImplementation(async (name, cb) => {
                bindings[name] = cb;
            }),
            on: vi.fn().mockImplementation((event, cb) => {
                eventListeners[event] = cb;
            }),
            url: vi.fn().mockReturnValue('http://example.com/init'),
            isClosed: vi.fn().mockReturnValue(false)
        };

        dispatcher = new ActionDispatcher({}, registry);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should wire __notifyNavigation binding and framenavigated listener during injectMasterListeners', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        expect(mockMasterPage.exposeBinding).toHaveBeenCalledWith('__notifyNavigation', expect.any(Function));
        expect(mockMasterPage.on).toHaveBeenCalledWith('framenavigated', expect.any(Function));
        expect(bindings.__notifyNavigation).toBeDefined();
        expect(eventListeners.framenavigated).toBeDefined();
    });

    it('should ignore subframe navigations and malformed payloads in handleSpaNavigation', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        const subFrame = {
            parentFrame: vi.fn().mockReturnValue({ id: 'parent-frame' })
        };

        const initialEpoch = registry.getState('master').navigationEpoch;

        // Test subframe navigation
        await dispatcher.handleSpaNavigation(subFrame, { type: 'pushState', url: 'http://example.com/sub' });
        expect(registry.getState('master').navigationEpoch).toBe(initialEpoch);
        expect(mockMasterPage.evaluate).toHaveBeenCalledTimes(1); // Only the initial evaluation in injectMasterListeners

        // Test malformed payload (null navEvent)
        await dispatcher.handleSpaNavigation(null, { type: 'pushState', url: 'http://example.com/null' });
        expect(registry.getState('master').navigationEpoch).toBe(initialEpoch);
    });

    it('should advance epoch in registry and inject into DOM when handleSpaNavigation runs for main frame', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        const mainFrame = {
            parentFrame: vi.fn().mockReturnValue(null)
        };

        const initialEpoch = registry.getState('master').navigationEpoch;
        expect(initialEpoch).toBeGreaterThanOrEqual(1);

        // Trigger SPA navigation binding
        await bindings.__notifyNavigation({ frame: mainFrame }, {
            type: 'pushState',
            url: 'http://example.com/spa-page'
        });

        const updatedState = registry.getState('master');
        expect(updatedState.navigationEpoch).toBe(initialEpoch + 1);
        expect(updatedState.url).toBe('http://example.com/spa-page');

        // Verify evaluate was called to inject new epoch into DOM
        expect(mockMasterPage.evaluate).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                epoch: initialEpoch + 1,
                url: 'http://example.com/spa-page',
                ts: expect.any(Number)
            })
        );

        // Verify telemetry was recorded
        const snap = TelemetryCollector.snapshot();
        expect(snap.epochSync.spaNavigationDetected).toBe(1);
    });

    it('should advance epoch when framenavigated fires on main frame', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        const mainFrame = {
            parentFrame: vi.fn().mockReturnValue(null),
            url: vi.fn().mockReturnValue('http://example.com/full-nav')
        };

        const initialEpoch = registry.getState('master').navigationEpoch;
        await eventListeners.framenavigated(mainFrame);

        const updatedState = registry.getState('master');
        expect(updatedState.navigationEpoch).toBe(initialEpoch + 1);
        expect(updatedState.url).toBe('http://example.com/full-nav');
    });

    it('should gracefully abort _advanceEpoch without calling evaluate if masterPage is closed', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        mockMasterPage.isClosed.mockReturnValue(true);

        const mainFrame = { parentFrame: () => null };
        await dispatcher.handleSpaNavigation(mainFrame, { type: 'pushState', url: 'http://example.com/closed' });

        // Evaluate should not be called again after closure
        expect(mockMasterPage.evaluate).toHaveBeenCalledTimes(1); // Only initial injection
    });

    it('should increment navigationEpoch even if URL is identical during SPA navigation', async () => {
        await dispatcher.injectMasterListeners(mockMasterPage);

        const mainFrame = { parentFrame: () => null };
        const initialEpoch = registry.getState('master').navigationEpoch;

        // Navigate to exact same URL (e.g. hash or state replacement)
        await dispatcher.handleSpaNavigation(mainFrame, { type: 'replaceState', url: 'http://example.com/init' });

        const updatedState = registry.getState('master');
        expect(updatedState.navigationEpoch).toBe(initialEpoch + 1);
        expect(updatedState.url).toBe('http://example.com/init');
    });
});
