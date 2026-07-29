/**
 * A fixed-size circular buffer designed for high-performance, low-allocation ingestion.
 * 
 * In a Node.js V8 context, allocating a fixed array prevents dynamic resizing overhead.
 * Items appended overwrite the oldest entries when capacity is reached.
 */
export class HotRingBuffer {
  /**
   * @param {number} capacity - The fixed maximum size of the buffer
   */
  constructor(capacity = 10000) {
    if (capacity <= 0) throw new Error('Capacity must be greater than 0');
    
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0; // Insertion pointer
    this.tail = 0; // Oldest item pointer
    this.isFull = false;
  }

  /**
   * Appends an item to the ring buffer. 
   * If the buffer is full, it overwrites the oldest item and advances the tail.
   * 
   * @param {import('../models/index.mjs').BaseFact} fact 
   */
  append(fact) {
    this.buffer[this.head] = fact;
    
    if (this.isFull) {
      this.tail = (this.tail + 1) % this.capacity;
    }

    this.head = (this.head + 1) % this.capacity;
    
    if (this.head === this.tail) {
      this.isFull = true;
    }
  }

  /**
   * Returns an array of all facts currently in the buffer, ordered from oldest to newest.
   * This allocates a new array for the snapshot.
   * 
   * @returns {import('../models/index.mjs').BaseFact[]}
   */
  snapshot() {
    if (this.head === this.tail && !this.isFull) {
      return [];
    }
    
    if (this.isFull) {
      return [
        ...this.buffer.slice(this.tail, this.capacity),
        ...this.buffer.slice(0, this.head)
      ];
    }
    
    return this.buffer.slice(this.tail, this.head);
  }

  /**
   * Logically clears the buffer.
   * We do not nullify array indices to avoid triggering immediate GC sweeps.
   */
  clear() {
    this.head = 0;
    this.tail = 0;
    this.isFull = false;
  }
}
