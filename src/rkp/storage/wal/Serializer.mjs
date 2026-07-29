import { Buffer } from 'node:buffer';
import { calculateCRC32, FRAME_HEADER_SIZE } from './Format.mjs';

/**
 * Handles the serialization of RuntimeFacts into binary frames for the WAL.
 * Operates exclusively in the background worker to avoid blocking the hot path.
 */
export class Serializer {
  /**
   * Serializes a Fact into a complete WAL frame (Length + CRC32 + Payload).
   * @param {import('../../models/index.mjs').BaseFact} fact
   * @returns {Buffer} The serialized frame ready to be appended to disk.
   */
  static serializeFrame(fact) {
    const payloadStr = JSON.stringify(fact);
    const payloadBuf = Buffer.from(payloadStr, 'utf8');
    const length = payloadBuf.length;
    
    const frameBuf = Buffer.alloc(FRAME_HEADER_SIZE + length);
    
    // Write length
    frameBuf.writeUInt32LE(length, 0);
    
    // Write CRC32 of payload
    const crc = calculateCRC32(payloadBuf);
    frameBuf.writeUInt32LE(crc, 4);
    
    // Write payload
    payloadBuf.copy(frameBuf, 8);
    
    return frameBuf;
  }
}
