export class KeyboardController {
    constructor(registry) {
        this.registry = registry;
        // As defined in the Phase 4 Audit: 250ms inter-digit pacing is required
        // to prevent Vue.js from dropping rapid reactive state updates.
        this.delayMs = 250;
    }

    /**
     * Translates a numeric stake amount into a sequence of generic commands.
     * @param {number|string} amount
     * @returns {Array<Object>} Array of Command payloads for the generic engine
     */
    translateStake(amount) {
        const amountStr = amount.toString();
        const commands = [];

        // 1. Click the actual stake display to pop up the hidden virtual keyboard
        commands.push(this._createClick(this.registry.stakeInput));
        commands.push(this._createDelay());

        // 2. Aggressively clear any pre-filled or leftover stake
        commands.push(this._createBurst(this.registry.getKeySelector('clear')));
        commands.push(this._createDelay());

        // 3. Dispatch sequential touches for each digit in the amount
        for (const char of amountStr) {
            // Skips invalid characters (though amount should be sanitized before getting here)
            if (!/[0-9.]/.test(char)) continue;
            
            commands.push(this._createBurst(this.registry.getKeySelector(char)));
            commands.push(this._createDelay());
        }

        // 4. Click 'Done' to collapse the keyboard and trigger final client-side pot win calculation
        commands.push(this._createBurst(this.registry.getKeySelector('done')));

        return commands;
    }

    _createClick(selector) {
        // Use EVENT_BURST for the initial input focus as well, as Playwright's 
        // strict visibility checks on .click() often fail on mobile SPA overlays.
        return {
            type: 'EVENT_BURST',
            payload: { 
                selector: selector, 
                idempotent: true,
                eventInit: { bubbles: true }
            }
        };
    }

    _createBurst(selector) {
        // EVENT_BURST maps to the engine's aggressive touchstart/touchend simulation
        return {
            type: 'EVENT_BURST',
            payload: { 
                selector: selector, 
                idempotent: true,
                eventInit: { bubbles: true }
            }
        };
    }

    _createDelay() {
        return {
            type: 'MACRO_DELAY',
            payload: { ms: this.delayMs }
        };
    }
}
