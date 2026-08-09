import EventEmitter from 'node:events';

/**
 * Batches high-frequency scroll events (e.g., from mouse wheels) 
 * to prevent state machine flooding and cross-process message saturation.
 * Simulates a requestAnimationFrame coalescing loop in Node.js context.
 */
export class VsyncCoalescer extends EventEmitter {
    constructor(frameMs = 16) {
        super();
        this.frameMs = frameMs;
        this.pendingEvents = new Map();
        this.timeoutId = null;
    }

    pushEvent(browserId, eventData) {
        // Coalesce by spatial container or window
        const containerKey = eventData.spatialHash || eventData.activeContainerId || 'window';
        const key = `${browserId}-${containerKey}`;
        
        // Latest-wins replacement for the same container
        this.pendingEvents.set(key, eventData);
        
        if (!this.timeoutId) {
            this.timeoutId = setTimeout(() => this.flush(), this.frameMs);
        }
    }

    flush() {
        this.timeoutId = null;
        
        const events = Array.from(this.pendingEvents.values());
        this.pendingEvents.clear();
        
        for (const event of events) {
            this.emit('ScrollEvent', event);
        }
    }
}
