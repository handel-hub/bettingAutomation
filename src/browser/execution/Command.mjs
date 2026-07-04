import { randomUUID } from 'node:crypto';

function deepFreeze(object) {
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
        const value = object[name];
        if (value && typeof value === "object") {
            deepFreeze(value);
        }
    }
    return Object.freeze(object);
}

export class Command {
    constructor({ category = 'Execution', type, target = null, payload = {}, source, executionMode = 'ALL', metadata = {} }) {
        this.id = randomUUID();
        this.category = category;
        this.type = type;
        this.target = target;
        this.payload = payload;
        this.source = source;
        this.executionMode = executionMode;
        this.timestamp = new Date().toISOString();
        this.metadata = metadata;

        deepFreeze(this);
    }
}
