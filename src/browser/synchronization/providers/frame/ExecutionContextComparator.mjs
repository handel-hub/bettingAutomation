export class ExecutionContextComparator {
    constructor(policy) {
        this.policy = policy;
    }

    compare(masterMetadata, slaveState) {
        if (!masterMetadata || !masterMetadata.executionContext) {
            return { match: true, reason: 'No execution context required' };
        }

        const masterCtx = masterMetadata.executionContext;
        const slaveCtx = slaveState.executionContext;

        if (slaveCtx.lifecycle !== 'READY') {
            return { match: false, reason: 'Slave execution context not ready', code: 'WAITING' };
        }

        // Compare Frame Path
        if (masterCtx.framePath && masterCtx.framePath.length > 0) {
            const masterFrameStr = JSON.stringify(masterCtx.framePath);
            if (!slaveCtx.frameHierarchy.includes(masterFrameStr)) {
                if (this.policy.allowDetachedFrames) {
                    return { match: false, reason: 'Frame detached', code: 'SY-141' };
                }
                return { match: false, reason: 'Frame mismatch', code: 'SY-140' };
            }
            
            // Check if frame path has divergence or cross-origin mismatch
            const targetFrameNode = masterCtx.framePath[0];
            if (targetFrameNode && targetFrameNode.url) {
                const isCross = targetFrameNode.url !== 'about:blank' && !targetFrameNode.url.startsWith('http');
                if (isCross) {
                    return { match: false, reason: 'Cross-origin frame', code: 'SY-145' };
                }
            }
        }

        // Compare Shadow Path
        if (masterCtx.shadowPath && masterCtx.shadowPath.length > 0) {
            // Simplified check: Ensure the Slave recorded shadow root attachment for the locators
            for (const shadowNode of masterCtx.shadowPath) {
                const found = slaveCtx.shadowHierarchy.find(sh => 
                    sh.locator && sh.locator.tag === shadowNode.hostLocator.tag
                );
                if (!found) {
                    return { match: false, reason: 'Shadow mismatch', code: 'SY-143' };
                }
            }
        }

        return { match: true, reason: 'MATCH', code: 'MATCH' };
    }
}
