import axios from 'axios';
import { logger } from './config.mjs';

export class ProxyManager {
    constructor(proxies, settings) {
        this.proxies = proxies.map(url => ({ url, isOnline: false }));
        this.settings = settings.Proxy || {};
        this.failureMode = this.settings.proxy_failure_mode || 'loose';
    }

    async validateProxies() {
        logger.info('Starting proxy validation...');
        const validationPromises = this.proxies.map(async (proxy) => {
            try {
                let url;
                try {
                    url = new URL(proxy.url);
                } catch (e) {
                    throw new Error('Invalid URL format (missing http/https?)');
                }

                const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
                const axiosConfig = {
                    proxy: { protocol: url.protocol.replace(':', ''), host: url.hostname, port: port },
                    timeout: 5000,
                };
                if (url.username && url.password) {
                    axiosConfig.proxy.auth = { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
                }
                
                await axios.get('https://api.ipify.org?format=json', axiosConfig);
                proxy.isOnline = true;
                logger.info(`Proxy ${proxy.url} is ONLINE.`);
            } catch (err) {
                proxy.isOnline = false;
                const errMsg = err.response?.status === 429 ? 'Rate Limited (429)' : err.message;
                if (this.failureMode === 'strict') {
                    logger.error(`Proxy ${proxy.url} is OFFLINE. (strict mode) - ${errMsg}`);
                } else {
                    logger.warn(`Proxy ${proxy.url} is OFFLINE. (loose mode) - ${errMsg}`);
                }
            }
        });

        await Promise.all(validationPromises);
        const onlineCount = this.proxies.filter(p => p.isOnline).length;
        logger.info(`Proxy validation complete. ${onlineCount}/${this.proxies.length} proxies online.`);
        return onlineCount > 0 || this.proxies.length === 0;
    }

    getValidProxies() {
        return this.proxies.filter(p => p.isOnline).map(p => p.url);
    }
}
