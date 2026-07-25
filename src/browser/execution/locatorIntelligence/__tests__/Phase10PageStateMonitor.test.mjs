import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PageStateMonitor, pageStateMonitor } from '../resolution/PageStateMonitor.mjs';

describe('Phase 10: PageStateMonitor Unit Tests', () => {
    let mockPage;
    let evalMock;

    beforeEach(() => {
        // We will mock page.evaluate. It takes a function and args.
        // We'll simulate the window.__pgMonitorMutCount state.
        let mutCount = undefined;
        let observerAttached = false;
        
        evalMock = vi.fn().mockImplementation(async (fn, ...args) => {
            const fnStr = fn.toString();
            if (fnStr.includes('window.__pgMonitorMutCount !== undefined')) {
                // This is the attach script
                if (mutCount !== undefined) return;
                mutCount = 0;
                observerAttached = true;
                return;
            } else if (fnStr.includes('window.__pgMonitorMutCount || 0')) {
                // This is the get count script
                return mutCount || 0;
            } else if (fnStr.includes('delete window.__pgMonitorObserver')) {
                // This is the detach script
                observerAttached = false;
                mutCount = undefined;
                return;
            }
        });

        mockPage = {
            evaluate: evalMock,
            isClosed: vi.fn().mockReturnValue(false)
        };
        
        // Expose mutCount controller for tests
        mockPage.__setMutCount = (count) => { mutCount = count; };
        mockPage.__getObserverAttached = () => observerAttached;
    });

    afterEach(async () => {
        await pageStateMonitor.detach(mockPage);
        vi.restoreAllMocks();
    });

    it('should attach correctly and initialize state', async () => {
        await pageStateMonitor.attach(mockPage);
        expect(mockPage.__getObserverAttached()).toBe(true);
        expect(pageStateMonitor.pageStates.has(mockPage)).toBe(true);
    });

    it('should not throw if attach fails', async () => {
        const errorPage = {
            evaluate: vi.fn().mockRejectedValue(new Error('Target closed'))
        };
        await expect(pageStateMonitor.attach(errorPage)).resolves.not.toThrow();
    });

    it('should return UNKNOWN and attempt attach if not already attached', async () => {
        const monitor = new PageStateMonitor();
        const attachSpy = vi.spyOn(monitor, 'attach');
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('UNKNOWN');
        expect(attachSpy).toHaveBeenCalledWith(mockPage);
    });

    it('should report RENDERING for >20 mutations/200ms', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        
        // Fast forward mock time by overriding the state's lastTimestamp
        const stateRecord = monitor.pageStates.get(mockPage);
        stateRecord.lastTimestamp = Date.now() - 200; // 200ms ago
        
        mockPage.__setMutCount(25); // 25 mutations in 200ms
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('RENDERING');
    });

    it('should report RENDERING for 5-20 mutations/200ms', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        
        const stateRecord = monitor.pageStates.get(mockPage);
        stateRecord.lastTimestamp = Date.now() - 200; // 200ms ago
        
        mockPage.__setMutCount(10); // 10 mutations in 200ms
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('RENDERING');
    });

    it('should report STABLE for 1-5 mutations/200ms', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        
        const stateRecord = monitor.pageStates.get(mockPage);
        stateRecord.lastTimestamp = Date.now() - 200; // 200ms ago
        
        mockPage.__setMutCount(2); // 2 mutations in 200ms
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('STABLE');
    });

    it('should report IDLE if 0 mutations and >= 500ms passed', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        
        const stateRecord = monitor.pageStates.get(mockPage);
        stateRecord.lastTimestamp = Date.now() - 500; // 500ms ago
        
        mockPage.__setMutCount(0); // 0 mutations
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('IDLE');
    });

    it('should return NAVIGATING if evaluate throws execution context destroyed', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        
        mockPage.evaluate = vi.fn().mockRejectedValue(new Error('Execution context was destroyed'));
        
        const state = await monitor.getStabilityState(mockPage);
        expect(state).toBe('NAVIGATING');
    });

    it('should clean up on detach', async () => {
        const monitor = new PageStateMonitor();
        await monitor.attach(mockPage);
        expect(monitor.pageStates.has(mockPage)).toBe(true);
        
        await monitor.detach(mockPage);
        expect(mockPage.__getObserverAttached()).toBe(false);
        expect(monitor.pageStates.has(mockPage)).toBe(false);
    });
});
