/**
 * Traverses Playwright's Frame object to produce a deterministic frame path.
 */
export class FramePathBuilder {
    /**
     * @param {Object} frame Playwright Frame object
     * @returns {Array<Object>} Deterministic frame path from main frame to target frame
     */
    static build(frame) {
        if (!frame) return [];

        const path = [];
        let current = frame;
        
        while (current) {
            const parent = current.parentFrame();
            
            if (!parent) {
                path.unshift({ isMainFrame: true, url: current.url() });
                break;
            }
            
            path.unshift({
                isMainFrame: false,
                name: current.name(),
                url: current.url()
            });
            
            current = parent;
        }
        
        return path;
    }
}
