export class FeatureExtractor extends PipelineStep {
    constructor() {
        super('FeatureExtractor');
    }

    execute(context) {
        const el = context.element;
        if (!(el instanceof Element)) {
            context.features = null;
            return;
        }
        
        const features = {
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            tagName: el.nodeName.toLowerCase(),
            text: '',
            dataOps: {},
            ariaLabel: el.getAttribute('aria-label') || '',
            role: el.getAttribute('role') || '',
            href: el.getAttribute('href') || '',
            src: el.getAttribute('src') || '',
            alt: el.getAttribute('alt') || '',
            placeholder: el.getAttribute('placeholder') || '',
            name: el.getAttribute('name') || '',
            type: el.getAttribute('type') || '',
            rect: null,
            isIntersecting: true, // fallback heuristic
            isIframe: false
        };

        // Extract text carefully excluding scripts/styles
        let textContent = '';
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                textContent += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.nodeName.toLowerCase();
                if (tag !== 'script' && tag !== 'style') {
                    textContent += node.innerText || node.textContent || '';
                }
            }
        }
        features.text = textContent.trim().replace(/\s+/g, ' ');

        const dataAttrs = ['data-op', 'data-testid', 'data-id', 'data-action'];
        for (const attr of dataAttrs) {
            const val = el.getAttribute(attr);
            if (val) features.dataOps[attr] = val;
        }

        try {
            features.rect = el.getBoundingClientRect();
            features.isIntersecting = (features.rect.width > 0 && features.rect.height > 0);
        } catch (e) {}

        context.features = features;
    }
}
