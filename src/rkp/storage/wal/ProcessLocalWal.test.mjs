import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { ProcessLocalWal } from './ProcessLocalWal.mjs';
import { HEADER_SIZE } from './Format.mjs';

describe('ProcessLocalWal', () => {
  const testDir = path.join(process.cwd(), 'test-plw-rotation');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should initialize and write the header to the first segment', async () => {
    const wal = new ProcessLocalWal(testDir, 'worker');
    await wal.init();
    
    const files = await fs.readdir(testDir);
    expect(files.length).toBe(1);
    expect(files[0]).toBe('worker-000001.rkpwal');

    const content = await fs.readFile(path.join(testDir, files[0]));
    expect(content.length).toBe(HEADER_SIZE);
    
    await wal.close();
  });

  it('should append frames correctly and trigger rotation flag', async () => {
    // max size 20 bytes. Header is 16 bytes. So one append will push it over.
    const wal = new ProcessLocalWal(testDir, 'worker', { maxSize: 20 });
    await wal.init();
    
    const dummyFrame = Buffer.alloc(10, 'A');
    wal.append(dummyFrame);
    
    expect(wal.needsRotation()).toBe(true);
    
    await wal.rotate();
    
    const files = await fs.readdir(testDir);
    expect(files.length).toBe(2);
    expect(files).toContain('worker-000001.rkpwal');
    expect(files).toContain('worker-000002.rkpwal');
    
    await wal.close();
  });

  it('should flush without errors', async () => {
    const wal = new ProcessLocalWal(testDir, 'worker');
    await wal.init();
    wal.append(Buffer.alloc(100));
    await expect(wal.flush()).resolves.toBeUndefined();
    await wal.close();
  });
});
