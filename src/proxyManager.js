const { logger } = require('./config');
const axios = require('axios');

class ProxyManager {
    constructor(proxies, settings) {
        this.proxies = proxies.map(url => ({
            url,
            isOnline: false,
            assignedAccounts: 0
        }));
        this.settings = settings.Proxy || {};
        this.maxAccountsPerProxy = parseInt(this.settings.max_accounts_per_proxy || '3', 10);
        this.allocationMode = this.settings.proxy_allocation_mode || 'round_robin';
        this.failureMode = this.settings.proxy_failure_mode || 'loose';
    }

    async validateProxies() {
        logger.info('Starting proxy validation...');
        const validationPromises = this.proxies.map(async (proxy) => {
            try {
                // Determine proxy host/port
                const url = new URL(proxy.url);
                const axiosConfig = {
                    proxy: {
                        protocol: url.protocol.replace(':', ''),
                        host: url.hostname,
                        port: parseInt(url.port, 10),
                    },
                    timeout: 5000
                };
                if (url.username && url.password) {
                    axiosConfig.proxy.auth = {
                        username: url.username,
                        password: url.password
                    };
                }
                
                await axios.get('http://ip-api.com/json', axiosConfig);
                proxy.isOnline = true;
                logger.info(`Proxy ${proxy.url} is ONLINE.`);
            } catch (err) {
                proxy.isOnline = false;
                if (this.failureMode === 'strict') {
                    logger.error(`Proxy ${proxy.url} is OFFLINE. (strict mode)`);
                } else {
                    logger.warn(`Proxy ${proxy.url} is OFFLINE. (loose mode)`);
                }
            }
        });

        await Promise.all(validationPromises);
        
        const onlineCount = this.proxies.filter(p => p.isOnline).length;
        logger.info(`Proxy validation complete. ${onlineCount}/${this.proxies.length} proxies online.`);
        return onlineCount > 0 || this.proxies.length === 0;
    }

    allocateProxy() {
        if (this.proxies.length === 0) return null; // No proxies configured

        const onlineProxies = this.proxies.filter(p => p.isOnline && p.assignedAccounts < this.maxAccountsPerProxy);
        if (onlineProxies.length === 0) {
            logger.warn('No available proxies with capacity!');
            return null;
        }

        let selectedProxy = null;
        if (this.allocationMode === 'random') {
            const randomIndex = Math.floor(Math.random() * onlineProxies.length);
            selectedProxy = onlineProxies[randomIndex];
        } else { // round_robin
            selectedProxy = onlineProxies.sort((a, b) => a.assignedAccounts - b.assignedAccounts)[0];
        }

        selectedProxy.assignedAccounts++;
        return selectedProxy.url;
    }
}

module.exports = { ProxyManager };
