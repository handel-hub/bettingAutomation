import { EventEmitter } from 'node:events';
import { logger } from '../../config.mjs';
import { Command } from '../execution/Command.mjs';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 2000;

export class RecoveryManager extends EventEmitter {
    constructor(registry, lifecycleManager, sessionManager, credentialsMap, options = {}) {
        super();
        this.registry = registry;
        this.lifecycleManager = lifecycleManager;
        this.sessionManager = sessionManager;
        this.credentialsMap = credentialsMap;
        this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
        this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
        this.healingIds = new Set();
    }

    async heal(browserId) {
        if (this.healingIds.has(browserId)) {
            logger.info(`Heal already in progress for [${browserId}], ignoring duplicate trigger.`);
            return;
        }

        const target = this.registry.get(browserId);
        if (!target) {
            logger.warn(`Heal requested for unknown browser [${browserId}]`);
            return;
        }

        const { role, username, proxyUrl } = target;
        this.healingIds.add(browserId);
        logger.warn(`Attempting to heal browser [${browserId}] (role=${role})...`);

        try {
            await this.closeQuietly(target);
            this.registry.remove(browserId);

            for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
                try {
                    await this.respawn(browserId, role, proxyUrl, username);
                    logger.info(`Healed browser [${browserId}] on attempt ${attempt}/${this.maxAttempts}.`);
                    return;
                } catch (err) {
                    logger.error(`Heal attempt ${attempt}/${this.maxAttempts} failed for [${browserId}]: ${err.message}`);

                    const partial = this.registry.get(browserId);
                    if (partial) {
                        await this.closeQuietly(partial);
                        this.registry.remove(browserId);
                    }

                    if (attempt < this.maxAttempts) {
                        const delay = this.baseDelayMs * 2 ** (attempt - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            logger.error(`Giving up healing browser [${browserId}] after ${this.maxAttempts} attempts. It will stay out of rotation until manually restarted.`);
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'HEAL_FAILED',
                target: browserId,
                payload: { maxAttempts: this.maxAttempts },
                source: 'RecoveryManager'
            }));
        } finally {
            this.healingIds.delete(browserId);
        }
    }

    async closeQuietly(browserObj) {
        try {
            await browserObj.browser?.close();
        } catch (err) {
            logger.warn(`Error closing stale browser [${browserObj.id}]: ${err.message}`);
        }
    }

    async respawn(id, role, proxyUrl, username) {
        await this.lifecycleManager.spawnBrowser(id, role, proxyUrl, username);

        if (role === 'master') {
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'MASTER_HEALED',
                target: id,
                source: 'RecoveryManager'
            }));
            return;
        }

        const password = this.credentialsMap.get(username);
        if (!password) {
            throw new Error(`No stored credentials for ${username}; cannot recover [${id}]`);
        }

        const recovered = await this.sessionManager.restoreOrLogin(id, username, password);
        if (!recovered) {
            throw new Error(`Failed to restore session or log in while recovering [${id}]`);
        }
    }
}
