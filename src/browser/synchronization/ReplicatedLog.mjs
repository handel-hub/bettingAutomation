export class SequenceEntry {
    constructor(interactionId, msn, framePath, type, payload) {
        if (!interactionId) throw new Error('SequenceEntry requires interactionId');
        if (!Number.isInteger(msn) || msn <= 0) throw new Error('SequenceEntry requires positive integer MSN');
        if (typeof framePath !== 'string') throw new Error('SequenceEntry requires string framePath');
        
        this.interactionId = interactionId;
        this.msn = msn;
        this.framePath = framePath;
        this.type = type;
        this.payload = payload;
        this.timestamp = Date.now();
        Object.freeze(this);
    }
}

export class ReplicatedLog {
    constructor() {
        // Map<framePath, { entries: Array<SequenceEntry>, highestMsn: Integer }>
        this.frameLogs = new Map();
        // Lookup for deduplication: Set<interactionId>
        this.interactionIds = new Set();
    }

    appendSequence(interactionId, framePath, type, payload) {
        if (this.interactionIds.has(interactionId)) {
            return { msn: null, duplicated: true };
        }

        if (!this.frameLogs.has(framePath)) {
            this.frameLogs.set(framePath, { entries: [], highestMsn: 0 });
        }
        
        const log = this.frameLogs.get(framePath);
        const newMsn = log.highestMsn + 1;
        const entry = new SequenceEntry(interactionId, newMsn, framePath, type, payload);
        
        log.entries.push(entry);
        log.highestMsn = newMsn;
        this.interactionIds.add(interactionId);
        
        return { msn: newMsn, duplicated: false, entry };
    }

    getHighestMsn(framePath) {
        return this.frameLogs.get(framePath)?.highestMsn ?? 0;
    }
    
    getEntry(framePath, msn) {
        const log = this.frameLogs.get(framePath);
        if (!log) return null;
        // Since msn starts at 1 and array is 0-indexed and monotonically dense
        return log.entries[msn - 1] || null;
    }
    
    clear() {
        this.frameLogs.clear();
        this.interactionIds.clear();
    }
}
