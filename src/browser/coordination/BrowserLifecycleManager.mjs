import { chromium } from 'playwright-extra';
import { logger } from '../../config.mjs';

export class BrowserLifecycleManager {
    constructor(registry, settings, stealthEngine = null) {
        this.registry = registry;
        this.spawning = settings.Spawning || {};
        this.stealthEngine = stealthEngine;

        if (this.stealthEngine) {
            const stealthPlugin = this.stealthEngine.getStealthPlugin();
            if (stealthPlugin) {
                chromium.use(stealthPlugin);
            }
        }
    }

    async spawnBrowser(id, role, proxyUrl) {
        const isMaster = role === 'master';
        const headless = isMaster ? false : (this.spawning.slave_mode === 'headless');

        let executablePath = undefined;
        let args = [];

        if (this.stealthEngine) {
            executablePath = this.stealthEngine.settings.browser_binary === 'chrome'
                ? this.getChromePath()
                : undefined;
            args = this.stealthEngine.getLaunchArgs();
        }

        try {
            logger.info(`Launching ${role} browser [${id}]...`);
            const browser = await chromium.launch({ headless, executablePath, args });
            
            const contextOptions = { viewport: { width: 1280, height: 720 }, locale: 'en-US' };
            
            if (proxyUrl) {
                const url = new URL(proxyUrl);
                contextOptions.proxy = { server: `${url.protocol}//${url.hostname}:${url.port}` };
                if (url.username && url.password) {
                    contextOptions.proxy.username = url.username;
                    contextOptions.proxy.password = url.password;
                }
                if (this.stealthEngine && this.stealthEngine.settings.match_proxy_timezone === 'true') {
                    contextOptions.timezoneId = 'Europe/London';
                }
            }

            if (this.stealthEngine && this.stealthEngine.settings.randomize_user_agent === 'true') {
                contextOptions.userAgent = this.stealthEngine.getRandomUserAgent();
            }

            const context = await browser.newContext(contextOptions);
            if (this.stealthEngine) {
                await this.stealthEngine.applyContextStealth(context);
            }

            const page = await context.newPage();
            
            this.registry.register(id, role, context, page);
            
            return { browser, context, page };
        } catch (err) {
            logger.error(`Failed to spawn browser [${id}]:`, err.message);
            throw err;
        }
    }

    getChromePath() {
        if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        return '/usr/bin/google-chrome';
    }
}
