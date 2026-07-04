import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../config.mjs';

const stealth = stealthPlugin();

export class StealthEngine {
    constructor(settings) {
        this.settings = settings.AntiDetection || {};
    }

    getStealthPlugin() {
        if (this.settings.use_stealth_plugin === 'true') {
            return stealth;
        }
        return null;
    }

    getLaunchArgs() {
        const args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ];

        if (this.settings.block_webrtc === 'true') {
            args.push(
                '--disable-webrtc-hw-encoding',
                '--disable-webrtc-hw-decoding',
                '--enforce-webrtc-ip-permission-check',
                '--force-webrtc-ip-handling-policy=default_public_interface_only'
            );
        }

        return args;
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    async applyContextStealth(context) {
        if (this.settings.canvas_spoofing === 'true') {
            await context.addInitScript(() => {
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type) {
                    const ctx = originalGetContext.apply(this, arguments);
                    if (type === '2d') {
                        const originalGetImageData = ctx.getImageData;
                        ctx.getImageData = function() {
                            const imageData = originalGetImageData.apply(this, arguments);
                            // Add slight noise
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                imageData.data[i] = imageData.data[i] + (Math.random() > 0.5 ? 1 : -1);
                            }
                            return imageData;
                        };
                    }
                    return ctx;
                };
            });
            logger.info('Applied Canvas spoofing to context.');
        }
    }
}
