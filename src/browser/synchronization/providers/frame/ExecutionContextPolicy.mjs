export class ExecutionContextPolicy {
    constructor(config = {}) {
        this.stabilityWindow = config.stabilityWindow || 50;
        this.frameTimeout = config.frameTimeout || 3000;
        this.shadowTimeout = config.shadowTimeout || 1000;
        this.allowDetachedFrames = config.allowDetachedFrames !== undefined ? config.allowDetachedFrames : false;
    }
}
