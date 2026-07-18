export class PipelineStep {
    constructor(name) {
        this.name = name;
    }

    execute(context) {
        throw new Error('PipelineStep subclass must implement execute(context)');
    }
}
