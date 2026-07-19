import EventEmitter from 'node:events';
import { BrowserStateRegistry } from '../../BrowserStateRegistry.mjs';
import { ExecutionContextLifecycle } from '../../models/BrowserStateModel.mjs';

export class FrameStateMachine extends EventEmitter {
    constructor(browserId, policy) {
        super();
        this.browserId = browserId;
        this.policy = policy;
        this.stabilityTimeout = null;
        
        this.frameHierarchy = [];
        this.shadowHierarchy = [];
        this.contextVersion = 0;
        this.state = ExecutionContextLifecycle.UNKNOWN;
    }

    handleEvent(event) {
        this.contextVersion++;
        this.state = ExecutionContextLifecycle.DISCOVERING;

        if (event.type === 'FrameAttached') {
            this._addFrame(event.payload.framePath);
        } else if (event.type === 'FrameDetached') {
            this._removeFrame(event.payload.framePath);
        } else if (event.type === 'FrameNavigated') {
            this._updateFrame(event.payload.framePath);
        } else if (event.type === 'ShadowAttached') {
            this._addShadow(event.payload.hostLocator, event.payload.frameUrl);
        }

        this.emit(event.type, event.payload);
        this._scheduleValidation();
    }

    _addFrame(framePath) {
        const frameId = JSON.stringify(framePath);
        if (!this.frameHierarchy.includes(frameId)) {
            this.frameHierarchy.push(frameId);
        }
    }

    _removeFrame(framePath) {
        const frameId = JSON.stringify(framePath);
        this.frameHierarchy = this.frameHierarchy.filter(id => id !== frameId);
    }

    _updateFrame(framePath) {
        const frameId = JSON.stringify(framePath);
        if (!this.frameHierarchy.includes(frameId)) {
            this.frameHierarchy.push(frameId);
        }
    }

    _addShadow(locator, frameUrl) {
        this.shadowHierarchy.push({ locator, frameUrl });
    }

    _scheduleValidation() {
        if (this.stabilityTimeout) {
            clearTimeout(this.stabilityTimeout);
        }

        this.state = ExecutionContextLifecycle.VALIDATING;
        this._commitState();

        this.stabilityTimeout = setTimeout(() => {
            this.state = ExecutionContextLifecycle.READY;
            this._commitState();
            
            this.emit('ExecutionContextReady', {
                version: this.contextVersion,
                frameHierarchy: this.frameHierarchy,
                shadowHierarchy: this.shadowHierarchy
            });
            this.emit('ExecutionContextValidated', {});
        }, this.policy.stabilityWindow);
    }

    _commitState() {
        BrowserStateRegistry.update(this.browserId, {
            executionContext: {
                version: this.contextVersion,
                lifecycle: this.state,
                frameHierarchy: this.frameHierarchy,
                shadowHierarchy: this.shadowHierarchy,
                lastContextChange: Date.now()
            }
        });
    }
}
