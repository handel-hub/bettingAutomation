import axios from 'axios';
import { logger } from '../config.mjs';

export class ProxyManager {
    constructor(proxies, settings) {
        this.proxies = proxies.map(url => ({
            url,
            isOnline: false,
            assignedAccounts: 0
        }));
        this.settings = settings.Proxy || {};
        this.maxAccountsPerProxy = parseInt(this.settings.max_accounts_per_proxy || '3', 10);
        this.allocationMode = this.settings.proxy_allocation_mode || 'least_assigned'; // Renamed for accuracy
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

                // Determine port safely
                const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);

                const axiosConfig = {
                    proxy: {
                        protocol: url.protocol.replace(':', ''),
                        host: url.hostname,
                        port: port,
                    },
                    timeout: 5000,
                    // Use a different API to avoid the strict 45 req/min limits of ip-api.com
                    // or implement a retry mechanism if 429 is encountered.
                };

                if (url.username && url.password) {
                    axiosConfig.proxy.auth = {
                        username: decodeURIComponent(url.username),
                        password: decodeURIComponent(url.password) // Safely decode in case of special characters
                    };
                }
                
                await axios.get('https://api.ipify.org?format=json', axiosConfig);
                
                proxy.isOnline = true;
                logger.info(`Proxy ${proxy.url} is ONLINE.`);
            } catch (err) {
                proxy.isOnline = false;
                
                // Optional: Extract specific error message for better debugging
                const errMsg = err.response?.status === 429 ? 'Rate Limited (429)' : err.message;
                
                if (this.failureMode === 'strict') {
                    logger.error(`Proxy ${proxy.url} is OFFLINE. (strict mode) - ${errMsg}`);
                } else {
                    logger.warn(`Proxy ${proxy.url} is OFFLINE. (loose mode) - ${errMsg}`);
                }
            }
        });

        // Note: If you have > 50 proxies, consider using a library like 'p-limit' 
        // to batch these promises so you don't exhaust system sockets or trigger target rate limits.
        await Promise.all(validationPromises);
        
        const onlineCount = this.proxies.filter(p => p.isOnline).length;
        logger.info(`Proxy validation complete. ${onlineCount}/${this.proxies.length} proxies online.`);
        
        return onlineCount > 0 || this.proxies.length === 0;
    }

    allocateProxy() {
        if (this.proxies.length === 0) return null;

        const onlineProxies = this.proxies.filter(
            p => p.isOnline && p.assignedAccounts < this.maxAccountsPerProxy
        );
        
        if (onlineProxies.length === 0) {
            logger.warn('No available proxies with capacity!');
            return null;
        }

        let selectedProxy = null;
        if (this.allocationMode === 'random') {
            const randomIndex = Math.floor(Math.random() * onlineProxies.length);
            selectedProxy = onlineProxies[randomIndex];
        } else { 
            // 'least_assigned' (formerly round_robin)
            selectedProxy = onlineProxies.sort((a, b) => a.assignedAccounts - b.assignedAccounts)[0];
        }

        selectedProxy.assignedAccounts++;
        return selectedProxy.url;
    }

    // NEW: Method to free up proxies when accounts are done with them
    releaseProxy(proxyUrl) {
        const proxy = this.proxies.find(p => p.url === proxyUrl);
        if (proxy && proxy.assignedAccounts > 0) {
            proxy.assignedAccounts--;
        }
    }
}
