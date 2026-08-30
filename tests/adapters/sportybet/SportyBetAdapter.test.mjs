import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportyBetAdapter } from '../../../src/browser/adapters/sportybet/SportyBetAdapter.mjs';

describe('SportyBetAdapter', () => {
    let adapter;
    let page;

    beforeEach(() => {
        adapter = new SportyBetAdapter();
        // Mock Playwright Page
        page = {
            locator: vi.fn(),
            waitForFunction: vi.fn(),
            waitForSelector: vi.fn()
        };
    });

    describe('translateStake', () => {
        it('translates a stake into the correct sequence of burst commands with macro delays', () => {
            const commands = adapter.translateStake(105);
            
            // 1 click, 1 clear, 3 digits, 1 done = 6 actions
            // plus delays after click, clear, and each digit (5 delays)
            // Total = 11 commands
            expect(commands.length).toBe(11);
            
            // Starts with CLICK on stake input
            expect(commands[0].type).toBe('CLICK');
            expect(commands[0].payload.selector).toBe('.m-betslips-stake .m-keybord-input');
            
            // Delay enforcing reactivity
            expect(commands[1].type).toBe('MACRO_DELAY');
            expect(commands[1].payload.durationMs).toBe(250);
            
            // Clear burst
            expect(commands[2].type).toBe('EVENT_BURST');
            expect(commands[2].payload.selector).toBe('[data-key="clear"]');
            
            // Digits
            expect(commands[4].payload.selector).toBe('[data-key="1"]');
            expect(commands[6].payload.selector).toBe('[data-key="0"]');
            expect(commands[8].payload.selector).toBe('[data-key="5"]');
            
            // Done burst (no trailing delay required before return)
            expect(commands[10].type).toBe('EVENT_BURST');
            expect(commands[10].payload.selector).toBe('[data-key="done"]');
        });
    });

    describe('translatePlaceBet', () => {
        it('translates place bet correctly with idempotent: false', () => {
            const cmd = adapter.translatePlaceBet();
            expect(cmd.type).toBe('CLICK');
            expect(cmd.payload.selector).toBe('.place-bet.real-theme');
            expect(cmd.payload.idempotent).toBe(false); // CRITICAL: Never retry
        });
    });

    describe('translateRebet', () => {
        it('translates rebet intent into an idempotent generic CLICK', () => {
            const cmd = adapter.translateRebet();
            expect(cmd.type).toBe('CLICK');
            expect(cmd.payload.selector).toBe('button.af-button.rebet');
            expect(cmd.payload.idempotent).toBe(true);
        });
    });

    describe('ResultResolver', () => {
        it('resolves an UNCERTAIN state if the timeout window expires without primary evidence', async () => {
            // Simulate the waitForFunction timing out by throwing the Playwright TimeoutError
            page.waitForFunction.mockRejectedValue(new Error('Timeout 30000ms exceeded.'));
            
            const result = await adapter.observeResult(page, 50);
            expect(result.status).toBe('UNCERTAIN');
            expect(result.detail).toContain('Primary DOM evidence missing');
        });
    });

    describe('BetslipObserver', () => {
        it('returns INTERRUPT_REQUIRED if odds change text populates', async () => {
            page.locator.mockReturnValue({
                isVisible: vi.fn().mockResolvedValue(true),
                innerText: vi.fn().mockResolvedValue('Odds have changed from 1.25 to 1.24')
            });

            const interrupt = await adapter.checkInterrupts(page);
            expect(interrupt.status).toBe('INTERRUPT_REQUIRED');
            expect(interrupt.reason).toBe('PRICE');
        });

        it('returns CLEAR if notification banner is empty', async () => {
            page.locator.mockReturnValue({
                isVisible: vi.fn().mockResolvedValue(true),
                innerText: vi.fn().mockResolvedValue('')
            });

            const interrupt = await adapter.checkInterrupts(page);
            expect(interrupt.status).toBe('CLEAR');
        });
    });
});
