import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
        // One promise-chain tail per browser id. Both the live-mirroring
        // path (AutomationController.handleExecution) and MacroEngine call
        // execute() independently and can overlap on the same slave; this
        // makes sure two commands never run concurrently on the same page,
        // without blocking commands targeting *other* browsers at all.
        this.queues = new Map();
    }

    clearQueue(id) {
        this.queues.delete(id);
    }

    execute(browserObj, command) {
        const { id } = browserObj;
        const prior = this.queues.get(id) ?? Promise.resolve();
        const run = prior.then(() => this.runCommand(browserObj, command));
        this.queues.set(id, run);
        return run;
    }

    async runCommand(browserObj, command) {
        const { id, page } = browserObj;
        try {
            if (command.type === 'click') {
                await page.click(command.payload.selector, { timeout: 2000 });
            } else if (command.type === 'input') {
                if (command.payload.delay) {
                    await page.locator(command.payload.selector).fill('');
                    await page.locator(command.payload.selector).pressSequentially(command.payload.value, { delay: command.payload.delay });
                } else {
                    await page.fill(command.payload.selector, command.payload.value, { timeout: 2000 });
                }
            } else if (command.type === 'navigate') {
                await page.goto(command.payload.url, { waitUntil: 'domcontentloaded' });
            } else if (command.type === 'wait') {
                if (command.payload.selector) {
                    await page.waitForSelector(command.payload.selector, { state: command.payload.state || 'visible', timeout: command.payload.timeout || 10000 });
                } else if (command.payload.timeout) {
                    await page.waitForTimeout(command.payload.timeout);
                }
            } else if (command.type === 'add_style') {
                await page.addStyleTag({ content: command.payload.content });
            }
            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            logger.error(`Execution error on slave [${id}]: ${err.message}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
