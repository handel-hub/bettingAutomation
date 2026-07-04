const { loadConfig, logger } = require('./src/config');
const { ProxyManager } = require('./src/proxyManager');
const { BrowserManager } = require('./src/browserManager');
const { SessionManager } = require('./src/sessionManager');
const { ReplicationEngine } = require('./src/replicationEngine');
const { SequenceEngine } = require('./src/sequenceEngine');

async function main() {
    logger.info('Starting Betting Automation System...');

    // Load Configs
    const { settings, accounts, proxies } = loadConfig();
    
    // Initialize Proxy Engine
    const proxyManager = new ProxyManager(proxies, settings);
    await proxyManager.validateProxies();

    // Initialize Browser Engine
    const browserManager = new BrowserManager(settings);
    
    // Initialize Session Engine
    const sessionManager = new SessionManager(settings);

    // Arrays to hold state
    const slavePages = [];
    let masterPage = null;

    try {
        // Limit accounts
        const maxAccounts = parseInt(settings.Spawning.max_accounts_to_spawn || '10', 10);
        const activeAccounts = accounts.slice(0, maxAccounts);

        if (activeAccounts.length === 0) {
            logger.warn('No accounts configured. Exiting.');
            process.exit(0);
        }

        // 1. Spawn Master
        const masterBrowser = await browserManager.launchBrowser(true); // Master is always headed
        
        let masterProxyUrl = null;
        if (settings.Spawning.master_use_proxy === 'true') {
            masterProxyUrl = proxyManager.allocateProxy();
        }
        
        const masterContext = await browserManager.createContext(masterBrowser, masterProxyUrl);
        masterPage = await masterContext.newPage();
        
        // 2. Spawn Slaves
        logger.info(`Spawning ${activeAccounts.length} slave accounts...`);
        for (const account of activeAccounts) {
            const proxyUrl = proxyManager.allocateProxy();
            if (!proxyUrl && settings.Proxy.proxy_failure_mode === 'strict') {
                logger.error(`Skipping account ${account.username} due to lack of proxy (strict mode).`);
                continue;
            }

            const slaveBrowser = await browserManager.launchBrowser(false);
            const slaveContext = await browserManager.createContext(slaveBrowser, proxyUrl);
            const page = await slaveContext.newPage();
            
            // Authentication
            const loaded = await sessionManager.loadSession(slaveContext, account.username);
            if (!loaded) {
                const loggedIn = await sessionManager.login(page, account.username, account.password);
                if (loggedIn) {
                    await sessionManager.saveSession(slaveContext, account.username);
                } else {
                    logger.error(`Failed to authenticate ${account.username}. Skipping.`);
                    await slaveBrowser.close();
                    continue;
                }
            } else {
                // Already authenticated, navigate to home
                await page.goto('https://www.sportybet.com/', { waitUntil: 'domcontentloaded' });
            }

            slavePages.push(page);
        }

        // 3. Replay actions from memory (if enabled)
        await sessionManager.replayActions(masterPage);
        for (const page of slavePages) {
            await sessionManager.replayActions(page);
        }

        // 4. Setup Replication
        const replicationEngine = new ReplicationEngine(slavePages, sessionManager);
        await replicationEngine.setupMaster(masterPage);

        // 5. Setup Sequence Engine
        const sequenceEngine = new SequenceEngine(settings, slavePages);
        sequenceEngine.startTerminalListener();

        logger.info('System fully initialized and ready.');

    } catch (err) {
        logger.error('Fatal error during initialization:', err.message);
        process.exit(1);
    }
}

main();
