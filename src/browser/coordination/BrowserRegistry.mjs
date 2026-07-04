export class BrowserRegistry {
    constructor() {
        this.browsers = new Map();
    }

    register(id, role, context, page) {
        this.browsers.set(id, {
            id,
            role,      // 'master' | 'slave'
            state: 'Initializing', // Initializing, Authenticated, Ready, Busy, Error
            url: 'about:blank',
            health: 'Good', // Good, Bad
            context,
            page
        });
    }

    get(id) {
        return this.browsers.get(id);
    }

    getAll() {
        return Array.from(this.browsers.values());
    }

    getReadySlaves() {
        return this.getAll().filter(b => b.role === 'slave' && b.state === 'Ready');
    }

    getMaster() {
        return this.getAll().find(b => b.role === 'master');
    }

    updateState(id, state) {
        if (this.browsers.has(id)) {
            this.browsers.get(id).state = state;
        }
    }

    updateHealth(id, health) {
        if (this.browsers.has(id)) {
            this.browsers.get(id).health = health;
        }
    }

    updateUrl(id, url) {
        if (this.browsers.has(id)) {
            this.browsers.get(id).url = url;
        }
    }

    remove(id) {
        this.browsers.delete(id);
    }
}
