const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { logger } = require('./config');

class BrowserManager {
    constructor(settings) {
        this.settings = settings.AntiDetection || {};
        this.spawning = settings.Spawning || {};
        
        if (this.settings.use_stealth_plugin === 'true') {
            chromium.use(stealth);
        }
    }

    async launchBrowser(isMaster = false) {
        const headless = isMaster ? false : (this.spawning.slave_mode === 'headless');
        const executablePath = this.settings.browser_binary === 'chrome' 
            ? this.getChromePath() 
            : undefined;

        const launchOptions = {
            headless,
            executablePath,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        };

        if (this.settings.block_webrtc === 'true') {
            launchOptions.args.push(
                '--disable-webrtc-hw-encoding',
                '--disable-webrtc-hw-decoding',
                '--enforce-webrtc-ip-permission-check',
                '--force-webrtc-ip-handling-policy=default_public_interface_only'
            );
        }

        try {
            logger.info(`Launching ${isMaster ? 'Master' : 'Slave'} browser...`);
            const browser = await chromium.launch(launchOptions);
            return browser;
        } catch (err) {
            logger.error('Failed to launch browser (make sure Chrome is installed if using browser_binary=chrome):', err.message);
            throw err;
        }
    }

    async createContext(browser, proxyUrl) {
        const contextOptions = {
            viewport: { width: 1280, height: 720 },
            locale: 'en-US' // default
        };

        if (proxyUrl) {
            const url = new URL(proxyUrl);
            contextOptions.proxy = {
                server: `${url.protocol}//${url.hostname}:${url.port}`
            };
            if (url.username && url.password) {
                contextOptions.proxy.username = url.username;
                contextOptions.proxy.password = url.password;
            }
            
            if (this.settings.match_proxy_timezone === 'true') {
                // In a real scenario, fetch TZ for the proxy IP. 
                // Defaulting to Europe/London for the scaffold.
                contextOptions.timezoneId = 'Europe/London'; 
            }
        }

        if (this.settings.randomize_user_agent === 'true') {
            contextOptions.userAgent = this.getRandomUserAgent();
        }

        const context = await browser.newContext(contextOptions);
        
        if (this.settings.canvas_spoofing === 'true') {
            await context.addInitScript(() => {
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type) {
                    const context = originalGetContext.apply(this, arguments);
                    if (type === '2d') {
                        const originalGetImageData = context.getImageData;
                        context.getImageData = function() {
                            const imageData = originalGetImageData.apply(this, arguments);
                            // Add slight noise
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                imageData.data[i] = imageData.data[i] + (Math.random() > 0.5 ? 1 : -1);
                            }
                            return imageData;
                        };
                    }
                    return context;
                };
            });
        }

        return context;
    }

    getChromePath() {
        if (process.platform === 'win32') {
            return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else if (process.platform === 'darwin') {
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        } else {
            return '/usr/bin/google-chrome';
        }
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }
}

module.exports = { BrowserManager };
