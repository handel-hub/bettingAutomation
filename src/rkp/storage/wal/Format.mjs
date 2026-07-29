import { Buffer } from 'node:buffer';

/**
 * RKP WAL Format Constants
 */
export const MAGIC_NUMBER = Buffer.from('RKPWAL\0\0', 'utf8');
export const VERSION = 0x01;
export const HEADER_SIZE = 16; // 8 bytes magic + 1 byte version + 1 byte flags + 6 bytes padding

// Hard limit to prevent OOM attacks from corrupted frame headers
export const MAX_FRAME_SIZE = 1 * 1024 * 1024; // 1MB

// Frame size without payload: 4 bytes length + 4 bytes crc32 = 8 bytes
export const FRAME_HEADER_SIZE = 8; 

/**
 * Creates the 16-byte file header for a new WAL file.
 * @returns {Buffer}
 */
export function createFileHeader() {
  const header = Buffer.alloc(HEADER_SIZE);
  MAGIC_NUMBER.copy(header, 0);
  header.writeUInt8(VERSION, 8);
  header.writeUInt8(0x00, 9); // flags (uncompressed)
  // Bytes 10-15 are 0 by default (padding)
  return header;
}

/**
 * Simple CRC32 implementation for data integrity verification.
 * Precomputes the CRC table for fast lookups.
 */
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[i] = c;
}

/**
 * Calculates CRC32 for a given buffer.
 * @param {Buffer} buffer 
 * @returns {number} Unsigned 32-bit integer
 */
export function calculateCRC32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
