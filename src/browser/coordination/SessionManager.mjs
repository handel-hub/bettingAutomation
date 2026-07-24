import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../config.mjs';
import { encrypt, decrypt } from '../../utils/crypto.mjs';
import { redactUsername } from '../../utils/redact.mjs';
import { redactUsername } from '../../utils/redact.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SessionManager {
    constructor(registry) {
        this.registry = registry;
        this.sessionsDir = path.join(__dirname, '..', '..', '..', 'sessions');
        // Let's create it async in the save method or load method, but we can also just do it sync in the constructor if it's startup only. 
        // Wait, constructor can't be async. Let's leave existsSync/mkdirSync in the constructor since it runs once on startup.
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    /**
     * @returns {Promise<{ loaded: boolean, wasLegacy: boolean }>}
     */
    async loadSession(id, username) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return { loaded: false, wasLegacy: false };

        const sessionFile = path.join(this.sessionsDir, `${username}.json`);
        try {
            const fileData = JSON.parse(await fsPromises.readFile(sessionFile, 'utf-8'));
            let cookies;
            let wasLegacy = false;
            if (fileData && fileData.iv && fileData.authTag) {
                cookies = JSON.parse(decrypt(fileData, username));
            } else {
                cookies = fileData;
                wasLegacy = true;
                logger.info(`Loaded legacy plaintext session for ${redactUsername(username)}; it will be re-saved encrypted.`);
            }
            await browserObj.context.addCookies(cookies);
            logger.info(`Loaded session for ${redactUsername(username)} on [${id}]`);
            return { loaded: true, wasLegacy };
        } catch (err) {
            if (err.code !== 'ENOENT') {
                logger.error(`Failed to load session for ${redactUsername(username)} on [${id}]:`, err);
            }
        }
        return { loaded: false, wasLegacy: false };
    }

    async saveSession(id, username) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return;

        try {
            const cookies = await browserObj.context.cookies();
            const sessionFile = path.join(this.sessionsDir, `${username}.json`);
            const encrypted = encrypt(JSON.stringify(cookies), username);
            await fsPromises.writeFile(sessionFile, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
            logger.info(`Saved encrypted session for ${redactUsername(username)} from [${id}]`);
        } catch (err) {
            logger.error(`Failed to save session for ${redactUsername(username)}:`, err);
        }
    }

    /**
     * Checks whether a browser's current page reflects an authenticated session.
     * Does not navigate — caller is responsible for being on a page where
     * '.m-balance' would be expected to render if logged in.
     */
    async verifyLoggedIn(id, { timeoutMs = 3000 } = {}) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return false;

        try {
            await browserObj.page.locator('.m-balance').first().waitFor({ timeout: timeoutMs });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Tries to restore a saved session and verifies it actually works;
     * falls back to a fresh username/password login if the cookies are
     * missing, stale, or rejected. Single source of truth for "is this
     * slave really logged in" - used both at startup and during recovery.
     */
    async restoreOrLogin(id, username, password) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return false;

        const { loaded, wasLegacy } = await this.loadSession(id, username);
        if (loaded) {
            await browserObj.page.goto('https://www.sportybet.com/', { waitUntil: 'domcontentloaded' });
            if (await this.verifyLoggedIn(id)) {
                this.registry.updateState(id, 'Ready');
                if (wasLegacy) {
                    // The whole point of the migration path is to stop
                    // leaving plaintext cookies on disk - a session that
                    // still works needs to be re-saved now, not "on next
                    // save" (there may never be another save for this id).
                    await this.saveSession(id, username);
                }
                return true;
            }
            logger.warn(`Restored session for ${redactUsername(username)} on [${id}] did not verify as logged in; falling back to fresh login.`);
        }

        const loggedIn = await this.login(id, username, password);
        if (loggedIn) {
            await this.saveSession(id, username);
        }
        return loggedIn;
    }

    async login(id, username, password) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return false;
        
        logger.info(`Attempting login for ${redactUsername(username)} on [${id}]...`);
        const page = browserObj.page;

        try {
            await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'domcontentloaded' });
            
            const macroPath = path.join(__dirname, '..', '..', '..', 'sequences', 'login.json');
            let macroContent = await fsPromises.readFile(macroPath, 'utf-8');
            macroContent = macroContent.replace(/\{USERNAME\}/g, () => username).replace(/\{PASSWORD\}/g, () => password);
            const steps = JSON.parse(macroContent);

            for (const step of steps) {
                if (step.type === 'click') {
                    await page.click(step.selector, { timeout: 5000 });
                } else if (step.type === 'input') {
                    if (step.delay) {
                        await page.locator(step.selector).fill('');
                        await page.locator(step.selector).pressSequentially(step.value, { delay: step.delay });
                    } else {
                        await page.fill(step.selector, step.value, { timeout: 2000 });
                    }
                } else if (step.type === 'wait') {
                    if (step.selector) {
                        await page.waitForSelector(step.selector, { state: step.state || 'visible', timeout: step.timeout || 10000 });
                    } else if (step.timeout) {
                        await page.waitForTimeout(step.timeout);
                    }
                } else if (step.type === 'add_style') {
                    await page.addStyleTag({ content: step.content });
                }
            }

            const successPromise = page.waitForFunction(() => {
                return window.loginStatus === true || !!document.querySelector('.m-balance, .m-avatar, [data-op="bottom-me"].active, .user-assets-panel, .m-user-wrapper');
            }, { timeout: 15000 }).then(() => ({ outcome: 'success' })).catch(() => ({ outcome: 'timeout' }));

            const errorPromise = page.waitForSelector('div.m-toast, div.m-error-msg, .error-message', { timeout: 15000 })
                .then(async (el) => ({ outcome: 'error', message: await el.textContent() })).catch(() => ({ outcome: 'timeout' }));

            const result = await Promise.race([successPromise, errorPromise]);

            if (result.outcome === 'timeout') {
                throw new Error('Login timed out waiting for success or error indicator.');
            }

            if (result.outcome === 'error') {
                throw new Error(`Login rejected by UI: ${result.message}`);
            }

            logger.info(`Successfully logged in ${redactUsername(username)} on [${id}]`);
            this.registry.updateState(id, 'Ready');
            return true;
        } catch (err) {
            logger.error(`Login failed for ${redactUsername(username)} on [${id}]: ${err.message}`);
            try {
                const screenshotsDir = path.join(process.cwd(), 'screenshots');
                if (!fs.existsSync(screenshotsDir)) await fsPromises.mkdir(screenshotsDir, { recursive: true });
                const screenshotPath = path.join(screenshotsDir, `error_${id}_login_${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath });
                logger.info(`Saved error screenshot to ${screenshotPath}`);
            } catch (e) {}
            
            this.registry.updateState(id, 'Error');
            return false;
        }
    }
}
