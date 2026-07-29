import { describe, it, expect, beforeEach } from 'vitest';
import { HybridLogicalClock } from './hlc.mjs';

describe('Hybrid Logical Clock (HLC)', () => {
  let currentTime = 1000;
  const timeProvider = () => currentTime;

  beforeEach(() => {
    currentTime = 1000;
  });

  it('should initialize with current time', () => {
    const hlc = new HybridLogicalClock(timeProvider);
    expect(hlc.pt).toBe(1000);
    expect(hlc.l).toBe(0);
  });

  it('should increment logical clock if physical time does not change', () => {
    const hlc = new HybridLogicalClock(timeProvider);
    hlc.tick();
    expect(hlc.pt).toBe(1000);
    expect(hlc.l).toBe(1);
    
    hlc.tick();
    expect(hlc.pt).toBe(1000);
    expect(hlc.l).toBe(2);
  });

  it('should reset logical clock when physical time advances', () => {
    const hlc = new HybridLogicalClock(timeProvider);
    hlc.tick(); // l = 1
    
    currentTime = 1005; // time advances
    hlc.tick();
    
    expect(hlc.pt).toBe(1005);
    expect(hlc.l).toBe(0);
  });

  it('should increment logical clock if physical time goes backwards (NTP drift)', () => {
    const hlc = new HybridLogicalClock(timeProvider);
    currentTime = 995; // time drifts backwards
    hlc.tick();
    
    expect(hlc.pt).toBe(1000); // pt stays at max seen
    expect(hlc.l).toBe(1);
  });

  it('should serialize and deserialize correctly', () => {
    const hlc = new HybridLogicalClock(timeProvider);
    const serialized = hlc.tick();
    const deserialized = HybridLogicalClock.deserialize(serialized);
    
    expect(deserialized.pt).toBe(1000);
    expect(deserialized.l).toBe(1);
  });

  it('should throw on invalid deserialization', () => {
    expect(() => HybridLogicalClock.deserialize(null)).toThrow(/Invalid HLC/);
    expect(() => HybridLogicalClock.deserialize('abc')).toThrow(/format/);
    expect(() => HybridLogicalClock.deserialize('!!-@@')).toThrow(/base36/);
  });

  it('should correctly merge a remote clock that is behind', () => {
    const localHlc = new HybridLogicalClock(timeProvider);
    localHlc.tick(); // local is 1000-1
    
    currentTime = 1005; // wall clock advanced
    
    // remote is behind (900-0)
    const remoteHlcStr = new HybridLogicalClock(() => 900).tick();
    const updated = localHlc.update(remoteHlcStr);
    
    const deserialized = HybridLogicalClock.deserialize(updated);
    expect(deserialized.pt).toBe(1005); // took wall clock
    expect(deserialized.l).toBe(0);
  });

  it('should correctly merge a remote clock that is exactly the same physical time', () => {
    const localHlc = new HybridLogicalClock(timeProvider);
    localHlc.tick(); // local is 1000-1
    localHlc.tick(); // local is 1000-2

    // remote is 1000-5
    const remoteHlc = new HybridLogicalClock(timeProvider);
    remoteHlc.l = 5; 
    
    const updated = localHlc.update(remoteHlc.serialize());
    const deserialized = HybridLogicalClock.deserialize(updated);
    
    expect(deserialized.pt).toBe(1000);
    expect(deserialized.l).toBe(6); // max(2, 5) + 1
  });

  it('should correctly merge a remote clock that is strictly ahead in physical time', () => {
    const localHlc = new HybridLogicalClock(timeProvider);
    
    // remote is ahead (1050-0)
    const remoteHlc = new HybridLogicalClock(() => 1050);
    
    const updated = localHlc.update(remoteHlc.serialize());
    const deserialized = HybridLogicalClock.deserialize(updated);
    
    expect(deserialized.pt).toBe(1050); // adopted future time
    expect(deserialized.l).toBe(1); // logical incremented
  });

  it('should generate lexicographically sortable strings', () => {
    const hlc1 = new HybridLogicalClock(() => 1000);
    const s1 = hlc1.tick();
    const s2 = hlc1.tick();
    
    const hlc2 = new HybridLogicalClock(() => 1001);
    const s3 = hlc2.tick();
    
    expect(s1 < s2).toBe(true);
    expect(s2 < s3).toBe(true);
  });
});
