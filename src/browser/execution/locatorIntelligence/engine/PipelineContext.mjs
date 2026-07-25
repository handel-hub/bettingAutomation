export class PipelineContext {
    constructor(element, composedPath = [], config = {}) {
        this.element = element;
        this.composedPath = composedPath;
        this.config = config;
        this.features = null;
        this.identityDocument = null; // Forward compatibility for Phase 2+ EID
        this.candidates = []; // Array of LocatorCandidate
        this.metadata = {
            locatorVersion: 'v2',
            rankingVersion: 'v2',
            strategyVersion: 'v2',
            startTime: Date.now(),
            captureEpoch: Date.now() // Forward compatibility for Phase 5+ EpochGate
        };
        this.telemetry = {
            pipelineDurationMs: 0,
            stages: {}
        };
    }
}
