import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';
import { RecoveryReader } from './RecoveryReader.mjs';
import { Serializer } from './Serializer.mjs';

describe('RecoveryReader', () => {
  const testDir = path.join(process.cwd(), 'test-rr-recovery');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should successfully recover valid facts from a WAL', async () => {
    const wal = new ProcessLocalWal(testDir, 'recover', { maxSize: 10000 });
    await wal.init();
    
    const f1 = { domain: 'Execution', type: 'Decision', lsn: 1 };
    const f2 = { domain: 'Network', type: 'Measurement', lsn: 2 };
    
    wal.append(Serializer.serializeFrame(f1));
    wal.append(Serializer.serializeFrame(f2));
    await wal.close();

    const filePath = path.join(testDir, 'recover-000001.rkpwal');
    const reader = new RecoveryReader(filePath);
    
    const recovered = [];
    for await (const fact of reader.read()) {
      recovered.push(fact);
    }

    expect(recovered.length).toBe(2);
    expect(recovered[0].domain).toBe('Execution');
    expect(recovered[1].domain).toBe('Network');
  });

  it('should throw on invalid magic number', async () => {
    const filePath = path.join(testDir, 'bad.rkpwal');
    await fs.writeFile(filePath, Buffer.alloc(16, 'X'));

    const reader = new RecoveryReader(filePath);
    const iterator = reader.read();
    await expect(iterator.next()).rejects.toThrow(/Magic Number/);
  });

  it('should gracefully stop reading on trailing truncated data (power loss scenario)', async () => {
    const wal = new ProcessLocalWal(testDir, 'trunc', { maxSize: 10000 });
    await wal.init();
    
    wal.append(Serializer.serializeFrame({ domain: 'Execution', type: 'Decision', lsn: 1 }));
    await wal.flush(); // Ensure the first fact is totally flushed
    
    const frame2 = Serializer.serializeFrame({ domain: 'Network', type: 'Measurement', lsn: 2 });
    // Intentionally truncate the second frame payload
    wal.append(frame2.slice(0, 10)); 
    await wal.close();

    const filePath = path.join(testDir, 'trunc-000001.rkpwal');
    const reader = new RecoveryReader(filePath);
    
    const recovered = [];
    for await (const fact of reader.read()) {
      recovered.push(fact);
    }

    // It should recover the first fact and silently stop on the second one without throwing an Error.
    expect(recovered.length).toBe(1);
    expect(recovered[0].lsn).toBe(1);
  });

  it('should throw on CRC mismatch (data corruption)', async () => {
    const wal = new ProcessLocalWal(testDir, 'corrupt', { maxSize: 10000 });
    await wal.init();
    
    wal.append(Serializer.serializeFrame({ domain: 'Execution', type: 'Decision', lsn: 1 }));
    await wal.close();

    const filePath = path.join(testDir, 'corrupt-000001.rkpwal');
    
    // Corrupt a byte in the payload
    const fd = await fs.open(filePath, 'r+');
    const buf = Buffer.from('Z');
    await fd.write(buf, 0, 1, 30); // 30 is roughly within the payload JSON
    await fd.close();

    const reader = new RecoveryReader(filePath);
    const iterator = reader.read();
    await expect(iterator.next()).rejects.toThrow(/CRC mismatch/);
  });
});
