import { PipelineStep } from '../engine/PipelineStep.mjs';
import { ElementIdentityDocument } from '../models/ElementIdentityDocument.mjs';
import { FeatureExtractor } from './FeatureExtractor.mjs';

export class IdentityDocumentBuilder extends PipelineStep {
    constructor() {
        super('IdentityDocumentBuilder');
    }

    execute(context) {
        const f = context.features;
        if (!f) {
            context.identityDocument = null;
            return;
        }

        const rawData = {
            version: '1.0.0',
            captureEpoch: context.metadata ? (context.metadata.captureEpoch || context.metadata.startTime || Date.now()) : Date.now(),
            captureTimestamp: context.metadata ? (context.metadata.captureTimestamp || context.metadata.timestamp || context.metadata.startTime || Date.now()) : Date.now(),
            sourceEpoch: context.metadata ? (context.metadata.sourceEpoch || context.metadata.epoch || 0) : (typeof window !== 'undefined' && window.__ANTIGRAVITY_EPOCH__ !== undefined ? window.__ANTIGRAVITY_EPOCH__ : 0),
            anchor: f.anchor || null,
            cssSelector: f.cssSelector || null,
            url: typeof window !== 'undefined' && window.location ? window.location.href : (context.metadata?.url || ''),
            frameUrl: f.isIframe ? (f.src || null) : null,
            element: {
                tagName: (f.tagName || '').toUpperCase(),
                role: f.role || null,
                type: f.type || null,
                id: f.id || null,
                name: f.name || null,
                value: f.value || null,
                href: f.href || null,
                classes: typeof f.className === 'string' && f.className ? f.className.split(/\s+/).filter(Boolean) : [],
                dataAttributes: { ...(f.dataAttributes || {}) },
                ariaAttributes: { ...(f.ariaAttributes || {}) }
            },
            text: {
                exact: f.text || '',
                normalized: FeatureExtractor.normalizeText(f.text || ''),
                wordCount: (f.text || '').split(/\s+/).filter(Boolean).length,
                isNumeric: /^\d+$/.test((f.text || '').trim()),
                isDynamic: false
            },
            hierarchy: {
                depth: f.ancestry ? f.ancestry.length : 0,
                childCount: f.siblings ? Math.max(0, f.siblings.siblingCount - 1) : 0,
                siblingIndex: f.siblings ? f.siblings.siblingIndex : 0,
                siblingCount: f.siblings ? f.siblings.siblingCount : 0,
                ancestors: f.ancestry ? f.ancestry.map(a => ({ ...a })) : [],
                siblings: f.siblings && f.siblings.list ? f.siblings.list.map(s => ({ ...s })) : []
            },
            semantics: {
                landmark: f.landmark || null,
                sectionHeading: f.sectionHeading || null,
                componentRoot: f.componentRoot || null
            },
            position: {
                viewportQuadrant: f.position?.viewportQuadrant || null,
                isSticky: Boolean(f.position?.isSticky),
                isFixed: Boolean(f.position?.isFixed),
                zIndex: Number(f.position?.zIndex) || 0
            },
            state: {
                visible: f.rect ? (f.rect.width > 0 && f.rect.height > 0) : Boolean(f.isIntersecting),
                enabled: !context.element || !context.element.disabled,
                editable: Boolean(context.element && (context.element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes((f.tagName || '').toUpperCase()))),
                checked: context.element && context.element.checked !== undefined ? Boolean(context.element.checked) : null,
                expanded: f.ariaAttributes && f.ariaAttributes['aria-expanded'] !== undefined ? f.ariaAttributes['aria-expanded'] === 'true' : null
            }
        };

        // Merge legacy dataOps into dataAttributes if not already present
        if (f.dataOps) {
            for (const [k, v] of Object.entries(f.dataOps)) {
                if (!rawData.element.dataAttributes[k]) {
                    rawData.element.dataAttributes[k] = v;
                }
            }
        }

        const doc = new ElementIdentityDocument(rawData);
        context.identityDocument = doc;
    }
}
export default IdentityDocumentBuilder;
