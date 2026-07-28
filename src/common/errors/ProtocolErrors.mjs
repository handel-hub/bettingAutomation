export class ProtocolError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
    }
}

export class LateArrivalError extends ProtocolError {
    constructor(event, lastFlushedHLC) {
        super(`Late arrival: Event HLC ${JSON.stringify(event.hlc)} is older than last flushed HLC ${JSON.stringify(lastFlushedHLC)}`, 'SYNC-LATE-ARRIVAL');
        this.event = event;
        this.lastFlushedHLC = lastFlushedHLC;
    }
}

export class SequenceGapError extends ProtocolError {
    constructor(expected, received) {
        super(`Sequence gap detected: Expected ${expected}, received ${received}`, 'SYNC-SEQUENCE-GAP');
        this.expected = expected;
        this.received = received;
    }
}

export class StaleCommandError extends ProtocolError {
    constructor(expected, received) {
        super(`Stale command received: Expected > ${expected}, received ${received}`, 'SYNC-STALE-COMMAND');
        this.expected = expected;
        this.received = received;
    }
}
