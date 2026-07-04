import { logger } from '../config.mjs';

export class CommandRouter {
    constructor() {
        this.handlers = new Map();
    }

    register(category, type, handler) {
        if (!this.handlers.has(category)) {
            this.handlers.set(category, new Map());
        }
        const categoryMap = this.handlers.get(category);
        
        if (!categoryMap.has(type)) {
            categoryMap.set(type, []);
        }
        categoryMap.get(type).push(handler);
    }

    async route(command) {
        if (!command || !command.category) {
            logger.warn('Received invalid command object without a category');
            return;
        }

        const categoryMap = this.handlers.get(command.category);
        if (!categoryMap) {
            logger.debug(`No handlers registered for category [${command.category}]`);
            return;
        }

        const exactHandlers = categoryMap.get(command.type) || [];
        const wildcardHandlers = categoryMap.get('*') || [];
        const allHandlers = [...exactHandlers, ...wildcardHandlers];

        if (allHandlers.length === 0) {
            logger.debug(`No handlers registered for command [${command.category} : ${command.type}]`);
            return;
        }

        logger.info(`[CommandRouter] Routing [${command.category}:${command.type}] (${command.id})`);

        const promises = allHandlers.map(async (handler) => {
            try {
                await handler(command);
            } catch (err) {
                logger.error(`Error in Command handler for [${command.category}:${command.type}]: ${err.message}`);
            }
        });

        await Promise.allSettled(promises);
    }
}
