import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SessionManager {
    constructor(registry) {
        this.registry = registry;
        this.sessionsDir = path.join(__dirname, '..', '..', '..', 'sessions');
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    async loadSession(id, username) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return false;

        const sessionFile = path.join(this.sessionsDir, `${username}.json`);
        if (fs.existsSync(sessionFile)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                await browserObj.context.addCookies(cookies);
                logger.info(`Loaded session for ${username} on [${id}]`);
                return true;
            } catch (err) {
                logger.error(`Failed to load session for ${username} on [${id}]:`, err);
            }
        }
        return false;
    }

    async saveSession(id, username) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return;

        try {
            const cookies = await browserObj.context.cookies();
            const sessionFile = path.join(this.sessionsDir, `${username}.json`);
            fs.writeFileSync(sessionFile, JSON.stringify(cookies, null, 2));
            logger.info(`Saved session for ${username} from [${id}]`);
        } catch (err) {
            logger.error(`Failed to save session for ${username}:`, err);
        }
    }

    async login(id, username, password) {
        const browserObj = this.registry.get(id);
        if (!browserObj) return false;
        
        logger.info(`Attempting login for ${username} on [${id}]...`);
        const page = browserObj.page;

        try {
            await page.goto('https://www.sportybet.com/', { waitUntil: 'domcontentloaded' });
            
            const loginInputSelector = 'input[name="phone"]'; 
            const pwdInputSelector = 'input[name="psw"]';     
            const loginBtnSelector = '.m-login-btn';          
            
            const isLoggedIn = await page.locator('.m-balance').count() > 0; 
            if (isLoggedIn) {
                logger.info(`${username} is already logged in (session restored).`);
                this.registry.updateState(id, 'Ready');
                return true;
            }
            
            await page.waitForSelector(loginInputSelector, { timeout: 10000 });
            await page.fill(loginInputSelector, username);
            await page.fill(pwdInputSelector, password);
            await page.click(loginBtnSelector);

            await page.waitForSelector('.m-balance', { timeout: 15000 });
            logger.info(`Successfully logged in ${username} on [${id}]`);
            this.registry.updateState(id, 'Ready');
            return true;
        } catch (err) {
            logger.error(`Login failed for ${username} on [${id}]:`, err.message);
            this.registry.updateState(id, 'Error');
            return false;
        }
    }
}
