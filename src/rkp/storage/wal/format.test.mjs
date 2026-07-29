import { describe, it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import { calculateCRC32, createFileHeader, MAGIC_NUMBER, VERSION } from './Format.mjs';
import { Serializer } from './Serializer.mjs';

describe('WAL Format & Serializer', () => {
  it('should generate a correct file header', () => {
    const header = createFileHeader();
    expect(header.length).toBe(16);
    expect(header.slice(0, 8).toString()).toBe('RKPWAL\0\0');
    expect(header.readUInt8(8)).toBe(VERSION);
    expect(header.readUInt8(9)).toBe(0x00);
  });

  it('should calculate accurate CRC32', () => {
    // Standard test vector for CRC32
    const buf = Buffer.from('123456789', 'utf8');
    const crc = calculateCRC32(buf);
    expect(crc).toBe(0xCBF43926);
  });

  it('should serialize a fact into a correct binary frame', () => {
    const fact = {
      domain: 'Execution',
      type: 'Decision',
      lsn: 1,
      hlc: 'abc-123'
    };

    const frame = Serializer.serializeFrame(fact);
    
    // Read length
    const length = frame.readUInt32LE(0);
    // Read CRC
    const crc = frame.readUInt32LE(4);
    // Read payload
    const payload = frame.slice(8, 8 + length);
    
    const parsedPayload = JSON.parse(payload.toString('utf8'));
    expect(parsedPayload.domain).toBe('Execution');
    
    // Verify checksum matches payload
    const actualCrc = calculateCRC32(payload);
    expect(actualCrc).toBe(crc);
  });
});
