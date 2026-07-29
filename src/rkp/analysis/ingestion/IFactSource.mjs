/**
 * @interface IFactSource
 * Abstract interface for all streaming fact sources (Historical WALs, Live WALs, WebSockets).
 */
export class IFactSource {
    /**
     * Reads Runtime Facts iteratively from the source.
     * @returns {AsyncGenerator<any, void, unknown>}
     */
    async *read() {
        throw new Error('IFactSource.read() must be implemented by subclasses.');
    }
}
