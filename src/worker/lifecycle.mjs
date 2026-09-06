export class ExecutionLifecycleManager {
    constructor(logger, controller) {
        this.logger = logger;
        this.controller = controller;
        this.isShuttingDown = false;
    }

    _killZombies() {
        if (!this.controller || !this.controller.registry) return;
        const states = this.controller.registry.getAll();
        for (const state of states) {
            if (state.browser && typeof state.browser.process === 'function') {
                const pid = state.browser.process()?.pid;
                if (pid) {
                    try {
                        process.kill(pid, 'SIGKILL');
                        this.logger.info(`Killed zombie browser process: ${pid}`);
                    } catch (e) {}
                }
            }
        }
    }

    async shutdown(reason) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        this.logger.info(`Starting execution teardown due to: ${reason}`);

        const forceExit = setTimeout(() => {
            this.logger.error('Teardown took too long, forcing exit.');
            this._killZombies();
            process.exit(1);
        }, 5000);

        try {
            if (this.controller) {
                await this.controller.stop();
            }
        } catch (err) {
            this.logger.error(`Error during controller stop: ${err.message}`);
        } finally {
            clearTimeout(forceExit);
            this._killZombies();
            process.exit(0);
        }
    }
}
