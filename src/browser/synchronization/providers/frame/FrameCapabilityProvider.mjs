import { CapabilityProvider } from '../CapabilityProvider.mjs';
import { CapabilityResult } from '../../models/CapabilityResult.mjs';
import { Capabilities } from '../../capabilities.mjs';
import { FrameCapabilityRuntime } from './FrameCapabilityRuntime.mjs';
import EventEmitter from 'node:events';

export class FrameCapabilityProvider extends CapabilityProvider {
    constructor() {
        super();
        this.capability = Capabilities.FRAME_READY;
        this.instances = new Map();
        this.events = new EventEmitter();
    }

    supportedCapabilities() {
        return [this.capability];
    }

    async initialize(browserId, page) {
        if (!this.instances.has(browserId)) {
            const runtime = new FrameCapabilityRuntime(browserId);
            
            runtime.on('FrameAttached', (e) => this.events.emit('FrameAttached', e));
            runtime.on('FrameDetached', (e) => this.events.emit('FrameDetached', e));
            runtime.on('FrameNavigated', (e) => this.events.emit('FrameNavigated', e));
            runtime.on('ShadowAttached', (e) => this.events.emit('ShadowAttached', e));
            runtime.on('ExecutionContextValidated', (e) => this.events.emit('ExecutionContextValidated', e));
            runtime.on('ExecutionContextReady', (e) => this.events.emit('ExecutionContextReady', e));

            this.instances.set(browserId, runtime);

            await runtime.initialize(page);
            await runtime.attach(page);
        }
    }

    async currentStatus(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult(this.capability, false, { reason: `Provider not initialized for ${browserId}` });
        }

        return await instance.waitStrategy.waitForContext(context);
    }

    async waitFor(syncContext) {
        const { browserId, context } = syncContext;
        const instance = this.instances.get(browserId);
        if (!instance) {
            return new CapabilityResult(this.capability, false, { reason: `Provider not initialized for ${browserId}` });
        }

        return await instance.waitStrategy.waitForContext(context);
    }

    async invalidate(syncContext) {
        // FrameTracker/ShadowTracker automatically handle invalidation via Playwright/DOM events.
    }

    on(event, listener) {
        this.events.on(event, listener);
    }

    off(event, listener) {
        this.events.off(event, listener);
    }
}
