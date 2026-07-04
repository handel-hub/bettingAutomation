import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
    }

    async execute(browserObj, command) {
        const { id, page } = browserObj;
        try {
            if (command.type === 'click') {
                await page.click(command.payload.selector, { timeout: 2000 });
            } else if (command.type === 'input') {
                await page.fill(command.payload.selector, command.payload.value, { timeout: 2000 });
            } else if (command.type === 'navigate') {
                await page.goto(command.payload.url, { waitUntil: 'domcontentloaded' });
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
