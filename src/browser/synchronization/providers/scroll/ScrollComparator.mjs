import { ScrollLifecycle } from '../../models/BrowserStateModel.mjs';

export const ScrollComparisonResult = {
    MATCH: 'MATCH',
    TOLERANCE_MATCH: 'TOLERANCE_MATCH',
    WINDOW_POSITION_MISMATCH: 'WINDOW_POSITION_MISMATCH',
    CONTAINER_POSITION_MISMATCH: 'CONTAINER_POSITION_MISMATCH',
    CONTAINER_ID_MISMATCH: 'CONTAINER_ID_MISMATCH',
    WAITING: 'WAITING',
    MOMENTUM_ACTIVE: 'MOMENTUM_ACTIVE',
    VIRTUALIZATION_PENDING: 'VIRTUALIZATION_PENDING'
};

export class ScrollComparator {
    constructor(policy) {
        this.policy = policy;
    }

    compare(expectedScroll, runtimeScrollContext) {
        if (!runtimeScrollContext) {
            return { result: ScrollComparisonResult.WAITING, confidence: 0 };
        }

        const { lifecycle, velocity } = runtimeScrollContext;

        if (lifecycle === ScrollLifecycle.UNKNOWN || lifecycle === ScrollLifecycle.IDLE) {
            // Technically IDLE means it hasn't scrolled. That's fine, we still compare coordinates.
        } else if (lifecycle === ScrollLifecycle.SCROLLING) {
            if (velocity > this.policy.velocityThreshold) {
                return { result: ScrollComparisonResult.MOMENTUM_ACTIVE, confidence: 0 };
            }
            return { result: ScrollComparisonResult.WAITING, confidence: 0 };
        } else if (lifecycle === ScrollLifecycle.SETTLING) {
            return { result: ScrollComparisonResult.WAITING, confidence: 0.5 };
        } else if (lifecycle === ScrollLifecycle.WAITING_FOR_CONTENT) {
            return { result: ScrollComparisonResult.VIRTUALIZATION_PENDING, confidence: 0.8 };
        }

        // Compare Window Scroll
        const dxPage = Math.abs((expectedScroll.pageX || 0) - (runtimeScrollContext.pageScrollX || 0));
        const dyPage = Math.abs((expectedScroll.pageY || 0) - (runtimeScrollContext.pageScrollY || 0));

        let isToleranceMatch = false;

        if (dxPage > this.policy.positionTolerancePx || dyPage > this.policy.positionTolerancePx) {
            return { result: ScrollComparisonResult.WINDOW_POSITION_MISMATCH, confidence: 1 };
        } else if (dxPage > 0 || dyPage > 0) {
            isToleranceMatch = true;
        }

        // Compare Container Scroll
        if (expectedScroll.containerId !== runtimeScrollContext.activeContainerId) {
            return { result: ScrollComparisonResult.CONTAINER_ID_MISMATCH, confidence: 1 };
        }

        if (expectedScroll.containerId) {
            const dxContainer = Math.abs((expectedScroll.containerX || 0) - (runtimeScrollContext.containerScrollX || 0));
            const dyContainer = Math.abs((expectedScroll.containerY || 0) - (runtimeScrollContext.containerScrollY || 0));

            if (dxContainer > this.policy.positionTolerancePx || dyContainer > this.policy.positionTolerancePx) {
                return { result: ScrollComparisonResult.CONTAINER_POSITION_MISMATCH, confidence: 1 };
            } else if (dxContainer > 0 || dyContainer > 0) {
                isToleranceMatch = true;
            }
        }

        return { 
            result: isToleranceMatch ? ScrollComparisonResult.TOLERANCE_MATCH : ScrollComparisonResult.MATCH, 
            confidence: 1 
        };
    }
}
