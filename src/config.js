const fs = require('fs');
const path = require('path');
const ini = require('ini');
const pino = require('pino');

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

function loadConfig() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.ini');
        const settingsRaw = fs.readFileSync(settingsPath, 'utf-8');
        const settings = ini.parse(settingsRaw);

        const accountsPath = path.join(__dirname, '..', 'accounts.txt');
        const accountsRaw = fs.readFileSync(accountsPath, 'utf-8');
        const accounts = accountsRaw.split('\n').filter(line => line.trim() !== '').map(line => {
            const [username, password] = line.split(',');
            return { username: username?.trim(), password: password?.trim() };
        });

        const proxiesPath = path.join(__dirname, '..', 'proxies.txt');
        let proxies = [];
        if (fs.existsSync(proxiesPath)) {
            const proxiesRaw = fs.readFileSync(proxiesPath, 'utf-8');
            proxies = proxiesRaw.split('\n').filter(line => line.trim() !== '').map(line => line.trim());
        }

        return { settings, accounts, proxies };
    } catch (err) {
        logger.error('Failed to load configuration files:', err);
        process.exit(1);
    }
}

module.exports = { loadConfig, logger };
