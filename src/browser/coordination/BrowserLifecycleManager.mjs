import { chromium } from 'playwright-extra';
import { devices } from 'playwright';
import { logger } from '../../config.mjs';
import { BrowserStateRegistry } from '../synchronization/BrowserStateRegistry.mjs';
import { LifecycleState } from '../synchronization/models/BrowserStateModel.mjs';
import { Capabilities } from '../synchronization/capabilities.mjs';


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

    async spawnBrowser(id, role, proxyUrl, username = null) {
        const isMaster = role === 'master';
        const headless = isMaster ? false : (this.spawning.slave_mode === 'headless');
        
        let slowMo = 0;
        if (this.spawning.debug_slow_mo) {
            slowMo = parseInt(this.spawning.debug_slow_mo, 10) || 0;
        }

        let executablePath = undefined;
        let args = [];

        if (this.stealthEngine) {
            executablePath = this.stealthEngine.settings.browser_binary === 'chrome'
                ? this.getChromePath()
                : undefined;
            args = this.stealthEngine.getLaunchArgs();
        }

        // Force the actual OS window to a mobile dimension (iPhone 12 Pro: 390x844)
        args.push('--window-size=390,844');

        try {
            logger.info(`Launching ${role} browser [${id}]...`);
            const browser = await chromium.launch({ 
                headless, 
                executablePath, 
                args,
                slowMo,
                devtools: role === 'master' // Automatically open DevTools for the master browser
            });
            
            const mobileDevice = devices['iPhone 12 Pro'];
            const contextOptions = { 
                ...mobileDevice,
                locale: 'en-US'
            };
            
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
            
            // Defeat Stealth Plugin's desktop spoofing by enforcing mobile properties
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' });
                Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
                Object.defineProperty(window, 'outerWidth', { get: () => 390 });
                Object.defineProperty(window, 'outerHeight', { get: () => 844 });
                if (window.screen) {
                    Object.defineProperty(window.screen, 'width', { get: () => 390 });
                    Object.defineProperty(window.screen, 'height', { get: () => 844 });
                    Object.defineProperty(window.screen, 'availWidth', { get: () => 390 });
                    Object.defineProperty(window.screen, 'availHeight', { get: () => 844 });
                }
            });

            const page = await context.newPage();
            
            if (!headless) {
                try {
                    const cdp = await context.newCDPSession(page);
                    const { windowId } = await cdp.send('Browser.getWindowForTarget');
                    await cdp.send('Browser.setWindowBounds', {
                        windowId,
                        bounds: { width: 390, height: 844, windowState: 'normal' }
                    });
                } catch(e) { 
                    logger.warn(`Could not force CDP window resize for [${id}]: ${e.message}`); 
                }
            }
            
            this.registry.register(id, role, browser, context, page, { proxyUrl, username });
            
            BrowserStateRegistry.update(id, {
                lifecycleState: LifecycleState.READY,
                capabilities: {
                    [Capabilities.CONNECTED]: true
                }
            });
            
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
