export class PipelineContext {
    constructor(element) {
        this.element = element;
        this.features = null;
        this.candidates = []; // Array of LocatorCandidate
        this.metadata = {
            locatorVersion: 'v2',
            rankingVersion: 'v2',
            strategyVersion: 'v2',
            startTime: Date.now()
        };
        this.telemetry = {
            pipelineDurationMs: 0,
            stages: {}
        };
    }
}
