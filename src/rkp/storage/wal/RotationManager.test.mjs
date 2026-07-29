import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RotationManager } from './RotationManager.mjs';

describe('RotationManager', () => {
  const testDir = path.join(process.cwd(), 'test-wal-rotation');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should initialize at index 0 when directory is empty', async () => {
    const rm = new RotationManager(testDir, 'master', 100);
    await rm.init();
    
    expect(rm.currentIndex).toBe(0);
    
    const segment = rm.nextSegment();
    expect(segment.index).toBe(1);
    expect(segment.filePath).toMatch(/master-000001\.rkpwal$/);
  });

  it('should resume from the highest existing index', async () => {
    // Create dummy files
    await fs.writeFile(path.join(testDir, 'master-000001.rkpwal'), 'data');
    await fs.writeFile(path.join(testDir, 'master-000005.rkpwal'), 'data');
    await fs.writeFile(path.join(testDir, 'master-ignored.txt'), 'data');
    
    const rm = new RotationManager(testDir, 'master', 100);
    await rm.init();
    
    expect(rm.currentIndex).toBe(5);
    
    const segment = rm.nextSegment();
    expect(segment.index).toBe(6);
    expect(segment.filePath).toMatch(/master-000006\.rkpwal$/);
  });

  it('should signal rotation correctly', () => {
    const rm = new RotationManager(testDir, 'master', 100);
    expect(rm.shouldRotate(99)).toBe(false);
    expect(rm.shouldRotate(100)).toBe(true);
    expect(rm.shouldRotate(150)).toBe(true);
  });
});
