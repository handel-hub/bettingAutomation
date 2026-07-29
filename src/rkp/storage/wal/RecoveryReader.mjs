import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { MAGIC_NUMBER, VERSION, HEADER_SIZE, FRAME_HEADER_SIZE, calculateCRC32 } from './Format.mjs';

/**
 * Sequential reader for RKP WAL files. 
 * Performs structural verification, corruption detection, and fact deserialization.
 */
export class RecoveryReader {
  /**
   * @param {string} filePath 
   */
  constructor(filePath) {
    this.filePath = filePath;
  }

  /**
   * Yields facts from the WAL file.
   * Discards trailing garbage (e.g. power loss mid-write).
   * Throws on internal corruption (bad CRC).
   * @returns {AsyncGenerator<import('../../models/index.mjs').BaseFact>}
   */
  async *read() {
    let handle;
    try {
      handle = await fs.open(this.filePath, 'r');
      
      const stat = await handle.stat();
      if (stat.size < HEADER_SIZE) {
        throw new Error('WAL file too small to contain header');
      }

      // 1. Read Header
      const headerBuf = Buffer.alloc(HEADER_SIZE);
      await handle.read(headerBuf, 0, HEADER_SIZE, 0);
      
      if (!headerBuf.slice(0, 8).equals(MAGIC_NUMBER)) {
        throw new Error('Invalid WAL Magic Number');
      }
      
      if (headerBuf.readUInt8(8) !== VERSION) {
        throw new Error(`Unsupported WAL version: ${headerBuf.readUInt8(8)}`);
      }

      let offset = HEADER_SIZE;
      
      // 2. Stream frames
      while (offset < stat.size) {
        // Read Frame Header
        if (stat.size - offset < FRAME_HEADER_SIZE) {
          console.warn(`WAL Warning: Truncated frame header at end of file ${this.filePath}`);
          break; // Partial write at end of file, stop gracefully.
        }

        const frameHeaderBuf = Buffer.alloc(FRAME_HEADER_SIZE);
        await handle.read(frameHeaderBuf, 0, FRAME_HEADER_SIZE, offset);
        
        const length = frameHeaderBuf.readUInt32LE(0);
        const crc = frameHeaderBuf.readUInt32LE(4);
        
        offset += FRAME_HEADER_SIZE;

        if (stat.size - offset < length) {
          console.warn(`WAL Warning: Truncated payload at end of file ${this.filePath}`);
          break; // Partial write at end of file
        }

        // Read Payload
        const payloadBuf = Buffer.alloc(length);
        await handle.read(payloadBuf, 0, length, offset);
        offset += length;

        // Verify Integrity
        const actualCrc = calculateCRC32(payloadBuf);
        if (actualCrc !== crc) {
          throw new Error(`WAL Corruption Detected: CRC mismatch at offset ${offset - length}`);
        }

        // Deserialize
        const jsonStr = payloadBuf.toString('utf8');
        try {
          const fact = JSON.parse(jsonStr);
          yield fact;
        } catch (e) {
          throw new Error(`WAL Corruption Detected: Malformed JSON at offset ${offset - length}`);
        }
      }

      console.log(`RecoveryReader finished. Offset: ${offset}, Stat size: ${stat.size}`);

    } finally {
      if (handle) {
        await handle.close();
      }
    }
  }
}
