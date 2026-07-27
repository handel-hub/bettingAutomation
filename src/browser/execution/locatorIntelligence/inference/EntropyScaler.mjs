export class EntropyScaler {
    static computeEntropy(identityDoc) {
        if (!identityDoc) return 0.1;

        let entropy = 0.2; // Base entropy for existing

        // Check dataTestId
        const testId = identityDoc.dataTestId || identityDoc.semantic?.dataTestId || identityDoc.element?.dataAttributes?.['data-testid'];
        if (testId && testId.trim().length > 0) {
            entropy += 0.4;
        }

        // Check text content
        const text = identityDoc.textContent || identityDoc.lexical?.normalizedText || identityDoc.text?.normalized || identityDoc.text?.exact || '';
        if (text && text.trim().length >= 3) {
            entropy += 0.3;
        } else if (text && text.trim().length > 0) {
            entropy += 0.1;
        }

        // Check ARIA role
        const role = identityDoc.ariaRole || identityDoc.semantic?.ariaRole || '';
        if (role && ['button', 'link', 'combobox', 'checkbox', 'radio', 'textbox', 'searchbox', 'menuitem', 'tab'].includes(role.toLowerCase())) {
            entropy += 0.2;
        } else if (role) {
            entropy += 0.1;
        }

        // Check anchor
        const anchor = identityDoc.anchor || identityDoc.relational?.anchor || identityDoc.anchorDescriptor;
        if (anchor) {
            entropy += 0.15;
        }

        // Check CSS Selector specificity
        const sel = identityDoc.cssSelector || '';
        if (sel.includes('#') || sel.split(' ').length > 2) {
            entropy += 0.1;
        }

        return Math.max(0.1, Math.min(entropy, 1.0));
    }

    static scale(rawConfidence, identityDoc) {
        if (typeof rawConfidence !== 'number' || isNaN(rawConfidence)) return 0;
        const entropy = EntropyScaler.computeEntropy(identityDoc);
        const scaled = rawConfidence * entropy;
        return Math.max(0.0, Math.min(scaled, 1.0));
    }
}
export default EntropyScaler;
