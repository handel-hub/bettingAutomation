import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionDispatcher } from '../../ActionDispatcher.mjs';

describe('Phase 2 — Browser Runtime Epoch Ownership Verification', () => {
    let dispatcher;

    beforeEach(async () => {
        dispatcher = new ActionDispatcher({});
        await dispatcher.buildInjectedScript();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete globalThis.window;
        delete globalThis.document;
        delete globalThis.history;
        delete globalThis.location;
        delete globalThis.performance;
    });

    it('should include all epoch initialization guards in injected script', () => {
        const script = dispatcher.cachedScriptContent;
        expect(script).toContain('window.__ANTIGRAVITY_EPOCH__ = window.__ANTIGRAVITY_EPOCH__ || 0;');
        expect(script).toContain('window.__ANTIGRAVITY_EPOCH_URL__ = window.__ANTIGRAVITY_EPOCH_URL__ || location.href;');
        expect(script).toContain('window.__ANTIGRAVITY_EPOCH_TS__ = window.__ANTIGRAVITY_EPOCH_TS__ || Date.now();');
    });

    it('should include History API SPA navigation patches in injected script', () => {
        const script = dispatcher.cachedScriptContent;
        expect(script).toContain('const _origPush = history.pushState;');
        expect(script).toContain('const _origReplace = history.replaceState;');
        expect(script).toContain('window.__notifyNavigation({');
        expect(script).toContain("type: 'pushState',");
        expect(script).toContain("type: 'replaceState',");
        expect(script).toContain("type: 'popstate',");
    });

    it('should include client-stamping fields and payloadVersion 3 in sendExecution', () => {
        const script = dispatcher.cachedScriptContent;
        expect(script).toContain('payload.captureEpoch = window.__ANTIGRAVITY_EPOCH__ || 0;');
        expect(script).toContain("payload.captureEpochUrl = window.__ANTIGRAVITY_EPOCH_URL__ || '';");
        expect(script).toContain('payload.capturePerformanceTime = performance.now();');
        expect(script).toContain('payload.payloadVersion = 3;');
    });

    it('should preserve interactionId at root level of interaction payload', () => {
        const script = dispatcher.cachedScriptContent;
        expect(script).toContain("interactionId: 'ia-' + generateUUID().split('-')[0],");
    });

    it('should correctly execute History API patches and trigger __notifyNavigation in mock browser environment', async () => {
        const origPushState = vi.fn();
        const origReplaceState = vi.fn();
        const notifyNav = vi.fn();
        const addEvent = vi.fn();

        globalThis.window = {
            addEventListener: addEvent,
            __notifyNavigation: notifyNav
        };
        globalThis.document = {
            addEventListener: vi.fn(),
            createTreeWalker: vi.fn()
        };
        globalThis.history = {
            pushState: origPushState,
            replaceState: origReplaceState
        };
        globalThis.location = { href: 'http://example.com/test' };
        globalThis.performance = { now: () => 999.99 };

        // Execute the injected script in our mock environment
        eval(dispatcher.cachedScriptContent);

        // Verify globals were initialized
        expect(globalThis.window.__ANTIGRAVITY_EPOCH__).toBe(0);
        expect(globalThis.window.__ANTIGRAVITY_EPOCH_URL__).toBe('http://example.com/test');
        expect(globalThis.window.__ANTIGRAVITY_EPOCH_TS__).toBeDefined();

        // Trigger pushState and replaceState
        globalThis.history.pushState({ page: 1 }, 'Title', '/page1');
        expect(origPushState).toHaveBeenCalledWith({ page: 1 }, 'Title', '/page1');
        expect(notifyNav).toHaveBeenCalledWith({
            type: 'pushState',
            url: 'http://example.com/test',
            epoch: 0
        });

        globalThis.history.replaceState({ page: 2 }, 'Title 2', '/page2');
        expect(origReplaceState).toHaveBeenCalledWith({ page: 2 }, 'Title 2', '/page2');
        expect(notifyNav).toHaveBeenCalledWith({
            type: 'replaceState',
            url: 'http://example.com/test',
            epoch: 0
        });

        // Verify popstate listener was registered
        expect(addEvent).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should stamp payload with captureEpoch, captureEpochUrl, capturePerformanceTime, and payloadVersion 3 when sendExecution runs', async () => {
        const dispatchEvent = vi.fn();

        globalThis.window = {
            addEventListener: vi.fn(),
            dispatchExecutionEvent: dispatchEvent,
            __ANTIGRAVITY_EPOCH__: 5,
            __ANTIGRAVITY_EPOCH_URL__: 'http://example.com/epoch5'
        };
        globalThis.document = {
            addEventListener: vi.fn()
        };
        globalThis.history = { pushState: vi.fn(), replaceState: vi.fn() };
        globalThis.location = { href: 'http://example.com/epoch5' };
        globalThis.performance = { now: () => 456.78 };

        eval(dispatcher.cachedScriptContent);

        // Trigger a pointer event via the collector handler
        const mockEvent = {
            isTrusted: true,
            type: 'click',
            target: { tagName: 'BUTTON', getAttribute: () => null },
            clientX: 10,
            clientY: 20
        };

        window.interactionCollector.handle(mockEvent);

        expect(dispatchEvent).toHaveBeenCalled();
        const callArgs = dispatchEvent.mock.calls[0][0];
        expect(callArgs.type).toBe('CLICK');
        expect(callArgs.payload.captureEpoch).toBe(5);
        expect(callArgs.payload.captureEpochUrl).toBe('http://example.com/epoch5');
        expect(callArgs.payload.capturePerformanceTime).toBe(456.78);
        expect(callArgs.payload.payloadVersion).toBe(3);
        expect(callArgs.payload.sequenceNumber).toBe(1);
        expect(callArgs.payload.interactionId).toMatch(/^ia-[0-9a-f]+$/);
    });
});
