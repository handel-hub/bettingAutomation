import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { LocatorResolver } from './LocatorResolver.mjs';
import { LocatorResolutionError } from './errors.mjs';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
    }

    async execute(browserObj, command) {
        const startTime = Date.now();
        const { id, page } = browserObj;
        
        // Removed [Slave Receive] log since ExecutionScheduler now handles queue wait times,
        // and its [Scheduler] Dispatching log covers the execution initiation.
        const lifecycle = 'EXECUTING';
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - command.creationTime}ms | Lifecycle: ${lifecycle}`);
        try {
            let usedLocatorInfo = null;

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
            
            const lifecycle = 'COMPLETED';
            const locatorStr = usedLocatorInfo ? ` | Used Locator: [${usedLocatorInfo.strategy}] ${usedLocatorInfo.locator}` : '';
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Execution duration: ${Date.now() - startTime}ms${locatorStr} | Lifecycle: ${lifecycle}`);

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            const lifecycle = 'FAILED';
            
            if (err instanceof LocatorResolutionError) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
                return false;
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
