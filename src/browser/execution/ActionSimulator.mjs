import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { LocatorResolver } from './LocatorResolver.mjs';

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
        if (command.withLifecycle) command = command.withLifecycle('RECEIVED');
        logger.info(`[Slave Receive] Command ${command.id} for [${id}] | Latency (Creation->Receive): ${Date.now() - command.creationTime}ms | Lifecycle: ${command.lifecycle || 'N/A'}`);
        const prior = this.queues.get(id) ?? Promise.resolve();
        const run = prior.then(() => this.runCommand(browserObj, command));
        this.queues.set(id, run);
        return run;
    }

    async runCommand(browserObj, command) {
        const startTime = Date.now();
        const { id, page } = browserObj;
        if (command.withLifecycle) command = command.withLifecycle('EXECUTING');
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - command.creationTime}ms | Lifecycle: ${command.lifecycle || 'N/A'}`);
        try {
            let usedLocatorInfo = null;

            if (command.version === 2) {
                const { type, payload } = command;
                const locators = payload.locators || [];

                if (type === 'CLICK' || type === 'click') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'click', async (loc) => await loc.click());
                } else if (type === 'DOUBLE_CLICK' || type === 'dblclick') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'dblclick', async (loc) => await loc.dblclick());
                } else if (type === 'DRAG') {
                    const path = payload.path || [];
                    if (path.length > 0) {
                        if (locators.length > 0) {
                             usedLocatorInfo = await LocatorResolver.execute(page, locators, 'drag start', async (loc) => await loc.hover());
                        }
                        await page.mouse.move(path[0].x, path[0].y);
                        await page.mouse.down();
                        for (let i = 1; i < path.length; i++) {
                            await page.mouse.move(path[i].x, path[i].y);
                        }
                        await page.mouse.up();
                    }
                } else if (type === 'SCROLL' || type === 'wheel') {
                    const dx = payload.deltas ? payload.deltas.deltaX : payload.deltaX;
                    const dy = payload.deltas ? payload.deltas.deltaY : payload.deltaY;
                    await page.mouse.wheel(dx, dy);
                } else if (type === 'INPUT' || type === 'input') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'input', async (loc) => {
                        await loc.fill('');
                        if (payload.delay) {
                            await loc.pressSequentially(payload.value, { delay: payload.delay });
                        } else {
                            await loc.fill(payload.value);
                        }
                    });
                } else if (type === 'KEYBOARD' || type === 'keyboard') {
                    if (locators.length > 0) {
                        usedLocatorInfo = await LocatorResolver.execute(page, locators, 'keyboard', async (loc) => {
                            await loc.focus();
                            await page.keyboard.press(payload.key);
                        });
                    } else {
                        await page.keyboard.press(payload.key);
                    }
                } else if (type === 'HOVER') {
                    await page.mouse.move(payload.coordinates.x, payload.coordinates.y);
                } 
                // Legacy v2 types for fallback
                else if (type === 'pointermove') {
                    await page.mouse.move(payload.x, payload.y);
                } else if (type === 'pointerdown') {
                    if (locators.length > 0) {
                        usedLocatorInfo = await LocatorResolver.execute(page, locators, 'pointerdown', async (loc) => await loc.hover());
                    }
                    await page.mouse.move(payload.x, payload.y);
                    await page.mouse.down();
                } else if (type === 'pointerup') {
                    await page.mouse.move(payload.x, payload.y);
                    await page.mouse.up();
                } else if (type === 'focus') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'focus', async (loc) => await loc.focus());
                } else if (type === 'blur') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'blur', async (loc) => await loc.blur());
                } else if (type === 'window_scroll') {
                    await page.evaluate(({x, y}) => window.scrollTo(x, y), { x: payload.scrollX, y: payload.scrollY });
                } else if (type === 'element_scroll') {
                    usedLocatorInfo = await LocatorResolver.execute(page, locators, 'element_scroll', async (loc) => {
                        await loc.evaluate((node, data) => {
                            node.scrollTop = data.scrollTop;
                            node.scrollLeft = data.scrollLeft;
                        }, { scrollTop: payload.scrollTop, scrollLeft: payload.scrollLeft });
                    });
                } else if (type === 'navigate') {
                    await page.goto(payload.url, { waitUntil: 'domcontentloaded' });
                } else if (type === 'add_style') {
                    await page.addStyleTag({ content: payload.content });
                }
            } else {
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
            }
            
            if (command.withLifecycle) command = command.withLifecycle('COMPLETED');
            const locatorStr = usedLocatorInfo ? ` | Used Locator: [${usedLocatorInfo.strategy}] ${usedLocatorInfo.locator}` : '';
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Execution duration: ${Date.now() - startTime}ms${locatorStr} | Lifecycle: ${command.lifecycle || 'N/A'}`);

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            if (command.withLifecycle) command = command.withLifecycle('FAILED');
            
            if (err.message && err.message.includes('LocatorResolver failed')) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${command.lifecycle || 'N/A'}`);
                return false;
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${command.lifecycle || 'N/A'}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
