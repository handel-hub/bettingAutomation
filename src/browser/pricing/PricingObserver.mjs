/**
 * PricingObserver - Autonomous Edge-Compute Component
 * Tracks physical reality (DOM) and notifies the State Machine of mutations.
 */

export class PricingObserver {
    /**
     * @param {Object} selectors - Maps domain fields to CSS selectors
     * @param {Document} doc - The DOM Document context (default global window.document)
     */
    constructor(selectors, doc = typeof document !== 'undefined' ? document : null) {
        this.selectors = selectors;
        this.doc = doc;
        this.observer = null;
        this.listeners = new Set();
        this.currentHash = null;
    }

    on(event, callback) {
        this.listeners.add({ event, callback });
    }

    emit(event, payload = null) {
        this.listeners.forEach(l => {
            if (l.event === event) l.callback(payload);
        });
    }

    start() {
        if (!this.doc) throw new Error("Document context is required for PricingObserver");

        // 1. Initial snapshot
        this.currentHash = this.generateHash();

        // 2. Setup Mutation Observer on the body (or specific containers if configured)
        this.observer = new MutationObserver((mutations) => {
            const newHash = this.generateHash();
            if (newHash !== this.currentHash) {
                this.currentHash = newHash;
                this.emit('DOM_MUTATED', { hash: newHash });
            }
        });

        this.observer.observe(this.doc.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Safety polling net for SPAs that might evade standard mutation checks
        this.pollInterval = setInterval(() => {
            const newHash = this.generateHash();
            if (newHash !== this.currentHash) {
                this.currentHash = newHash;
                this.emit('DOM_MUTATED', { hash: newHash });
            }
        }, 200);

        this.emit('DOM_STABLE');
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Extracts the raw observation from the DOM.
     * @returns {Object} MarketObservation
     */
    getSnapshot() {
        if (!this.doc) return null;

        // Example Extraction (Implementation would be tailored to the specific target platform's selectors)
        const rawOdds = this._extractText(this.selectors.odds);
        const rawBalance = this._extractText(this.selectors.balance);
        const isSuspended = this._checkExists(this.selectors.suspendedOverlay);
        
        return {
            timestampMs: Date.now(),
            odds: parseFloat(rawOdds || '0'),
            balance: this._parseCurrencyToCents(rawBalance),
            platformMax: this._parseCurrencyToCents(this._extractText(this.selectors.platformMax)),
            platformMin: this._parseCurrencyToCents(this._extractText(this.selectors.platformMin)),
            currencyIncrement: 100, // Hardcoded to 1.00 base unit for this example
            marketSuspended: isSuspended,
            domHash: this.generateHash()
        };
    }

    /**
     * Generates a synchronous, lightweight hash of the observed elements.
     * Synchronous hashing is critical to prevent TOCTOU yielding during Pre-Flight.
     */
    generateHash() {
        if (!this.doc) return null;
        
        const o = this._extractText(this.selectors.odds);
        const b = this._extractText(this.selectors.balance);
        const s = this._checkExists(this.selectors.suspendedOverlay);
        
        // A simple synchronous string concatenation is highly effective for TOCTOU checks
        const raw = `${o}:${b}:${s}`;
        return this._syncStringHash(raw);
    }

    // --- Private DOM Helpers ---

    _extractText(selector) {
        if (!selector) return null;
        const el = this.doc.querySelector(selector);
        return el ? el.innerText.trim() : null;
    }

    _checkExists(selector) {
        if (!selector) return false;
        return !!this.doc.querySelector(selector);
    }

    _parseCurrencyToCents(raw) {
        if (!raw) return null;
        const cleaned = raw.replace(/[^0-9.]/g, '');
        if (!cleaned) return null;
        return Math.floor(parseFloat(cleaned) * 100);
    }

    _syncStringHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash.toString(16);
    }
}
