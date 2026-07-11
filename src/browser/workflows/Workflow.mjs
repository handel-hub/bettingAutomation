export class Workflow {
    constructor(selectors = {}) {
        this.selectors = selectors;
    }

    /**
     * Executes the workflow on the provided browser object.
     * @param {Object} browserObj - The browser object containing id, role, context, page, and metadata.
     * @param {Object} payload - Optional parameters passed in the command payload.
     * @param {Object} lockManager - Lock manager for concurrency control.
     * @param {Object} registry - Browser registry for syncing.
     * @returns {Promise<boolean>} - True if successful, false otherwise.
     */
    async execute(browserObj, payload = {}, lockManager = null, registry = null) {
        throw new Error('execute() must be implemented by subclasses.');
    }
}
