import { CapabilityProvider } from './CapabilityProvider.mjs';
import { CapabilityResult } from '../models/CapabilityResult.mjs';
import { Capabilities } from '../capabilities.mjs';
import { ViewportTracker } from './viewport/ViewportTracker.mjs';
import { ViewportStateMachine } from './viewport/ViewportStateMachine.mjs';
import { ViewportComparator } from './viewport/ViewportComparator.mjs';
import { ViewportWaitStrategy } from './viewport/ViewportWaitStrategy.mjs';
import { ViewportRecoveryStrategy } from './viewport/ViewportRecoveryStrategy.mjs';
import { ViewportPolicy } from './viewport/ViewportPolicy.mjs';
import EventEmitter from 'node:events';

/**
 * Ensures that the Slave browser's viewport exactly matches the Master's before execution.
 * Owns the VIEWPORT_READY capability.
 */
export class ViewportCapabilityProvider extends CapabilityProvider {
    constructor() {
        super();
        this.capability = Capabilities.VIEWPORT_READY;
        this.policy = new ViewportPolicy();
        this.instances = new Map();
        
        // This is the provider's global event emitter for future providers (like Scroll)
        this.events = new EventEmitter();
    }

    supportedCapabilities() {
        return [this.capability];
    }

    async initialize(browserId, page) {
        if (!this.instances.has(browserId)) {
            const stateMachine = new ViewportStateMachine(browserId, this.policy);
            const tracker = new ViewportTracker(browserId);
            tracker.setStateMachine(stateMachine);

            const comparator = new ViewportComparator(this.policy);
            const waitStrategy = new ViewportWaitStrategy(browserId, stateMachine, comparator, this.policy);
            const recoveryStrategy = new ViewportRecoveryStrategy(browserId);

            // Forward state machine events to the global provider event emitter
            stateMachine.on('ViewportMeasured', (e) => this.events.emit('ViewportMeasured', e));
            stateMachine.on('ViewportResizeStarted', (e) => this.events.emit('ViewportResizeStarted', e));
            stateMachine.on('ViewportChanged', (e) => this.events.emit('ViewportChanged', e));
            stateMachine.on('ViewportResizeCompleted', (e) => this.events.emit('ViewportResizeCompleted', e));
            stateMachine.on('ViewportValidated', (e) => this.events.emit('ViewportValidated', e));
            stateMachine.on('ViewportReady', (e) => this.events.emit('ViewportReady', e));

            this.instances.set(browserId, {
                tracker,
                stateMachine,
                waitStrategy,
                recoveryStrategy
            });

            await tracker.attach(page);
        }
    }

    async currentStatus(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult(this.capability, false, { reason: `Provider not initialized for ${browserId}` });
        }

        // Just run waitFor with a 0ms timeout basically, but since our waitStrategy returns immediately 
        // if already satisfied, we can just call it. However, the interface asks for current status without blocking.
        // We can just rely on waitFor because waitStrategy already checks the current state before waiting.
        return await instance.waitStrategy.waitForViewport({ metadata: context.metadata });
    }

    async waitFor(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult(this.capability, false, { reason: `Provider not initialized for ${browserId}` });
        }

        try {
            // Note: command metadata should be in context.metadata or passed directly. 
            // Depending on how syncContext is structured. Assuming context IS the command or has metadata.
            return await instance.waitStrategy.waitForViewport(context);
        } catch (error) {
            throw error;
        }
    }

    async invalidate(syncContext) {
        // Nothing to explicitly invalidate for viewport, Playwright/events will naturally update state machine.
    }

    on(event, listener) {
        this.events.on(event, listener);
    }

    off(event, listener) {
        this.events.off(event, listener);
    }
}
