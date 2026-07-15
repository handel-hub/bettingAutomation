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
    constructor({ 
        category = 'Execution', type, target = null, payload = {}, 
        source, executionMode = 'ALL', metadata = {},
        version = 2, lifecycle = 'CREATED',
        id, captureTime, creationTime
    }) {
        this.version = version;
        this.lifecycle = lifecycle;
        this.id = id ?? payload.id ?? randomUUID();
        this.category = category;
        this.type = type;
        this.target = target;
        this.payload = payload;
        this.source = source;
        this.executionMode = executionMode;
        this.timestamp = new Date().toISOString();
        this.captureTime = captureTime ?? payload.captureTime ?? Date.now();
        this.creationTime = creationTime ?? Date.now();
        this.metadata = metadata;

        deepFreeze(this);
    }

    withLifecycle(lifecycle) {
        return new Command({
            ...this,
            payload: this.payload, // Ensures nested fields are passed if unpacking doesn't deep copy correctly, but spreading `this` is sufficient.
            lifecycle
        });
    }
}
