import { LocatorCandidate } from '../../models/LocatorCandidate.mjs';

export class StructuralStrategy {
    static generate(el, features) {
        let current = el;
        let isBad = false;
        const adRegex = /(^|[\s_-])ad(s|v|vertisement|banner)?([\s_-]|$)/i;
        const docRef = typeof document !== 'undefined' ? document : null;
        
        while (current && current !== docRef) {
            if (current.tagName === 'IFRAME') { isBad = true; break; }
            const className = (typeof current.className === 'string') ? current.className : '';
            const id = (typeof current.id === 'string') ? current.id : '';
            if (adRegex.test(className) || adRegex.test(id)) { isBad = true; break; }
            current = current.parentNode;
        }
        if (isBad) return [];
        
        let path = [];
        current = el;
        let depth = 0;
        const elemNodeType = typeof Node !== 'undefined' && Node.ELEMENT_NODE ? Node.ELEMENT_NODE : 1;
        const escapeFn = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape : (str => str);

        while (current && (current.nodeType === elemNodeType || current.tagName) && depth < 10) {
            let selector = (current.nodeName || current.tagName || '').toLowerCase();
            if (!selector) break;
            if (current.id && !/\d+/.test(current.id)) {
                selector += '#' + escapeFn(current.id);
                path.unshift(selector);
                break;
            } else {
                let sib = current, nth = 1;
                while (sib = (sib.previousElementSibling || null)) {
                    if ((sib.nodeName || sib.tagName || '').toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            current = current.parentNode || current.parentElement;
            depth++;
        }
        if (path.length === 0) return [];
        return [new LocatorCandidate({
            strategy: 'StructuralStrategy',
            locator: path.join(" > "),
            features,
            reason: 'Absolute structural path'
        })];
    }
}
