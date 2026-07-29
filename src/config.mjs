import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ini from 'ini';
import pino from 'pino';
import dotenv from 'dotenv';
import { encrypt, decrypt } from './utils/crypto.mjs';
import { redactUsername } from './utils/redact.mjs';
import { globalRecorder } from './rkp/RuntimeKnowledgePlatform.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    },
    hooks: {
        logMethod(inputArgs, method, level) {
            if (process.env.RKP_PINO_DUAL_WRITE === 'true') {
                try {
                    let msg = '';
                    let meta = {};
                    
                    if (inputArgs.length > 0) {
                        if (typeof inputArgs[0] === 'string') {
                            msg = inputArgs[0];
                        } else if (typeof inputArgs[0] === 'object') {
                            meta = inputArgs[0];
                            if (typeof inputArgs[1] === 'string') {
                                msg = inputArgs[1];
                            }
                        }
                    }

                    let levelStr = 'info';
                    if (level === 20) levelStr = 'debug';
                    else if (level === 40) levelStr = 'warn';
                    else if (level >= 50) levelStr = 'error'; // includes fatal

                    globalRecorder.record({
                        domain: 'Diagnostics',
                        type: 'LogFact',
                        level: levelStr,
                        message: msg,
                        metadata: meta,
                        traceId: meta?.traceId || '',
                        spanId: meta?.spanId || ''
                    });
                } catch (err) {
                    console.error('[RKP Pino Hook] Error:', err);
                    // Swallow errors to guarantee legacy logging stability
                }
            }
            return method.apply(this, inputArgs);
        }
    }
});

export async function loadConfig() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.ini');
        const settingsRaw = await fsPromises.readFile(settingsPath, 'utf-8');
        const settings = ini.parse(settingsRaw);

        const accountsPath = path.join(__dirname, '..', 'accounts.txt');
        const accountsEncPath = path.join(__dirname, '..', 'accounts.enc');
        let accountsRaw = '';

        if (fs.existsSync(accountsPath)) {
            if (fs.existsSync(accountsEncPath)) {
                logger.warn('Both accounts.txt and accounts.enc exist; accounts.txt will be re-migrated and accounts.enc will be overwritten.');
            }

            logger.info('Migrating plaintext accounts.txt to encrypted accounts.enc...');
            accountsRaw = await fsPromises.readFile(accountsPath, 'utf-8');

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
            await fsPromises.writeFile(tmpPath, encryptedJson, { mode: 0o600 });
            await fsPromises.rename(tmpPath, accountsEncPath);
            await fsPromises.unlink(accountsPath);
            logger.info('Successfully encrypted accounts (round-trip verified). Deleted plaintext accounts.txt.');
        } else if (fs.existsSync(accountsEncPath)) {
            try {
                const encryptedData = JSON.parse(await fsPromises.readFile(accountsEncPath, 'utf-8'));
                accountsRaw = decrypt(encryptedData, 'accounts');
            } catch (err) {
                logger.fatal(
                    'Failed to decrypt accounts.enc — MASTER_KEY may have changed since it was ' +
                    'encrypted. Restore the previous MASTER_KEY, or recreate accounts.txt from a ' +
                    'backup and let it re-migrate to accounts.enc on next startup.'
                );
                process.exit(1);
            }
        } else {
            logger.warn('No accounts found (neither accounts.txt nor accounts.enc exist).');
        }

        const accounts = accountsRaw.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const idx = line.indexOf(',');
                if (idx === -1) {
                    logger.warn(`Skipping malformed account line (no comma found): "${line}"`);
                    return null;
                }
                const username = line.slice(0, idx).trim();
                const password = line.slice(idx + 1).trim();
                if (line.slice(idx + 1).includes(',')) {
                    logger.warn(`Account line for "${redactUsername(username)}" contains extra commas in the password field — using everything after the first comma as-is.`);
                }
                return { username, password };
            })
            .filter(Boolean);

        const proxiesPath = path.join(__dirname, '..', 'proxies.txt');
        let proxies = [];
        if (fs.existsSync(proxiesPath)) {
            const proxiesRaw = await fsPromises.readFile(proxiesPath, 'utf-8');
            proxies = proxiesRaw.split('\n').filter(line => line.trim() !== '').map(line => line.trim());
        }

        return { settings, accounts, proxies };
    } catch (err) {
        logger.error('Failed to load configuration files:', err);
        process.exit(1);
    }
}
