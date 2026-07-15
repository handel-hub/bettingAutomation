import { logger } from '../../config.mjs';
import EventEmitter from 'node:events';
import { LocatorResolver } from './LocatorResolver.mjs';
import { 
    LocatorResolutionError, 
    OverlayInterceptionError, 
    ElementDetachedError, 
    PlaywrightTimeoutError,
    GlobalTimeoutError
} from './errors.mjs';

export class ActionSimulator extends EventEmitter {
    constructor() {
        super();
        this.MAX_EXECUTION_RETRIES = 3;
    }

    async _executeWithRecovery(command, page, interactionType, actionFn) {
        let attempts = 0;
        const locators = command.payload.locators || [];

        while (attempts < this.MAX_EXECUTION_RETRIES) {
            attempts++;
            
            // Phase 2: Resolve (Decoupled)
            const result = await LocatorResolver.resolve(page, locators, interactionType);
            
            if (!result.success) {
                // If it fails to resolve, throw the timeout error up
                const error = new GlobalTimeoutError(result.failureReason);
                error.addChain(`[LF-504] Resolution failed during execution attempt ${attempts}`);
                throw error;
            }

            // Phase 3: Physical Execution
            const execStart = Date.now();
            try {
                await actionFn(result.playwrightLocator);
                
                // Success - Log Execution metrics separate from Resolution metrics
                logger.info(`[ActionSimulator] Execution Success | Action: ${interactionType} | Exec Duration: ${Date.now() - execStart}ms | Retries: ${attempts - 1}`);
                return result; // return the resolution info so caller can log the used locator
                
            } catch (err) {
                const errMessage = err.message || '';
                let automationError;

                // Playwright Interception & Detachment mapping
                if (errMessage.includes('is intercepted by') || errMessage.includes('covered by')) {
                    automationError = new OverlayInterceptionError(errMessage);
                } else if (errMessage.includes('Target closed') || errMessage.includes('Node is detached') || errMessage.includes('DOMElement is no longer attached')) {
                    automationError = new ElementDetachedError(errMessage);
                } else if (errMessage.includes('Timeout')) {
                    automationError = new PlaywrightTimeoutError(errMessage);
                } else {
                    // Unknown Playwright error - throw it immediately to avoid infinite loops on syntax errors
                    throw err;
                }

                logger.warn(`[ActionSimulator] ${automationError.code} Execution failed on attempt ${attempts}: ${automationError.message}. Triggering re-resolution.`);
                
                if (attempts >= this.MAX_EXECUTION_RETRIES) {
                    automationError.addChain(`[LF-505] Max execution retries (${this.MAX_EXECUTION_RETRIES}) reached for Action: ${interactionType}`);
                    throw automationError;
                }

                // Cooldown before retrying full resolution loop
                await new Promise(r => setTimeout(r, 150));
            }
        }
    }

    async execute(browserObj, command) {
        const startTime = Date.now();
        const { id, page } = browserObj;
        
        const lifecycle = 'EXECUTING';
        logger.info(`[Execute Start] Command ${command.id} on [${id}] | Latency (Receive->Start): ${startTime - command.creationTime}ms | Lifecycle: ${lifecycle}`);
        try {
            let usedLocatorInfo = null;
            const { type, payload } = command;
            const locators = payload.locators || [];

            // Perform actions using the new decoupled recovery loop
            if (type === 'CLICK' || type === 'click') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'click', async (loc) => await loc.click());
            } else if (type === 'DOUBLE_CLICK' || type === 'dblclick') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'dblclick', async (loc) => await loc.dblclick());
            } else if (type === 'DRAG') {
                const path = payload.path || [];
                if (path.length > 0) {
                    if (locators.length > 0) {
                        usedLocatorInfo = await this._executeWithRecovery(command, page, 'drag start', async (loc) => await loc.hover());
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
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'input', async (loc) => {
                    await loc.fill('');
                    if (payload.delay) {
                        await loc.pressSequentially(payload.value, { delay: payload.delay });
                    } else {
                        await loc.fill(payload.value);
                    }
                });
            } else if (type === 'KEYBOARD' || type === 'keyboard') {
                if (locators.length > 0) {
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'keyboard', async (loc) => {
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
                    usedLocatorInfo = await this._executeWithRecovery(command, page, 'pointerdown', async (loc) => await loc.hover());
                }
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.down();
            } else if (type === 'pointerup') {
                await page.mouse.move(payload.x, payload.y);
                await page.mouse.up();
            } else if (type === 'focus') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'focus', async (loc) => await loc.focus());
            } else if (type === 'blur') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'blur', async (loc) => await loc.blur());
            } else if (type === 'window_scroll') {
                await page.evaluate(({x, y}) => window.scrollTo(x, y), { x: payload.scrollX, y: payload.scrollY });
            } else if (type === 'element_scroll') {
                usedLocatorInfo = await this._executeWithRecovery(command, page, 'element_scroll', async (loc) => {
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
            logger.info(`[Execute End] [Result: Success] Command ${command.id} [${command.type}] on [${id}] | Total Time: ${Date.now() - startTime}ms${locatorStr} | Lifecycle: ${lifecycle}`);

            this.emit('ActionSuccess', { id, command });
            return true;
        } catch (err) {
            const lifecycle = 'FAILED';
            
            if (err instanceof GlobalTimeoutError || err instanceof OverlayInterceptionError || err instanceof ElementDetachedError || err instanceof PlaywrightTimeoutError || err instanceof LocatorResolutionError) {
                logger.warn(`[Interaction Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
                return false;
            }

            logger.error(`[Execute End] [Result: Failure] Command ${command.id} on slave [${id}]: ${err.message} | Execution duration: ${Date.now() - startTime}ms | Lifecycle: ${lifecycle}`);
            this.emit('ActionFailure', { id, command, error: err });
            return false;
        }
    }
}
