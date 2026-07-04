import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ini from 'ini';
import pino from 'pino';
import dotenv from 'dotenv';
import { encrypt, decrypt } from './utils/crypto.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

export function loadConfig() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.ini');
        const settingsRaw = fs.readFileSync(settingsPath, 'utf-8');
        const settings = ini.parse(settingsRaw);

        const accountsPath = path.join(__dirname, '..', 'accounts.txt');
        const accountsEncPath = path.join(__dirname, '..', 'accounts.enc');
        let accountsRaw = '';

        if (fs.existsSync(accountsPath)) {
            if (fs.existsSync(accountsEncPath)) {
                logger.warn('Both accounts.txt and accounts.enc exist; accounts.txt will be re-migrated and accounts.enc will be overwritten.');
            }

            logger.info('Migrating plaintext accounts.txt to encrypted accounts.enc...');
            accountsRaw = fs.readFileSync(accountsPath, 'utf-8');

            const encrypted = encrypt(accountsRaw, 'accounts');
            const encryptedJson = JSON.stringify(encrypted);

            // Don't delete the only plaintext copy of these credentials on
            // faith - decrypt what we just wrote and confirm it matches
            // before touching accounts.txt.
            const roundTrip = decrypt(JSON.parse(encryptedJson), 'accounts');
            if (roundTrip !== accountsRaw) {
                throw new Error('Encryption round-trip check failed during accounts migration; aborting before deleting accounts.txt.');
            }

            const tmpPath = `${accountsEncPath}.tmp`;
            fs.writeFileSync(tmpPath, encryptedJson, { mode: 0o600 });
            fs.renameSync(tmpPath, accountsEncPath);
            fs.unlinkSync(accountsPath);
            logger.info('Successfully encrypted accounts (round-trip verified). Deleted plaintext accounts.txt.');
        } else if (fs.existsSync(accountsEncPath)) {
            const encryptedData = JSON.parse(fs.readFileSync(accountsEncPath, 'utf-8'));
            accountsRaw = decrypt(encryptedData, 'accounts');
        } else {
            logger.warn('No accounts found (neither accounts.txt nor accounts.enc exist).');
        }

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
