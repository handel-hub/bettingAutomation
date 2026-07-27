import { CapabilityProvider } from './CapabilityProvider.mjs';
import { CapabilityResult } from '../models/CapabilityResult.mjs';
import { Capabilities } from '../capabilities.mjs';
import { ViewportTracker } from './viewport/ViewportTracker.mjs';
import { ViewportStateMachine } from './viewport/ViewportStateMachine.mjs';
import { ViewportComparator } from './viewport/ViewportComparator.mjs';
import { ViewportWaitStrategy } from './viewport/ViewportWaitStrategy.mjs';
import { ViewportRecoveryStrategy } from './viewport/ViewportRecoveryStrategy.mjs';
import { ViewportPolicy } from './viewport/ViewportPolicy.mjs';
import { ViewportIsomorphicGatingController } from './viewport/ViewportIsomorphicGatingController.mjs';
import EventEmitter from 'node:events';

/**
 * Ensures that the Slave browser's viewport exactly matches the Master's before execution.
 * Owns the VIEWPORT_READY capability and enforces Stage 2 Viewport Isomorphic Gating.
 */
export class ViewportCapabilityProvider extends CapabilityProvider {
    constructor(registry, syncManager) {
        super(registry, syncManager);
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
            const stateMachine = new ViewportStateMachine(browserId, this.registry, this.policy);
            const comparator = new ViewportComparator(this.policy);
            const waitStrategy = new ViewportWaitStrategy(browserId, this.registry, stateMachine, comparator, this.policy);
            const tracker = new ViewportTracker(browserId);
            tracker.setStateMachine(stateMachine);

            const recoveryStrategy = new ViewportRecoveryStrategy(browserId);
            const gatingController = new ViewportIsomorphicGatingController(browserId, this.registry, this.syncManager?.telemetry);

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
                recoveryStrategy,
                gatingController,
                page
            });

            await tracker.attach(page);
        }
    }

    async currentStatus(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult({ status: 'FAILED', capability: this.capability, reason: `Provider not initialized for ${browserId}` });
        }

        if (context.metadata?.viewport && instance.gatingController) {
            const isomo = instance.gatingController.evaluateIsomorphism(context.metadata.viewport, this.registry.getState(browserId)?.viewportContext);
            if (!isomo.isIsomorphic) {
                return new CapabilityResult({ status: 'FAILED', capability: this.capability, reason: isomo.reason, errorCode: isomo.failureCode });
            }
        }

        const result = await instance.waitStrategy.waitForViewport({ metadata: context.metadata });
        return result;
    }

    async waitFor(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult({ status: 'FAILED', capability: this.capability, reason: `Provider not initialized for ${browserId}` });
        }

        try {
            if (context.metadata?.viewport && instance.gatingController) {
                const isomo = await instance.gatingController.enforceIsomorphism(instance.page, context.metadata.viewport);
                if (!isomo.isIsomorphic) {
                    throw new Error(`[${isomo.failureCode}] ${isomo.reason}`);
                }
                
                // Keep registry and legacy state machine synchronized with the locked isomorphic dimensions
                const vpContext = {
                    layoutViewportWidth: context.metadata.viewport.width || 1280,
                    layoutViewportHeight: context.metadata.viewport.height || 720,
                    dpr: context.metadata.viewport.dpr || 1,
                    orientation: context.metadata.viewport.orientation || 'portraitPrimary',
                    visualViewportScale: context.metadata.viewport.visualScale || 1,
                    lifecycle: 'READY'
                };
                this.registry.update(browserId, { viewportContext: vpContext });
                
                const result = await instance.waitStrategy.waitForViewport(context);
                result.isomoDetails = isomo.details;
                return result;
            }
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
