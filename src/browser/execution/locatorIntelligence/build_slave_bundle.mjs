import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
    const pipelineFiles = [
        'models/ValidationResult.mjs',
        'models/RankingResult.mjs',
        'models/LocatorCandidate.mjs',
        'models/ScoringVector.mjs',
        'models/ElementIdentityDocument.mjs',
        'engine/PipelineStep.mjs',
        'engine/PipelineContext.mjs',
        'extraction/FeatureExtractor.mjs',
        'generation/strategies/DataAttributeStrategy.mjs',
        'generation/strategies/TextStrategy.mjs',
        'generation/strategies/AriaStrategy.mjs',
        'generation/strategies/RoleStrategy.mjs',
        'generation/strategies/SemanticClassStrategy.mjs',
        'generation/strategies/StructuralStrategy.mjs',
        'generation/CandidateGenerator.mjs',
        'generation/CandidateDeduplicator.mjs',
        'validation/StructuralAnalyzer.mjs',
        'ranking/RankingRule.mjs',
        'ranking/RankingRules/NormalizedBaseScoreRule.mjs',
        'ranking/RankingRules/NormalizedStructuralRule.mjs',
        'ranking/RankingRules/NormalizedDynamicContentRule.mjs',
        'ranking/RankingRules/NormalizedSpecificityRule.mjs',
        'ranking/RankingRules/NormalizedCorroborationRule.mjs',
        'ranking/RankingRules/NormalizedVisibilityRule.mjs',
        'ranking/ScoringWeights.mjs',
        'ranking/AdditiveRankingEngine.mjs'
    ];

    let code = '(() => {\n';
    
    for (const file of pipelineFiles) {
        const filePath = path.join(__dirname, file);
        let content = await fsPromises.readFile(filePath, 'utf8');
        content = content.replace(/^\uFEFF/, '')
                         .replace(/^\s*export\s+default\s+.*$/gm, '')
                         .replace(/^\s*export\s+/gm, '')
                         .replace(/^\s*import\s+.*$/gm, '');
        code += content + '\n\n';
    }

    code += `
    window.__liGenerateFromSID = function(sid) {
        if (!sid || !sid.identityHash || !sid.tagName) return [];
        
        const ctx = new PipelineContext(null, [], {});
        ctx.features = sid;
        ctx.identityDocument = sid;
        
        const generator = new CandidateGenerator();
        generator.executeFromSID(ctx, sid);
        
        const dedup = new CandidateDeduplicator();
        dedup.execute(ctx);
        
        const analyzer = new StructuralAnalyzer();
        analyzer.execute(ctx);
        
        const ranker = new AdditiveRankingEngine();
        ranker.execute(ctx);
        
        return (ctx.candidates || []).map(c => ({
            id: c.id,
            strategy: c.strategy,
            locator: c.locator,
            rank: c.rank,
            reason: c.reason,
            ranking: { finalScore: c.ranking ? c.ranking.finalScore : 0 }
        }));
    };
})();
`;

    await fsPromises.writeFile(path.join(__dirname, '_slave_generation_bundle.mjs'), code, 'utf8');
    console.log('Built _slave_generation_bundle.mjs');
}

build().catch(console.error);
