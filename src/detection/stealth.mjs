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
            '--disable-blink-features=AutomationControlled'
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
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/115.0.5790.130 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/116.0.5845.103 Mobile/15E148 Safari/604.1'
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

                const injectNoise = (canvas) => {
                    const ctx = originalGetContext.call(canvas, '2d');
                    if (ctx) {
                        ctx.fillStyle = \`rgba(\${Math.floor(Math.random() * 255)}, \${Math.floor(Math.random() * 255)}, \${Math.floor(Math.random() * 255)}, 0.01)\`;
                        ctx.fillRect(0, 0, 1, 1);
                    }
                };

                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function() {
                    injectNoise(this);
                    return originalToDataURL.apply(this, arguments);
                };

                const originalToBlob = HTMLCanvasElement.prototype.toBlob;
                HTMLCanvasElement.prototype.toBlob = function() {
                    injectNoise(this);
                    return originalToBlob.apply(this, arguments);
                };
            });
            logger.info('Applied Canvas spoofing to context.');
        }
    }
}
