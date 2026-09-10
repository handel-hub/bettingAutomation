import { EventEmitter } from 'node:events';
import { logger } from '../../utils/logger.mjs';
import { Command } from '../execution/Command.mjs';
import { CDPMutex } from '../synchronization/coordination/CDPMutex.mjs';

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
        this.cdpMutex = options.cdpMutex ?? new CDPMutex();
    }

    initiateCorrectiveNavigation(browserId, url, baselineGes = undefined) {
        logger.info(`[RecoveryManager] Issuing CORRECTIVE_NAV to ${browserId} for url: ${url} (BaselineGES: ${baselineGes})`);
        logger.info(`[Telemetry] {"event":"CORRECTIVE_NAV_ISSUED","browserId":"${browserId}","targetUrl":"${url}","baselineGes":${baselineGes}}`);
        this.emit('Command', new Command({
            category: 'Navigation',
            type: 'navigate',
            target: browserId,
            payload: { url, navClass: 'CORRECTIVE_NAV', baselineGes },
            source: 'RecoveryManager'
        }));
    }

    async heal(browserId) {
        const target = this.registry.get(browserId);
        if (!target) {
            logger.warn(`Heal requested for unknown browser [${browserId}]`);
            return;
        }

        const lockAcquired = await this.cdpMutex.acquireRecoveryLock(browserId, target.context);
        if (!lockAcquired) {
            logger.info(`Heal already in progress for [${browserId}], ignoring duplicate trigger.`);
            return;
        }

        const { role, username, proxyUrl } = target;
        const startTime = Date.now();
        logger.warn(`Attempting to heal browser [${browserId}] (role=${role})...`);
        logger.info(`[Telemetry] {"event":"HEAL_START","browserId":"${browserId}","role":"${role}","attempt":1,"maxAttempts":${this.maxAttempts}}`);

        try {
            await this.closeQuietly(target);
            this.registry.remove(browserId);

            for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
                try {
                    await this.respawn(browserId, role, proxyUrl, username);

                    // VALIDATION GATE: Verify browser and session readiness after respawn
                    const targetState = this.registry.get(browserId);
                    if (!targetState || !targetState.browser || !targetState.page) {
                        throw new Error(`Browser instance or page missing after respawn for [${browserId}]`);
                    }

                    if (typeof targetState.browser.isConnected === 'function' && !targetState.browser.isConnected()) {
                        throw new Error(`Browser [${browserId}] is disconnected immediately after respawn`);
                    }

                    if (role !== 'master') {
                        const isLoggedIn = await this.sessionManager.verifyLoggedIn(browserId);
                        if (!isLoggedIn) {
                            throw new Error(`Session verification failed after respawn for slave [${browserId}]`);
                        }
                    }

                    const durationMs = Date.now() - startTime;
                    logger.info(`[Telemetry] {"event":"HEAL_SUCCESS","browserId":"${browserId}","role":"${role}","attempt":${attempt},"durationMs":${durationMs}}`);
                    logger.info(`Healed browser [${browserId}] on attempt ${attempt}/${this.maxAttempts}.`);
                    
                    if (role !== 'master') {
                        const masterState = this.registry.getMaster();
                        if (masterState) {
                            this.initiateCorrectiveNavigation(browserId, masterState.url || 'about:blank', masterState.currentGes || 0);
                        }
                    }
                    return;
                } catch (err) {
                    logger.error(`Heal attempt ${attempt}/${this.maxAttempts} failed for [${browserId}]: ${err.message}`);
                    logger.info(`[Telemetry] {"event":"HEAL_ATTEMPT_FAILED","browserId":"${browserId}","role":"${role}","attempt":${attempt},"error":"${err.message.replace(/"/g, '\\"')}"}`);

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
            logger.info(`[Telemetry] {"event":"HEAL_ABANDONED","browserId":"${browserId}","role":"${role}","totalAttempts":${this.maxAttempts}}`);
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'HEAL_FAILED',
                target: browserId,
                payload: { maxAttempts: this.maxAttempts },
                source: 'RecoveryManager'
            }));
        } finally {
            this.cdpMutex.releaseRecoveryLock(browserId);
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

        const password = this.credentialsMap.get(username);
        if (!password) {
            throw new Error(`No stored credentials for ${username}; cannot recover [${id}]`);
        }

        const recovered = await this.sessionManager.restoreOrLogin(id, username, password);
        logger.info(`[Telemetry] {"event":"HEAL_SESSION_RESTORE","browserId":"${id}","role":"${role}","restored":${Boolean(recovered)}}`);
        if (!recovered) {
            throw new Error(`Failed to restore session or log in while recovering [${id}]`);
        }

        if (role === 'master') {
            this.emit('Command', new Command({
                category: 'Recovery',
                type: 'MASTER_HEALED',
                target: id,
                source: 'RecoveryManager'
            }));
            // Task 11: Emit NETWORK_IDLE post-reload to resolve pending wait-for-network barriers
            this.emit('Command', new Command({
                category: 'Network',
                type: 'NETWORK_IDLE',
                target: id,
                source: 'RecoveryManager'
            }));
            return;
        }
    }
}
