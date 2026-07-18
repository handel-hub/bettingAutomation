export class StructuralAnalyzer extends PipelineStep {
    constructor() {
        super('StructuralAnalyzer');
    }

    execute(context) {
        if (!context.candidates) return;

        for (const candidate of context.candidates) {
            let depth = 0;
            let nthCount = 0;
            let absoluteSegments = 0;
            let dynamicSegments = 0;
            let parentVolatility = 0; // heuristic based on nth-of-type depth
            
            const loc = candidate.locator;
            
            if (candidate.strategy === 'StructuralStrategy') {
                const parts = loc.split('>');
                depth = parts.length;
                
                parts.forEach((p, idx) => {
                    const segment = p.trim();
                    if (segment.includes(':nth-of-type') || segment.includes(':nth-child')) {
                        nthCount++;
                        if (idx < parts.length - 1) {
                            // High volatility if parent relies on indices
                            parentVolatility++;
                        }
                    }
                    if (segment.match(/^[a-z]+$/i)) {
                        absoluteSegments++; // tag only
                    }
                });
            } else if (candidate.strategy === 'SemanticClassStrategy') {
                const classes = loc.split('.');
                depth = 1;
                if (classes.some(c => /\d/.test(c))) {
                    dynamicSegments++; // classes with numbers might be dynamic
                }
            }

            let score = 'HIGH';
            if (depth > 5 || nthCount > 2 || parentVolatility > 0) {
                score = 'LOW';
            } else if (depth > 2 || nthCount > 0 || dynamicSegments > 0) {
                score = 'MEDIUM';
            }

            candidate.structural = {
                depth,
                nthCount,
                absoluteSegments,
                dynamicSegments,
                parentVolatility,
                score
            };
        }
    }
}
