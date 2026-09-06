import { logger } from '../../utils/logger.mjs';

class ObservabilityCollector {
    constructor() {
        this.buffer = [];
        this.maxBufferSize = 1000;
        this.flushIntervalMs = 500;
        this.timer = null;
        this.overflowLogged = false;
        
        // Track recent timelines for dump on failure. Bound size to prevent leaks.
        this.timelines = new Map();
        this.MAX_TIMELINES = 500;
        this.MAX_EVENTS_PER_TIMELINE = 50;

        this.start();
        this.registerShutdownHooks();
    }

    start() {
        if (!this.timer) {
            this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
            // Don't keep the event loop alive just for the telemetry timer
            if (this.timer.unref) {
                this.timer.unref();
            }
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.flushSync();
    }

    registerShutdownHooks() {
        // Node.js process hooks for graceful shutdown
        if (typeof process !== 'undefined' && process.on) {
            process.on('exit', () => this.flushSync());
            process.on('SIGTERM', () => {
                this.flushSync();
                process.exit(0);
            });
            process.on('SIGINT', () => {
                this.flushSync();
                process.exit(0);
            });
        }
    }

    /**
     * Emits a state transition event for a command lifecycle.
     * @param {Object} payload 
     */
    emitTransition(payload) {
        if (this.buffer.length >= this.maxBufferSize) {
            if (!this.overflowLogged) {
                logger.warn(`[ObservabilityCollector] OVERFLOW: Telemetry buffer exceeded ${this.maxBufferSize} events. Dropping further events.`);
                this.overflowLogged = true;
            }
            return;
        }
        
        // Recover overflow flag if queue shrinks
        this.overflowLogged = false;

        const eventPayload = {
            schemaVersion: "1.0",
            timestamp: Date.now(),
            ...payload
        };
        
        if (payload.commandId && payload.commandId !== 'async-nav' && payload.commandId !== 'async-network') {
            if (!this.timelines.has(payload.commandId)) {
                if (this.timelines.size >= this.MAX_TIMELINES) {
                    const firstKey = this.timelines.keys().next().value;
                    this.timelines.delete(firstKey);
                }
                this.timelines.set(payload.commandId, []);
            }
            const tl = this.timelines.get(payload.commandId);
            if (tl.length < this.MAX_EVENTS_PER_TIMELINE) {
                tl.push(payload.newState);
            }
        }

        this.buffer.push(eventPayload);
    }
    
    dumpTimeline(commandId) {
        if (!commandId || !this.timelines.has(commandId)) return 'UNKNOWN_TIMELINE';
        const tl = this.timelines.get(commandId);
        return tl.join(' -> ');
    }

    flush() {
        if (this.buffer.length === 0) return;

        const batch = this.buffer.splice(0, this.buffer.length);
        for (const event of batch) {
            // Write structured log out to the RKP pipeline using Chino format
            logger.info(`[Transition] Command ${event.commandId || 'unknown'}: ${event.prevState || 'NONE'} -> ${event.newState || 'UNKNOWN'} | ${JSON.stringify(event)}`);
        }
    }

    flushSync() {
        if (this.buffer.length === 0) return;

        const batch = this.buffer.splice(0, this.buffer.length);
        for (const event of batch) {
            logger.info(`[Transition] Command ${event.commandId || 'unknown'}: ${event.prevState || 'NONE'} -> ${event.newState || 'UNKNOWN'} | ${JSON.stringify(event)}`);
        }
    }
}

export const observabilityCollector = new ObservabilityCollector();
