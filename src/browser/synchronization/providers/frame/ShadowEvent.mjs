export class ShadowEvent {
    constructor(type, payload) {
        this.type = type; // 'ShadowAttached', 'ShadowDetached'
        this.payload = payload; 
        this.timestamp = Date.now();
    }
}
