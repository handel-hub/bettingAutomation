import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WalWriterWorker } from './WalWriterWorker.mjs';
import { FlushScheduler } from './FlushScheduler.mjs';

describe('WalWriterWorker & FlushScheduler', () => {
  it('Worker should filter out already written facts using LSN', async () => {
    const mockLedger = {
      snapshot: vi.fn().mockReturnValue([
        { lsn: 1, domain: 'Execution', type: 'Decision' },
        { lsn: 2, domain: 'Execution', type: 'Decision' }
      ])
    };
    
    const mockWal = {
      append: vi.fn(),
      needsRotation: vi.fn().mockReturnValue(false),
      flush: vi.fn().mockResolvedValue(undefined),
      rotate: vi.fn().mockResolvedValue(undefined)
    };

    const worker = new WalWriterWorker(mockLedger, mockWal);
    
    // First flush (reads LSN 1, 2)
    await worker.processAndFlush();
    expect(mockWal.append).toHaveBeenCalledTimes(2);
    expect(worker.lastWrittenLsn).toBe(2);
    expect(mockWal.flush).toHaveBeenCalledTimes(1);

    // Second flush (snapshot returns same facts, should ignore them)
    mockWal.append.mockClear();
    mockWal.flush.mockClear();
    
    await worker.processAndFlush();
    
    expect(mockWal.append).not.toHaveBeenCalled();
    expect(mockWal.flush).not.toHaveBeenCalled();
    expect(worker.lastWrittenLsn).toBe(2);
  });

  it('Worker should trigger rotation if WAL signals needsRotation', async () => {
    const mockLedger = {
      snapshot: vi.fn().mockReturnValue([{ lsn: 1, domain: 'Execution', type: 'Decision' }])
    };
    
    const mockWal = {
      append: vi.fn(),
      needsRotation: vi.fn().mockReturnValue(true), // signals rotation needed
      flush: vi.fn().mockResolvedValue(undefined),
      rotate: vi.fn().mockResolvedValue(undefined)
    };

    const worker = new WalWriterWorker(mockLedger, mockWal);
    await worker.processAndFlush();
    
    expect(mockWal.rotate).toHaveBeenCalledTimes(1);
  });

  it('Scheduler should trigger flush loop', async () => {
    const mockWorker = {
      processAndFlush: vi.fn().mockResolvedValue(undefined)
    };
    
    const mockLedger = {
      ringBuffer: { capacity: 10, head: 0, tail: 0, isFull: false }
    };

    const scheduler = new FlushScheduler(mockWorker, mockLedger, { intervalMs: 10 });
    
    scheduler.start();
    
    // Wait for a few intervals
    await new Promise(resolve => setTimeout(resolve, 100));
    
    scheduler.stop();
    
    expect(mockWorker.processAndFlush.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
