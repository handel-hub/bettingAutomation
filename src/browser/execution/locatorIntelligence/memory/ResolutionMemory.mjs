import { TelemetryCollector } from '../telemetry/TelemetryCollector.mjs';

/**
 * Phase 11: ResolutionMemory
 */
export class ResolutionMemory {
    constructor(maxSize = 5000, ttlMs = 30 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    remember(urlPath, eidHash, strategyName, locator, confidence) {
        if (!urlPath || !eidHash) return;

        const key = `${urlPath}::${eidHash}`;
        
        // Remove existing to refresh insertion order (LRU)
        if (this.cache.has(key)) {
            const existing = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, {
                ...existing,
                strategyName, // Might update if it changed
                locator,      // Might update if it changed
                confidence,   // Update to newest confidence
                lastUsedAt: Date.now()
            });
        } else {
            const entry = {
                strategyName,
                locator,
                confidence,
                successCount: 0,
                lastUsedAt: Date.now(),
                cachedAt: Date.now()
            };
            this.cache.set(key, entry);
        }
        
        // Enforce max size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    recall(urlPath, eidHash) {
        if (!urlPath || !eidHash) return null;

        const key = `${urlPath}::${eidHash}`;
        const entry = this.cache.get(key);
        
        if (!entry) {
            TelemetryCollector.recordMemoryMiss();
            return null;
        }
        
        // Check TTL
        if (Date.now() - entry.lastUsedAt > this.ttlMs) {
            this.cache.delete(key);
            TelemetryCollector.recordMemoryMiss();
            return null;
        }

        // Update LRU order
        this.cache.delete(key);
        
        entry.successCount++;
        entry.lastUsedAt = Date.now();
        
        this.cache.set(key, entry);

        TelemetryCollector.recordMemoryHit();
        return { ...entry }; // Return a copy to prevent mutation
    }

    evict(urlPath, eidHash) {
        if (!urlPath || !eidHash) return;
        const key = `${urlPath}::${eidHash}`;
        if (this.cache.has(key)) {
            this.cache.delete(key);
            TelemetryCollector.recordMemoryEviction();
        }
    }

    size() {
        return this.cache.size;
    }

    clear() {
        this.cache.clear();
    }
}

export const resolutionMemory = new ResolutionMemory();
