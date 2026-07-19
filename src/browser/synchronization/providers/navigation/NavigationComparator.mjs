export const NavigationComparisonResult = {
    MATCH: 'MATCH',
    NORMALIZED_MATCH: 'NORMALIZED_MATCH',
    REDIRECTING: 'REDIRECTING',
    TEMPORARY_DIVERGENCE: 'TEMPORARY_DIVERGENCE',
    MISMATCH: 'MISMATCH'
};

export class NavigationComparator {
    /**
     * Compares the target URL with the actual runtime context.
     * @param {string} targetUrl The intended destination URL.
     * @param {Object} navigationContext The runtime context from BrowserStateModel.
     * @returns {string} NavigationComparisonResult
     */
    static compare(targetUrl, navigationContext) {
        const currentUrl = navigationContext.currentURL || '';
        
        if (targetUrl === currentUrl) {
            return NavigationComparisonResult.MATCH;
        }

        const normalizedTarget = this.normalize(targetUrl);
        const normalizedCurrent = this.normalize(currentUrl);

        if (normalizedTarget === normalizedCurrent) {
            return NavigationComparisonResult.NORMALIZED_MATCH;
        }

        if (navigationContext.lifecycle === 'REDIRECTING') {
            return NavigationComparisonResult.REDIRECTING;
        }

        if (navigationContext.lifecycle === 'NAVIGATING') {
            return NavigationComparisonResult.TEMPORARY_DIVERGENCE;
        }

        return NavigationComparisonResult.MISMATCH;
    }

    /**
     * Strips fragments, tracking parameters, and locale prefixes for normalized matches.
     */
    static normalize(urlString) {
        if (!urlString) return '';
        try {
            const parsed = new URL(urlString);
            // Remove common tracking parameters
            const paramsToStrip = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
            for (const param of paramsToStrip) {
                parsed.searchParams.delete(param);
            }
            // Remove hash fragment
            parsed.hash = '';
            
            // Normalize trailing slashes
            let pathname = parsed.pathname;
            if (pathname.endsWith('/') && pathname.length > 1) {
                pathname = pathname.slice(0, -1);
            }
            parsed.pathname = pathname;
            
            return parsed.toString();
        } catch (e) {
            // Fallback to simple string manipulation if invalid URL
            return urlString.split('#')[0].replace(/\/$/, '');
        }
    }
}
