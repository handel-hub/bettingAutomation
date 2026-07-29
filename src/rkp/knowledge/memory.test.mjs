import { describe, it, expect } from 'vitest';
import { HotRingBuffer } from './memory.mjs';

describe('Hot Ring Buffer', () => {
  it('should initialize empty with correct capacity', () => {
    const buffer = new HotRingBuffer(5);
    expect(buffer.capacity).toBe(5);
    expect(buffer.snapshot()).toEqual([]);
  });

  it('should throw on invalid capacity', () => {
    expect(() => new HotRingBuffer(0)).toThrow(/Capacity/);
    expect(() => new HotRingBuffer(-5)).toThrow(/Capacity/);
  });

  it('should append items and snapshot correctly', () => {
    const buffer = new HotRingBuffer(5);
    buffer.append({ id: 1 });
    buffer.append({ id: 2 });
    
    expect(buffer.snapshot()).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should wrap around and overwrite oldest items when capacity is exceeded', () => {
    const buffer = new HotRingBuffer(3);
    buffer.append({ id: 1 });
    buffer.append({ id: 2 });
    buffer.append({ id: 3 }); // buffer is full: [1, 2, 3]
    
    expect(buffer.snapshot()).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    
    buffer.append({ id: 4 }); // overwrites 1: [4, 2, 3], tail moves to index 1 (item 2)
    expect(buffer.snapshot()).toEqual([{ id: 2 }, { id: 3 }, { id: 4 }]);
    
    buffer.append({ id: 5 }); // overwrites 2: [4, 5, 3], tail moves to index 2 (item 3)
    expect(buffer.snapshot()).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }]);
    
    buffer.append({ id: 6 }); // overwrites 3: [4, 5, 6], tail moves to index 0 (item 4)
    expect(buffer.snapshot()).toEqual([{ id: 4 }, { id: 5 }, { id: 6 }]);
  });

  it('should logical clear the buffer correctly', () => {
    const buffer = new HotRingBuffer(3);
    buffer.append({ id: 1 });
    buffer.append({ id: 2 });
    
    buffer.clear();
    expect(buffer.snapshot()).toEqual([]);
    
    // Test appending after clear
    buffer.append({ id: 3 });
    expect(buffer.snapshot()).toEqual([{ id: 3 }]);
  });
});
