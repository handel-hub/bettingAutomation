import { describe, it, expect, beforeEach } from 'vitest';
import {
    SanraMemoryPool,
    SanraKineticVectorSerializer,
    TopologicalSpatialAddresser,
    SanraTelemetryCollector
} from '../../src/browser/synchronization/index.mjs';

class MockEl {
    constructor({
        tagName = 'DIV',
        id = '',
        className = '',
        role = null,
        scrollHeight = 1000,
        clientHeight = 500,
        rect = { width: 800, height: 500, top: 0, left: 0 },
        parent = null,
        overflowY = 'auto'
    } = {}) {
        this.tagName = tagName.toUpperCase();
        this.nodeName = this.tagName;
        this.nodeType = 1;
        this.id = id;
        this.className = className;
        this.role = role;
        this.scrollHeight = scrollHeight;
        this.clientHeight = clientHeight;
        this._rect = rect;
        this.parentElement = parent;
        this.parentNode = parent;
        this.style = { overflowY };
    }
    getBoundingClientRect() { return this._rect; }
    getAttribute(attr) { return attr === 'role' ? this.role : null; }
}

describe('Stage 3 / Phase 5 — Topological Addressing & Wire Protocol Integration', () => {
    let pool;
    let telemetry;
    let masterAddresser;
    let slaveAddresser;

    beforeEach(() => {
        telemetry = new SanraTelemetryCollector({ browserId: 'distributed-sync' });
        pool = new SanraMemoryPool({ vectorSlots: 8, keyframeSlots: 2, telemetrySink: telemetry });
        masterAddresser = new TopologicalSpatialAddresser({ browserId: 'master', telemetry });
        slaveAddresser = new TopologicalSpatialAddresser({ browserId: 'slave', telemetry });
    });

    it('serializes Master topological signature into Stage 1 SharedArrayBuffer and resolves Slave DOM scroll container zero-allocation', () => {
        // 1. Master generates topological signature for active scroll container
        const masterRoot = new MockEl({ tagName: 'BODY', scrollHeight: 2000, clientHeight: 1080 });
        const masterContainer = new MockEl({
            id: 'scroll-feed',
            className: 'feed-list primary',
            role: 'feed',
            scrollHeight: 5000,
            clientHeight: 800,
            rect: { width: 960, height: 800 },
            parent: masterRoot,
            overflowY: 'scroll'
        });

        const sigMaster = masterAddresser.generateSignature(masterContainer, 400, 300);
        expect(sigMaster.nodeHash).toBeGreaterThan(0);
        expect(sigMaster.roleId).toBe(TopologicalSpatialAddresser.encodeRole('feed'));

        // 2. Serialize signature fields into SanraKineticVector inside SharedArrayBuffer ring buffer
        const writeOffset = pool.acquireVectorWriteOffset();
        SanraKineticVectorSerializer.serialize({
            sequenceId: 101,
            nodeHash: sigMaster.nodeHash,
            treeDepth: sigMaster.depth,
            ariaRole: sigMaster.roleId,
            rectRatioX: sigMaster.rx,
            rectRatioY: sigMaster.ry,
            rhoX: 0.0,
            rhoY: 0.25,
            velocityY: 0.05,
            accelerationY: 0.0
        }, pool.buffer, writeOffset);

        // 3. Slave reads kinetic vector from ring buffer without temporary allocations
        const readOffset = pool.acquireVectorReadOffset();
        const decodedVector = SanraKineticVectorSerializer.deserialize(pool.buffer, readOffset, {});

        expect(decodedVector.nodeHash).toBe(sigMaster.nodeHash);
        expect(decodedVector.treeDepth).toBe(sigMaster.depth);
        expect(decodedVector.ariaRole).toBe(sigMaster.roleId);
        expect(decodedVector.rectRatioX).toBeCloseTo(sigMaster.rx, 4);
        expect(decodedVector.rectRatioY).toBeCloseTo(sigMaster.ry, 4);

        // 4. Reconstruct signature tuple on Slave for target resolution
        const slaveSig = {
            nodeHash: decodedVector.nodeHash,
            depth: decodedVector.treeDepth,
            roleId: decodedVector.ariaRole,
            role: TopologicalSpatialAddresser.decodeRole(decodedVector.ariaRole),
            rx: decodedVector.rectRatioX,
            ry: decodedVector.rectRatioY
        };

        // Supposing on Slave, class name was dynamically modified ('feed-list secondary'), so exact FNV-1a hash won't match,
        // triggering Tri-Layer Step 2 Structural Similarity Fallback!
        const slaveContainer = new MockEl({
            id: 'scroll-feed',
            className: 'feed-list secondary',
            role: 'feed',
            scrollHeight: 4800,
            clientHeight: 800,
            rect: { width: 960, height: 800 },
            parent: new MockEl({ tagName: 'BODY' }),
            overflowY: 'scroll'
        });

        slaveAddresser.win = {
            innerWidth: 1920,
            innerHeight: 1080,
            document: {
                elementFromPoint: () => null,
                scrollingElement: new MockEl({ tagName: 'HTML' })
            },
            getComputedStyle: (el) => ({ overflowY: el.style.overflowY })
        };

        const resolvedSlaveEl = slaveAddresser.resolveTarget(slaveSig, 400 / 1920, 300 / 1080, [slaveContainer]);

        expect(resolvedSlaveEl).toBe(slaveContainer);
        expect(slaveAddresser.resolutionSuccessCount).toBe(1);

        // Verify telemetry recorded successful structural similarity resolution
        const simEvents = telemetry.getEvents().filter(e => e.eventName === 'TargetResolvedSimilarityFallback');
        expect(simEvents).toHaveLength(1);
        expect(simEvents[0].payload.nodeHash).toBe(TopologicalSpatialAddresser.computeNodeHash(slaveContainer));
        expect(simEvents[0].payload.similarityScore).toBeGreaterThanOrEqual(0.85);
    });
});
