import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Manages WAL segments, ensuring we never overwrite previous logs.
 */
export class RotationManager {
  /**
   * @param {string} directory 
   * @param {string} prefix e.g., 'master'
   * @param {number} maxSize in bytes
   */
  constructor(directory, prefix, maxSize = 50 * 1024 * 1024) {
    this.directory = directory;
    this.prefix = prefix;
    this.maxSize = maxSize;
    this.currentIndex = 0;
  }

  /**
   * Discovers the next available index by scanning the directory.
   */
  async init() {
    await fs.mkdir(this.directory, { recursive: true });
    
    const files = await fs.readdir(this.directory);
    const regex = new RegExp(`^${this.prefix}-(\\d+)\\.rkpwal$`);
    
    let maxIndex = 0;
    for (const file of files) {
      const match = file.match(regex);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > maxIndex) {
          maxIndex = index;
        }
      }
    }
    
    this.currentIndex = maxIndex;
  }

  /**
   * Gets the next file path and increments the internal index.
   * @returns {{ filePath: string, index: number }}
   */
  nextSegment() {
    this.currentIndex++;
    // pad to 6 digits (e.g. master-000001.rkpwal)
    const indexStr = this.currentIndex.toString().padStart(6, '0');
    const fileName = `${this.prefix}-${indexStr}.rkpwal`;
    return {
      filePath: path.join(this.directory, fileName),
      index: this.currentIndex
    };
  }

  /**
   * Evaluates if the current file size exceeds the rotation limit.
   * @param {number} currentBytes 
   * @returns {boolean}
   */
  shouldRotate(currentBytes) {
    return currentBytes >= this.maxSize;
  }
}
