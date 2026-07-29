import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { IFactSource } from './IFactSource.mjs';
import { calculateCRC32, HEADER_SIZE, FRAME_HEADER_SIZE, MAX_FRAME_SIZE } from '../../storage/wal/Format.mjs';

/**
 * Reads historical WAL files incrementally using Node.js streams.
 * Yields raw facts to the analysis pipeline.
 */
export class HistoricalWalSource extends IFactSource {
    /**
     * @param {string[]} filePaths Array of WAL file paths to read sequentially.
     */
    constructor(filePaths) {
        super();
        this.filePaths = filePaths;
    }

    /**
     * Iterates through the provided WAL files and yields parsed facts.
     * Silently skips corrupt frames (partial writes).
     * @returns {AsyncGenerator<any, void, unknown>}
     */
    async *read() {
        for (const filePath of this.filePaths) {
            yield* this._readFile(filePath);
        }
    }

    async *_readFile(filePath) {
        const stream = fs.createReadStream(filePath);
        
        let buffer = Buffer.alloc(0);
        let hasReadHeader = false;

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);

            if (!hasReadHeader) {
                if (buffer.length < HEADER_SIZE) continue;
                // We could validate MAGIC_NUMBER here
                buffer = buffer.subarray(HEADER_SIZE);
                hasReadHeader = true;
            }

            while (buffer.length >= FRAME_HEADER_SIZE) {
                const payloadLength = buffer.readUInt32LE(0);
                
                // Defensive validation against corrupted payloadLength causing OOM
                if (payloadLength > MAX_FRAME_SIZE) {
                    console.warn(`[HistoricalWalSource] Corrupted payloadLength (${payloadLength} bytes) exceeds MAX_FRAME_SIZE in ${filePath}. Skipping remainder of segment.`);
                    break; // Skip the rest of this file since we lost frame synchronization
                }

                const expectedCrc = buffer.readUInt32LE(4);

                const frameTotalLength = FRAME_HEADER_SIZE + payloadLength;
                
                // If we don't have the full frame yet, wait for more chunks
                if (buffer.length < frameTotalLength) {
                    break;
                }

                const payloadBuf = buffer.subarray(FRAME_HEADER_SIZE, frameTotalLength);
                
                // Verify CRC32
                const actualCrc = calculateCRC32(payloadBuf);
                if (actualCrc === expectedCrc) {
                    try {
                        const payloadStr = payloadBuf.toString('utf8');
                        const rawFact = JSON.parse(payloadStr);
                        yield rawFact;
                    } catch (err) {
                        // Ignore JSON parse errors from corrupt payloads
                    }
                } else {
                    // CRC mismatch - Corruption detected
                    // In a production streaming system, we might want to log this or alert.
                    // For now, we skip the corrupted frame.
                    console.warn(`[HistoricalWalSource] CRC32 mismatch in ${filePath}. Expected ${expectedCrc}, got ${actualCrc}. Skipping frame.`);
                }

                // Advance buffer
                buffer = buffer.subarray(frameTotalLength);
            }
        }
    }
}
