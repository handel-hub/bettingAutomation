export class FeatureExtractor {
    static extract(el) {
        const isElement = el && typeof el === 'object' && (
            (typeof Element !== 'undefined' && el instanceof Element) || 
            el.nodeType === 1 || 
            typeof el.getAttribute === 'function'
        );
        if (!isElement) {
            return null;
        }

        let textContent = '';
        if (el.textContent || el.innerText) {
            textContent = el.innerText || el.textContent || '';
        }

        return {
            tag: (el.nodeName || el.tagName || '').toLowerCase(),
            role: (el.getAttribute && el.getAttribute('role')) || '',
            text: textContent.trim().replace(/\s+/g, ' ').substring(0, 100)
        };
    }
}
