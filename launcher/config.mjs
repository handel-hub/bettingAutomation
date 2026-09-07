import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ini from 'ini';
import pino from 'pino';
import dotenv from 'dotenv';

import { redactUsername } from '../src/utils/redact.mjs';
import { globalRecorder } from '../src/rkp/RuntimeKnowledgePlatform.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envResult = dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

export const logger = pino({
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            },
            {
                target: 'pino/file',
                options: {
                    destination: './logs/app.log',
                    mkdir: true
                }
            }
        ]
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
                    try {
                        const logPath = path.join(__dirname, '..', 'fatal.log');
                        fs.appendFileSync(logPath, `[${new Date().toISOString()}] FATAL [RKP_Serialization_Fault]: ${err.stack || err.message || err}\n`);
                    } catch (e) {}
                    console.error('[RKP Pino Hook] Error:', err);
                }
            }
            return method.apply(this, inputArgs);
        }
    }
});

if (envResult && envResult.parsed) {
    logger.info(`Injected env (${Object.keys(envResult.parsed).length}) from .env`);
}

export async function loadConfig() {
    try {
        const settingsPath = path.join(__dirname, '..', 'settings.ini');
        const settingsRaw = await fsPromises.readFile(settingsPath, 'utf-8');
        const settings = ini.parse(settingsRaw);

        const accountsPath = path.join(__dirname, '..', 'accounts.txt');
        let accountsRaw = '';

        if (fs.existsSync(accountsPath)) {
            accountsRaw = await fsPromises.readFile(accountsPath, 'utf-8');
        } else {
            logger.warn('No accounts found (accounts.txt does not exist).');
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
