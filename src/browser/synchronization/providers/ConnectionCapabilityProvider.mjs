import { CapabilityProvider } from './CapabilityProvider.mjs';
import { CapabilityResult } from '../models/CapabilityResult.mjs';
import { Capabilities } from '../capabilities.mjs';

/**
 * Provides the CONNECTED capability by verifying the Playwright page is alive.
 */
export class ConnectionCapabilityProvider extends CapabilityProvider {
    supportedCapabilities() {
        return [Capabilities.CONNECTED];
    }

    async currentStatus(syncContext) {
        const { page } = syncContext;
        
        if (page && !page.isClosed()) {
            return new CapabilityResult({
                status: 'SATISFIED',
                capability: Capabilities.CONNECTED,
                reason: 'Page is open and connected'
            });
        }

        return new CapabilityResult({
            status: 'FAILED',
            capability: Capabilities.CONNECTED,
            reason: 'Page is closed or missing'
        });
    }

    async waitFor(syncContext) {
        // Connection is typically instant. If it's not connected, it's failed.
        return this.currentStatus(syncContext);
    }

    async invalidate(syncContext) {
        // No-op
    }
}
