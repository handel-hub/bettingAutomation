import { globalRecorder } from '../RuntimeKnowledgePlatform.mjs';

/**
 * Attaches to the BrowserStateRegistry to stream state changes to the RKP Layer out-of-band.
 */
export function attachBrowserLifecycleAdapter(registry) {
    if (!registry || process.env.RKP_ENABLED === 'false') return;

    const versions = new Map();

    registry.on('StateUpdated', ({ browserId, state }) => {
        let parentVersion = versions.get(browserId) || 0;
        let version = parentVersion + 1;
        versions.set(browserId, version);

        try {
            globalRecorder.record({
                domain: 'Browser',
                type: 'State',
                traceId: `browser-${browserId}`,
                spanId: `state-${browserId}-${version}`,
                version,
                parentVersion,
                delta: {
                    lifecycleState: state.lifecycleState,
                    state: state.state,
                    health: state.health,
                    url: state.url,
                    currentGes: state.currentGes
                }
            });
        } catch (err) {
            // Passive failure
        }
    });

    registry.on('WORKER_FAILOVER', ({ browserId, standbyId, targetUrl }) => {
        let parentVersion = versions.get(browserId) || 0;
        let version = parentVersion + 1;
        versions.set(browserId, version);

        try {
            globalRecorder.record({
                domain: 'Browser',
                type: 'Failure',
                traceId: `browser-${browserId}`,
                spanId: `failover-${browserId}-${version}`,
                recoveryStrategy: 'ATOMIC_FAILOVER',
                errorMessage: `Worker crashed or hung, failed over to standby ${standbyId}`,
                errorCode: 'WORKER_FAILOVER'
            });
            
            globalRecorder.record({
                domain: 'Browser',
                type: 'State',
                traceId: `browser-${browserId}`,
                spanId: `state-failover-${browserId}-${version}`,
                version,
                parentVersion,
                delta: {
                    lifecycleState: 'READY',
                    standbyId,
                    targetUrl
                }
            });
        } catch(err) {
            // Passive failure
        }
    });
}
