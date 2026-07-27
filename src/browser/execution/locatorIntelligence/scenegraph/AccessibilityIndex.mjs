export class AccessibilityIndex {
    constructor() {
        this.roleMap = new Map();  // role -> Set<Element>
        this.labelMap = new Map(); // normalizedLabel -> Set<Element>
        this.elementRoles = new Map();  // Element -> string
        this.elementLabels = new Map(); // Element -> string
    }

    static normalizeLabel(label) {
        if (!label || typeof label !== 'string') return '';
        return label.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 256);
    }

    add(element) {
        if (!element || element.nodeType !== 1) return;
        
        this.remove(element);

        let role = element.getAttribute?.('role') || null;
        if (!role) {
            const tag = (element.tagName || '').toUpperCase();
            if (tag === 'BUTTON') role = 'button';
            else if (tag === 'A' && (element.hasAttribute?.('href') || element.getAttribute?.('href') !== null || element.href !== undefined)) role = 'link';
            else if (tag === 'INPUT') {
                const type = (element.getAttribute?.('type') || 'text').toLowerCase();
                if (type === 'checkbox') role = 'checkbox';
                else if (type === 'radio') role = 'radio';
                else if (type === 'submit' || type === 'button' || type === 'reset') role = 'button';
                else if (type === 'search') role = 'searchbox';
                else role = 'textbox';
            } else if (tag === 'SELECT') role = 'combobox';
            else if (tag === 'TEXTAREA') role = 'textbox';
            else if (tag === 'NAV') role = 'navigation';
            else if (tag === 'MAIN') role = 'main';
            else if (tag === 'HEADER') role = 'banner';
            else if (tag === 'FOOTER') role = 'contentinfo';
            else if (tag === 'FORM') role = 'form';
        }

        if (role) {
            role = role.toLowerCase();
            let rSet = this.roleMap.get(role);
            if (!rSet) {
                rSet = new Set();
                this.roleMap.set(role, rSet);
            }
            rSet.add(element);
            this.elementRoles.set(element, role);
        }

        const rawLabel = element.getAttribute?.('aria-label') || element.getAttribute?.('title') || element.getAttribute?.('placeholder') || element.getAttribute?.('alt') || null;
        if (rawLabel) {
            const normalized = AccessibilityIndex.normalizeLabel(rawLabel);
            if (normalized) {
                let lSet = this.labelMap.get(normalized);
                if (!lSet) {
                    lSet = new Set();
                    this.labelMap.set(normalized, lSet);
                }
                lSet.add(element);
                this.elementLabels.set(element, normalized);
            }
        }
    }

    remove(element) {
        if (!element) return;
        const role = this.elementRoles.get(element);
        if (role) {
            const rSet = this.roleMap.get(role);
            if (rSet) {
                rSet.delete(element);
                if (rSet.size === 0) {
                    this.roleMap.delete(role);
                }
            }
            this.elementRoles.delete(element);
        }

        const label = this.elementLabels.get(element);
        if (label) {
            const lSet = this.labelMap.get(label);
            if (lSet) {
                lSet.delete(element);
                if (lSet.size === 0) {
                    this.labelMap.delete(label);
                }
            }
            this.elementLabels.delete(element);
        }
    }

    getByRole(role) {
        if (!role || typeof role !== 'string') return new Set();
        return this.roleMap.get(role.toLowerCase()) || new Set();
    }

    getByLabel(label) {
        const normalized = AccessibilityIndex.normalizeLabel(label);
        if (!normalized) return new Set();
        return this.labelMap.get(normalized) || new Set();
    }

    clear() {
        this.roleMap.clear();
        this.labelMap.clear();
        this.elementRoles.clear();
        this.elementLabels.clear();
    }

    get size() {
        return this.roleMap.size + this.labelMap.size;
    }
}
export default AccessibilityIndex;
