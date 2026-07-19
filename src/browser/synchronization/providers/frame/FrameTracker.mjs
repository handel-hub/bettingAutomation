import { FramePathBuilder } from './FramePathBuilder.mjs';
import { ExecutionContextEvent } from './ExecutionContextEvent.mjs';

export class FrameTracker {
    constructor(browserId) {
        this.browserId = browserId;
        this.page = null;
        this.stateMachine = null;
        this.listeners = [];
    }

    setStateMachine(stateMachine) {
        this.stateMachine = stateMachine;
    }

    async initialize(page) {
        // Initialization if needed (BaseCapabilityRuntime calls this)
    }

    async attach(page) {
        this.page = page;

        const onFrameAttached = (frame) => {
            if (!this.stateMachine) return;
            const payload = this._buildFramePayload(frame);
            this.stateMachine.handleEvent(new ExecutionContextEvent('FrameAttached', payload));
        };

        const onFrameDetached = (frame) => {
            if (!this.stateMachine) return;
            const payload = this._buildFramePayload(frame);
            this.stateMachine.handleEvent(new ExecutionContextEvent('FrameDetached', payload));
        };

        const onFrameNavigated = (frame) => {
            if (!this.stateMachine) return;
            const payload = this._buildFramePayload(frame);
            this.stateMachine.handleEvent(new ExecutionContextEvent('FrameNavigated', payload));
        };

        this.page.on('frameattached', onFrameAttached);
        this.page.on('framedetached', onFrameDetached);
        this.page.on('framenavigated', onFrameNavigated);

        this.listeners.push(
            { event: 'frameattached', handler: onFrameAttached },
            { event: 'framedetached', handler: onFrameDetached },
            { event: 'framenavigated', handler: onFrameNavigated }
        );

        // Scan existing frames initially to populate the state machine
        for (const frame of this.page.frames()) {
            onFrameAttached(frame);
        }
    }

    async detach() {
        if (!this.page) return;
        for (const { event, handler } of this.listeners) {
            this.page.off(event, handler);
        }
        this.listeners = [];
        this.page = null;
    }

    _buildFramePayload(frame) {
        const framePath = FramePathBuilder.build(frame);
        const parent = frame.parentFrame();
        return {
            name: frame.name(),
            url: frame.url(),
            isDetached: frame.isDetached(),
            framePath,
            parentFramePath: parent ? FramePathBuilder.build(parent) : null
        };
    }
}
