import { parseClientSideCallMetadata } from "./traceUtils.mjs";
import { SnapshotStorage } from "./snapshotStorage.mjs";
import { TraceModernizer } from "./traceModernizer.mjs";
class TraceLoader {
  contextEntries = [];
  _snapshotStorage;
  _backend;
  _resourceToContentType = /* @__PURE__ */ new Map();
  constructor() {
  }
  async load(backend, traceFile, unzipProgress) {
    this._backend = backend;
    const prefix = traceFile?.match(/(.+)\.trace$/)?.[1];
    const prefixes = [];
    let hasSource = false;
    for (const entryName of await this._backend.entryNames()) {
      const match = entryName.match(/(.+)\.trace$/);
      if (match && (!prefix || prefix === match[1]))
        prefixes.push(match[1] || "");
      if (entryName.startsWith("src/") || entryName.includes("src@"))
        hasSource = true;
    }
    if (!prefixes.length)
      throw new Error("Cannot find .trace file");
    this._snapshotStorage = new SnapshotStorage();
    const total = prefixes.length * 3;
    let done = 0;
    for (const prefix2 of prefixes) {
      const contextEntry = createEmptyContext();
      contextEntry.hasSource = hasSource;
      const modernizer = new TraceModernizer(contextEntry, this._snapshotStorage);
      const trace = await this._backend.readText(prefix2 + ".trace") || "";
      modernizer.appendTrace(trace);
      unzipProgress?.(++done, total);
      const network = await this._backend.readText(prefix2 + ".network") || "";
      modernizer.appendTrace(network);
      unzipProgress?.(++done, total);
      contextEntry.actions = modernizer.actions().sort((a1, a2) => a1.startTime - a2.startTime);
      if (!backend.isLive()) {
        for (const action of contextEntry.actions.slice().reverse()) {
          if (!action.endTime && !action.error) {
            for (const a of contextEntry.actions) {
              if (a.parentId === action.callId && action.endTime < a.endTime)
                action.endTime = a.endTime;
            }
          }
        }
      }
      const stacks = await this._backend.readText(prefix2 + ".stacks");
      if (stacks) {
        const callMetadata = parseClientSideCallMetadata(JSON.parse(stacks));
        for (const action of contextEntry.actions)
          action.stack = action.stack || callMetadata.get(action.callId);
      }
      unzipProgress?.(++done, total);
      for (const resource of contextEntry.resources) {
        if (resource.request.postData?._file)
          this._resourceToContentType.set(resource.request.postData._file, stripEncodingFromContentType(resource.request.postData.mimeType));
        if (resource.response.content?._file)
          this._resourceToContentType.set(resource.response.content._file, stripEncodingFromContentType(resource.response.content.mimeType));
      }
      this.contextEntries.push(contextEntry);
    }
    this._snapshotStorage.finalize();
  }
  async hasEntry(filename) {
    return this._backend.hasEntry(filename);
  }
  async resourceEntry(file) {
    const blob = await this._backend.readBlob(file);
    const contentType = this._resourceToContentType.get(file);
    if (!blob || contentType === void 0 || contentType === "x-unknown")
      return blob;
    return new Blob([blob], { type: contentType });
  }
  storage() {
    return this._snapshotStorage;
  }
}
function stripEncodingFromContentType(contentType) {
  const charset = contentType.match(/^(.*);\s*charset=.*$/);
  if (charset)
    return charset[1];
  return contentType;
}
function createEmptyContext() {
  return {
    origin: "testRunner",
    startTime: Number.MAX_SAFE_INTEGER,
    wallTime: Number.MAX_SAFE_INTEGER,
    monotonicTime: 0,
    endTime: 0,
    browserName: "",
    options: {
      deviceScaleFactor: 1,
      isMobile: false,
      viewport: { width: 1280, height: 800 }
    },
    pages: [],
    resources: [],
    actions: [],
    screenshots: [],
    ariaSnapshots: [],
    events: [],
    errors: [],
    stdio: [],
    hasSource: false
  };
}
export {
  TraceLoader
};

//# sourceMappingURL=traceLoader.mjs.map
