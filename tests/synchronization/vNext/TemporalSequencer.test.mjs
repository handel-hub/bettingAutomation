import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemporalSequencer } from '../../../src/master/TemporalSequencer.mjs';
import { HybridLogicalClock } from '../../../src/common/models/HybridLogicalClock.mjs';
import { LateArrivalError } from '../../../src/common/errors/ProtocolErrors.mjs';

describe('TemporalSequencer', () => {
    let sequencer;

    beforeEach(() => {
        sequencer = new TemporalSequencer(50);
        vi.useFakeTimers();
    });

    afterEach(() => {
        sequencer.stop();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('buffers events and emits them strictly in order of HLC', () => {
        const events = [];
        sequencer.on('sequenced', (e) => events.push(e));

        const baseTime = 1000;
        
        sequencer.receive({
            interactionId: 'ia-2',
            hlc: new HybridLogicalClock(baseTime + 10, 0),
            framePath: 'main',
            payload: { data: 2 }
        });

        sequencer.receive({
            interactionId: 'ia-1',
            hlc: new HybridLogicalClock(baseTime, 0),
            framePath: 'main',
            payload: { data: 1 }
        });

        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(0);
        vi.spyOn(performance, 'now').mockReturnValue(baseTime + 100);

        sequencer._flush();

        expect(events.length).toBe(2);
        expect(events[0].ges).toBe(1);
        expect(events[0].event.interactionId).toBe('ia-1');
        expect(events[1].ges).toBe(2);
        expect(events[1].event.interactionId).toBe('ia-2');
    });

    it('resolves HLC collisions using frame depth', () => {
        const events = [];
        sequencer.on('sequenced', (e) => events.push(e));

        const baseTime = 1000;
        const hlc = new HybridLogicalClock(baseTime, 0);
        
        sequencer.receive({
            interactionId: 'child',
            hlc: hlc,
            framePath: 'main.iframe1',
            payload: {}
        });

        sequencer.receive({
            interactionId: 'parent',
            hlc: hlc,
            framePath: 'main',
            payload: {}
        });

        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(0);
        vi.spyOn(performance, 'now').mockReturnValue(baseTime + 100);

        sequencer._flush();

        expect(events.length).toBe(2);
        expect(events[0].event.interactionId).toBe('parent'); // Shorter path wins
        expect(events[1].event.interactionId).toBe('child');
    });

    it('throws LateArrivalError and aborts if an event arrives older than last flushed HLC', () => {
        const baseTime = 1000;
        
        sequencer.receive({
            interactionId: 'ia-1',
            hlc: new HybridLogicalClock(baseTime, 0),
            framePath: 'main',
            payload: {}
        });

        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(0);
        vi.spyOn(performance, 'now').mockReturnValue(baseTime + 100);
        sequencer._flush();

        // Now try to inject a late arrival
        expect(() => {
            sequencer.receive({
                interactionId: 'late',
                hlc: new HybridLogicalClock(baseTime - 10, 0),
                framePath: 'main',
                payload: {}
            });
        }).toThrow(LateArrivalError);
    });

    it('retains events within delta window', () => {
        const events = [];
        sequencer.on('sequenced', (e) => events.push(e));

        const baseTime = 1000;
        vi.spyOn(performance, 'timeOrigin', 'get').mockReturnValue(0);
        vi.spyOn(performance, 'now').mockReturnValue(baseTime);

        sequencer.receive({
            interactionId: 'ia-1',
            hlc: new HybridLogicalClock(baseTime, 0), // Exactly now
            framePath: 'main',
            payload: {}
        });

        sequencer._flush();
        expect(events.length).toBe(0); // Cutoff is baseTime - 50, so baseTime is too new

        vi.spyOn(performance, 'now').mockReturnValue(baseTime + 51);
        sequencer._flush();
        expect(events.length).toBe(1); // Now it's older than cutoff
    });
});
