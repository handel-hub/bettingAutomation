import { ProcessLocalWal } from './src/rkp/storage/wal/ProcessLocalWal.mjs';
import { Serializer } from './src/rkp/storage/wal/Serializer.mjs';
import { HistoricalWalSource } from './src/rkp/analysis/ingestion/HistoricalWalSource.mjs';
import { TimelineBuilder } from './src/rkp/analysis/timeline/TimelineBuilder.mjs';
import { CorrelationEngine } from './src/rkp/analysis/correlation/CorrelationEngine.mjs';
import { KnowledgeGraph } from './src/rkp/analysis/correlation/KnowledgeGraph.mjs';
import { IndexBuilder } from './src/rkp/analysis/indexing/IndexBuilder.mjs';
import { RuntimeQueryEngine } from './src/rkp/analysis/query/RuntimeQueryEngine.mjs';
import { DiagnosticsAPI } from './src/rkp/analysis/DiagnosticsAPI.mjs';
import fs from 'node:fs';
import path from 'node:path';

async function run() {
    const walDir = path.join(process.cwd(), 'test-wal-data');
    if (!fs.existsSync(walDir)) {
        fs.mkdirSync(walDir);
    }
    
    console.log('--- Phase 4: Analysis Pipeline Performance Test ---');
    
    // 1. Generate Mock WAL Data
    console.time('WAL Generation');
    const wal = new ProcessLocalWal(walDir, 'analysis-test', { maxSize: 50 * 1024 * 1024 });
    await wal.init();
    
    const NUM_FACTS = 100000;
    
    for (let i = 0; i < NUM_FACTS; i++) {
        const traceId = `trace-${Math.floor(i / 100)}`;
        const type = i % 10 === 0 ? 'Failure' : (i % 2 === 0 ? 'Measurement' : 'Decision');
        const fact = {
            domain: 'Execution',
            type,
            traceId,
            spanId: `span-${i}`,
            lsn: i + 1,
            physicalTime: Date.now() + i
        };
        
        if (type === 'Failure') {
            fact.errorCode = 'E_TEST';
            fact.errorMessage = 'Simulated error for tests';
            fact.recoveryStrategy = 'RETRY';
        } else if (type === 'Decision') {
            fact.actionTaken = 'DoThing';
            fact.alternativesDiscarded = [];
            fact.evidence = { constraintsEvaluated: [], metrics: {} };
        } else if (type === 'Measurement') {
            fact.metricName = 'Latency';
            fact.value = 42;
            fact.unit = 'ms';
        }

        wal.append(Serializer.serializeFrame(fact));
    }
    
    await wal.flush();
    await wal.close();
    console.timeEnd('WAL Generation');
    
    const walFiles = fs.readdirSync(walDir).filter(f => f.endsWith('.rkpwal')).map(f => path.join(walDir, f));
    
    // 2. Fact Source & Normalization & Timeline Building
    console.time('Timeline Building');
    const source = new HistoricalWalSource(walFiles);
    const timeline = await TimelineBuilder.build(source);
    console.timeEnd('Timeline Building');
    console.log(`Parsed ${timeline.length} facts.`);
    
    // 3. Correlation Engine
    console.time('Correlation');
    const causalLinks = CorrelationEngine.correlate(timeline);
    console.timeEnd('Correlation');
    console.log(`Generated ${causalLinks.length} causal links.`);
    
    // 4. Knowledge Graph Projection
    console.time('Knowledge Graph Projection');
    const graph = KnowledgeGraph.project(timeline, causalLinks);
    console.timeEnd('Knowledge Graph Projection');
    
    // 5. Index Building
    console.time('Index Building');
    const indexes = IndexBuilder.buildIndexes(graph);
    console.timeEnd('Index Building');
    
    // 6. Query Engine & Diagnostics
    console.time('Diagnostics API Execution');
    const queryEngine = new RuntimeQueryEngine(graph, indexes);
    const diagnostics = new DiagnosticsAPI(queryEngine);
    
    const report = diagnostics.diagnoseSystem();
    console.timeEnd('Diagnostics API Execution');
    
    console.log('\n--- Diagnostic Report ---');
    console.log(`Browser Health: ${report.health.browserHealth}`);
    console.log(`Locator Health: ${report.health.locatorHealth}`);
    console.log(`Sync Health: ${report.health.synchronizationHealth}`);
    console.log(`Average Latency: ${report.statistics.averageLatencyMs.toFixed(2)}ms`);
    console.log(`Failure Frequency: ${report.statistics.failureFrequency}`);
    console.log(`Invariants Violated: ${report.invariantsViolated.length}`);
    console.log(`Explanations Generated: ${report.explanations.length}`);
    
    // Clean up
    fs.rmSync(walDir, { recursive: true, force: true });
}

run().catch(console.error);
