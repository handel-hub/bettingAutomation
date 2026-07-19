export class ExecutionContextEvent {
    constructor(type, payload) {
        this.type = type; // 'FrameAttached', 'FrameDetached', 'FrameNavigated'
        this.payload = payload; // Contains frameId, name, url, parentFrameId, framePath
        this.timestamp = Date.now();
    }
}
