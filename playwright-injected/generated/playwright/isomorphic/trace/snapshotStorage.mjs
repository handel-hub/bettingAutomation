import { rewriteURLForCustomProtocol, SnapshotRenderer } from "./snapshotRenderer.mjs";
import { LRUCache } from "../lruCache.mjs";
class SnapshotStorage {
  _frameSnapshots = /* @__PURE__ */ new Map();
  _cache = new LRUCache(1e8);
  // 100MB per each trace
  _resources = [];
  _resourceUrlsWithOverrides = /* @__PURE__ */ new Set();
  addResource(resource) {
    resource.request.url = rewriteURLForCustomProtocol(resource.request.url);
    this._resources.push(resource);
  }
  addFrameSnapshot(snapshot, screencastFrames) {
    for (const override of snapshot.resourceOverrides)
      override.url = rewriteURLForCustomProtocol(override.url);
    let frameSnapshots = this._frameSnapshots.get(snapshot.frameId);
    if (!frameSnapshots) {
      frameSnapshots = {
        raw: [],
        renderers: []
      };
      this._frameSnapshots.set(snapshot.frameId, frameSnapshots);
      if (snapshot.isMainFrame)
        this._frameSnapshots.set(snapshot.pageId, frameSnapshots);
    }
    frameSnapshots.raw.push(snapshot);
    const renderer = new SnapshotRenderer(this._cache, this._resources, frameSnapshots.raw, screencastFrames, frameSnapshots.raw.length - 1);
    frameSnapshots.renderers.push(renderer);
    return renderer;
  }
  snapshotByName(pageOrFrameId, snapshotName) {
    const snapshot = this._frameSnapshots.get(pageOrFrameId);
    return snapshot?.renderers.find((r) => r.snapshotName === snapshotName);
  }
  snapshotsForTest() {
    return [...this._frameSnapshots.keys()];
  }
  finalize() {
    this._resources.sort((a, b) => (a._monotonicTime || 0) - (b._monotonicTime || 0));
    for (const frameSnapshots of this._frameSnapshots.values()) {
      for (const snapshot of frameSnapshots.raw) {
        for (const override of snapshot.resourceOverrides)
          this._resourceUrlsWithOverrides.add(override.url);
      }
    }
  }
  hasResourceOverride(url) {
    return this._resourceUrlsWithOverrides.has(url);
  }
}
export {
  SnapshotStorage
};

//# sourceMappingURL=snapshotStorage.mjs.map
