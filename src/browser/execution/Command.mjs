import { randomUUID } from 'node:crypto';

export class Command {
    constructor({ type, target = null, payload = {}, source, executionMode, metadata = {} }) {
        this.id = randomUUID();
        this.type = type;
        this.target = target;
        this.payload = payload;
        this.source = source;
        this.executionMode = executionMode;
        this.timestamp = new Date().toISOString();
        this.metadata = metadata;
    }
}
