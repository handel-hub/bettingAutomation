export class TextIndex {
    constructor() {
        this.map = new Map(); // normalizedToken -> Set<Element>
    }

    static normalize(text) {
        if (!text || typeof text !== 'string') return '';
        return text.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 256);
    }

    add(element, rawText) {
        if (!element || !rawText || typeof rawText !== 'string') return;
        const normalized = TextIndex.normalize(rawText);
        if (!normalized) return;

        let set = this.map.get(normalized);
        if (!set) {
            set = new Set();
            this.map.set(normalized, set);
        }
        set.add(element);

        if (normalized.indexOf(' ') !== -1) {
            let start = 0;
            for (let i = 0; i <= normalized.length; i++) {
                if (i === normalized.length || normalized.charCodeAt(i) === 32) {
                    if (i - start >= 2) {
                        const word = normalized.slice(start, i);
                        if (word !== normalized) {
                            let wSet = this.map.get(word);
                            if (!wSet) {
                                wSet = new Set();
                                this.map.set(word, wSet);
                            }
                            wSet.add(element);
                        }
                    }
                    start = i + 1;
                }
            }
        }
    }

    remove(element) {
        if (!element) return;
        for (const [key, set] of this.map.entries()) {
            if (set.has(element)) {
                set.delete(element);
                if (set.size === 0) {
                    this.map.delete(key);
                }
            }
        }
    }

    get(text) {
        const normalized = TextIndex.normalize(text);
        if (!normalized) return new Set();
        return this.map.get(normalized) || new Set();
    }

    clear() {
        this.map.clear();
    }

    get size() {
        return this.map.size;
    }
}
export default TextIndex;
