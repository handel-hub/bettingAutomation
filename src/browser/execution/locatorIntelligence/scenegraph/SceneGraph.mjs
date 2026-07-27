import { TextIndex } from './TextIndex.mjs';
import { AccessibilityIndex } from './AccessibilityIndex.mjs';
import { SpatialCache } from './SpatialCache.mjs';
import { ResolutionMemory } from '../memory/ResolutionMemory.mjs';
import { MutationProcessor } from './MutationProcessor.mjs';
import { QueryPlanner } from './QueryPlanner.mjs';

export class SceneGraph {
    constructor() {
        this.state = 'UNINITIALIZED';
        this.textIndex = new TextIndex();
        this.accessibilityIndex = new AccessibilityIndex();
        this.spatialCache = new SpatialCache();
        this.resolutionMemory = new ResolutionMemory(128); // Bounded LRU cache (max 128 entries)
        this.mutationProcessor = new MutationProcessor(this.textIndex, this.accessibilityIndex, this.spatialCache, (newState) => {
            if (this.state !== 'DESTROYED' && this.state !== 'UNINITIALIZED') {
                this.state = newState;
            }
        });
        this.document = null;
    }

    initialize(doc) {
        if (!doc) return;
        this.document = doc;
        this.state = 'BUILDING';
        this.textIndex.clear();
        this.accessibilityIndex.clear();
        this.spatialCache.clear();

        const root = doc.body || doc.documentElement || doc;
        if (root) {
            const walk = (el) => {
                if (!el || el.nodeType !== 1) return;
                this._indexElement(el);
                const children = el.children;
                if (children) {
                    for (let i = 0; i < children.length; i++) {
                        walk(children[i]);
                    }
                }
            };
            walk(root);
        }

        this.spatialCache.start(doc);
        this.mutationProcessor.start(doc);
        this.state = 'READY';
    }

    destroy() {
        this.state = 'DESTROYED';
        this.mutationProcessor.stop();
        this.spatialCache.stop();
        this.textIndex.clear();
        this.accessibilityIndex.clear();
        this.spatialCache.clear();
        this.resolutionMemory.clear();
        this.document = null;
    }

    isReady() {
        return this.state === 'READY' || this.state === 'UPDATING';
    }

    query(identityDoc) {
        if (this.state === 'UNINITIALIZED' || this.state === 'DESTROYED') {
            return [];
        }
        return QueryPlanner.query(identityDoc, this, this.document);
    }

    rememberResolution(urlPath, eidHash, strategyName, locator, confidence) {
        if (this.resolutionMemory && typeof this.resolutionMemory.remember === 'function') {
            return this.resolutionMemory.remember(urlPath, eidHash, strategyName, locator, confidence);
        }
    }

    recallResolution(urlPath, eidHash) {
        if (this.resolutionMemory && typeof this.resolutionMemory.recall === 'function') {
            return this.resolutionMemory.recall(urlPath, eidHash);
        }
        return null;
    }

    getPreciseBoundingBox(node) {
        if (!node || typeof node.getBoundingClientRect !== 'function') {
            return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
        }
        return node.getBoundingClientRect();
    }

    getStabilityState() {
        if (this.state === 'UNINITIALIZED' || this.state === 'DESTROYED' || this.state === 'BUILDING') {
            return 'MUTATING';
        }
        if (this.getMutationRate() > 50) {
            return 'MUTATING';
        }
        return 'STABLE';
    }

    getMutationRate() {
        return this.mutationProcessor.getMutationRate();
    }

    _indexElement(el) {
        if (!el || el.nodeType !== 1) return;
        const text = el.textContent || el.value || el.getAttribute?.('aria-label') || el.getAttribute?.('placeholder') || '';
        if (text && text.trim().length > 0) {
            this.textIndex.add(el, text);
        }
        this.accessibilityIndex.add(el);
        this.spatialCache.observe(el);
    }
}
export default SceneGraph;
