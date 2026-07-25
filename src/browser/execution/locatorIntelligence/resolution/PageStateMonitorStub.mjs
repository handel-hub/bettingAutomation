export class PageStateMonitorStub {
    async attach(page) {}
    
    async getStabilityState(page) {
        return 'UNKNOWN';
    }
    
    detach(page) {}
}
