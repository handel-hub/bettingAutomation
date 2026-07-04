const fs = require('fs');
const path = require('path');
const { logger } = require('./config');

class SessionManager {
    constructor(settings) {
        this.memorySettings = settings.Memory || {};
        this.sessionsDir = path.join(__dirname, '..', 'sessions');
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir);
        }
    }

    async loadSession(context, username) {
        const sessionFile = path.join(this.sessionsDir, `${username}.json`);
        if (fs.existsSync(sessionFile)) {
            try {
                const cookies = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
                await context.addCookies(cookies);
                logger.info(`Loaded session for ${username}`);
                return true;
            } catch (err) {
                logger.error(`Failed to load session for ${username}:`, err);
            }
        }
        return false;
    }

    async saveSession(context, username) {
        try {
            const cookies = await context.cookies();
            const sessionFile = path.join(this.sessionsDir, `${username}.json`);
            fs.writeFileSync(sessionFile, JSON.stringify(cookies, null, 2));
            logger.info(`Saved session for ${username}`);
        } catch (err) {
            logger.error(`Failed to save session for ${username}:`, err);
        }
    }

    async login(page, username, password) {
        logger.info(`Attempting login for ${username}...`);
        
        try {
            await page.goto('https://www.sportybet.com/', { waitUntil: 'domcontentloaded' });
            
            // Assume Sportybet login flow here (adjust selectors as needed for actual site)
            const loginInputSelector = 'input[name="phone"]'; 
            const pwdInputSelector = 'input[name="psw"]';     
            const loginBtnSelector = '.m-login-btn';          
            
            // Check if already logged in via cookies
            const isLoggedIn = await page.locator('.m-balance').count() > 0; 
            if (isLoggedIn) {
                logger.info(`${username} is already logged in (session restored).`);
                return true;
            }

            // Click login button to open modal if needed
            // await page.click('.login-btn-selector');
            
            await page.waitForSelector(loginInputSelector, { timeout: 10000 });
            await page.fill(loginInputSelector, username);
            await page.fill(pwdInputSelector, password);
            await page.click(loginBtnSelector);

            // Wait for successful login indicator
            await page.waitForSelector('.m-balance', { timeout: 15000 });
            logger.info(`Successfully logged in ${username}`);
            return true;
        } catch (err) {
            logger.error(`Login failed for ${username}:`, err.message);
            return false;
        }
    }

    // Action sequence recording and playback
    recordAction(action) {
        if (this.memorySettings.record_action_sequence === 'true') {
            const sequenceFile = path.join(__dirname, '..', 'sequences', 'startup.json');
            let actions = [];
            if (fs.existsSync(sequenceFile)) {
                try {
                    actions = JSON.parse(fs.readFileSync(sequenceFile, 'utf-8'));
                } catch(e) {}
            }
            actions.push(action);
            
            const dir = path.dirname(sequenceFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            
            fs.writeFileSync(sequenceFile, JSON.stringify(actions, null, 2));
        }
    }

    async replayActions(page) {
        if (this.memorySettings.replay_action_sequence === 'true') {
            const sequenceFile = path.join(__dirname, '..', 'sequences', 'startup.json');
            if (fs.existsSync(sequenceFile)) {
                try {
                    const actions = JSON.parse(fs.readFileSync(sequenceFile, 'utf-8'));
                    logger.info(`Replaying ${actions.length} startup actions on page...`);
                    for (const action of actions) {
                        if (action.type === 'click') {
                            await page.click(action.selector, { timeout: 5000 }).catch(() => {});
                        } else if (action.type === 'navigate') {
                            await page.goto(action.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
                        }
                    }
                } catch(e) {
                    logger.error('Failed to replay startup actions:', e.message);
                }
            }
        }
    }
}

module.exports = { SessionManager };
