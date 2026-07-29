import fs from 'node:fs';
import { RotationManager } from './RotationManager.mjs';
import { createFileHeader } from './Format.mjs';

/**
 * Manages physical disk appends for the Write-Ahead Log.
 * Hides file descriptors, rotation mechanics, and OS-level stream manipulation.
 */
export class ProcessLocalWal {
  /**
   * @param {string} directory 
   * @param {string} prefix 
   * @param {Object} [options] 
   * @param {number} [options.maxSize] 
   */
  constructor(directory, prefix, options = {}) {
    this.rotationManager = new RotationManager(directory, prefix, options.maxSize || 50 * 1024 * 1024);
    this.stream = null;
    this.fd = null;
    this.currentBytes = 0;
  }

  /**
   * Initializes the rotation manager and opens the latest file segment.
   */
  async init() {
    await this.rotationManager.init();
    await this._openNewSegment();
  }

  /**
   * Closes the current segment and creates a new one with a bumped index.
   */
  async _openNewSegment() {
    if (this.stream) {
      await this.close();
    }
    const { filePath } = this.rotationManager.nextSegment();
    
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    
    await new Promise((resolve, reject) => {
      this.stream.once('open', (fd) => {
        this.fd = fd;
        resolve();
      });
      this.stream.once('error', reject);
    });
    
    
    // Write header
    const header = createFileHeader();
    this.stream.write(header);
    this.currentBytes = header.length;
  }

  /**
   * Appends a serialized frame buffer to the OS stream.
   * If the append crosses the high-water size, rotation is scheduled.
   * @param {Buffer} frameBuf 
   */
  append(frameBuf) {
    if (!this.stream) throw new Error('WAL not initialized');
    
    this.stream.write(frameBuf);
    this.currentBytes += frameBuf.length;
  }

  /**
   * Determines if the WAL needs rotation based on accumulated bytes.
   * @returns {boolean}
   */
  needsRotation() {
    return this.rotationManager.shouldRotate(this.currentBytes);
  }

  /**
   * Rotates to a new file segment immediately.
   */
  async rotate() {
    await this._openNewSegment();
  }

  /**
   * Forces the buffer to flush to disk.
   * @param {'PAGE_CACHE' | 'HARDWARE'} policy 
   */
  async flush(policy = 'PAGE_CACHE') {
    if (!this.stream) return;
    
    // Step 1: Drain Node.js memory buffer to OS page cache
    await new Promise((resolve) => {
       if (this.stream.writableNeedDrain) {
         this.stream.once('drain', resolve);
       } else {
         process.nextTick(resolve);
       }
    });

    // Step 2: If HARDWARE durability is requested, issue an fsync syscall
    if (policy === 'HARDWARE' && this.fd !== null) {
       await fs.promises.fsync(this.fd);
    }
  }

  /**
   * Closes the stream gracefully.
   */
  async close() {
    if (!this.stream) return;
    return new Promise((resolve, reject) => {
      this.stream.end((err) => {
        this.fd = null;
        if (err) reject(err);
        else resolve();
      });
      this.stream = null;
    });
  }
}
