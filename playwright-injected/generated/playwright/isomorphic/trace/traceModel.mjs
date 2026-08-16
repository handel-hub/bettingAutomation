import { getActionGroup, renderTitleForCall } from "../protocolFormatter.mjs";
const prevByEndTimeSymbol = /* @__PURE__ */ Symbol("prevByEndTime");
const nextByStartTimeSymbol = /* @__PURE__ */ Symbol("nextByStartTime");
class TraceModel {
  startTime;
  endTime;
  browserName;
  channel;
  platform;
  playwrightVersion;
  wallTime;
  title;
  options;
  pages;
  actions;
  attachments;
  visibleAttachments;
  events;
  stdio;
  errors;
  errorDescriptors;
  hasSource;
  hasStepData;
  sdkLanguage;
  testIdAttributeName;
  sources;
  resources;
  actionCounters;
  traceUri;
  testTimeout;
  annotations;
  pagerefToTitle = /* @__PURE__ */ new Map();
  _eventsForAction = /* @__PURE__ */ new Map();
  _screenshots = /* @__PURE__ */ new Map();
  _ariaSnapshots = /* @__PURE__ */ new Map();
  constructor(traceUri, contexts) {
    const libraryContext = contexts.find((context) => context.origin === "library");
    this.traceUri = traceUri;
    this.browserName = libraryContext?.browserName || "";
    this.sdkLanguage = libraryContext?.sdkLanguage;
    this.channel = libraryContext?.channel;
    this.testIdAttributeName = libraryContext?.testIdAttributeName;
    this.platform = libraryContext?.platform || "";
    this.playwrightVersion = contexts.find((c) => c.playwrightVersion)?.playwrightVersion;
    this.title = libraryContext?.title || "";
    this.options = libraryContext?.options || {};
    this.testTimeout = contexts.find((c) => c.origin === "testRunner")?.testTimeout;
    this.annotations = contexts.find((c) => c.origin === "testRunner")?.annotations;
    this.actions = mergeActionsAndUpdateTiming(contexts);
    this.pages = [].concat(...contexts.map((c) => c.pages));
    this.wallTime = contexts.map((c) => c.wallTime).reduce((prev, cur) => Math.min(prev || Number.MAX_VALUE, cur), Number.MAX_VALUE);
    this.startTime = contexts.map((c) => c.startTime).reduce((prev, cur) => Math.min(prev, cur), Number.MAX_VALUE);
    this.endTime = contexts.map((c) => c.endTime).reduce((prev, cur) => Math.max(prev, cur), Number.MIN_VALUE);
    this.events = [].concat(...contexts.map((c) => c.events));
    this.stdio = [].concat(...contexts.map((c) => c.stdio));
    this.errors = [].concat(...contexts.map((c) => c.errors));
    this.hasSource = contexts.some((c) => c.hasSource);
    this.hasStepData = contexts.some((context) => context.origin === "testRunner");
    this.resources = [];
    let lastApiContextId = 0;
    let lastBrowserContextId = 0;
    for (const context of contexts) {
      const contextTitle = context.resources.some((resource) => resource._apiRequest) ? "api#" + ++lastApiContextId : "browser#" + ++lastBrowserContextId;
      for (const entry of context.resources)
        this.resources.push({ ...entry, id: `${entry.pageref ?? lastApiContextId}-${entry.startedDateTime}-${entry.request.url}`, contextTitle });
    }
    for (const context of contexts) {
      for (const event of context.screenshots || [])
        this._screenshots.set(`${event.callId}/${event.phase}`, event);
      for (const event of context.ariaSnapshots || [])
        this._ariaSnapshots.set(`${event.callId}/${event.phase}`, event);
    }
    this.attachments = this.actions.flatMap((action) => action.attachments?.map((attachment) => ({ ...attachment, callId: action.callId, traceUri })) ?? []);
    this.visibleAttachments = this.attachments.filter((attachment) => !attachment.name.startsWith("_"));
    this.pages.forEach((page, index) => this.pagerefToTitle.set(page.pageId, "page#" + (index + 1)));
    this.events.sort((a1, a2) => a1.time - a2.time);
    this.resources.sort((a1, a2) => a1._monotonicTime - a2._monotonicTime);
    this.errorDescriptors = this.hasStepData ? this._errorDescriptorsFromTestRunner() : this._errorDescriptorsFromActions();
    this.sources = collectSources(this.actions, this.errorDescriptors);
    this.actionCounters = /* @__PURE__ */ new Map();
    for (const action of this.actions) {
      action.group = action.group ?? getActionGroup({ type: action.class, method: action.method });
      if (action.group)
        this.actionCounters.set(action.group, 1 + (this.actionCounters.get(action.group) || 0));
    }
  }
  createRelativeUrl(path) {
    const url = new URL("http://localhost/" + path);
    url.searchParams.set("trace", this.traceUri);
    return url.toString().substring("http://localhost/".length);
  }
  failedAction() {
    return this.actions.findLast((a) => a.error);
  }
  screenshotForCall(callId, phase) {
    return this._screenshots.get(`${callId}/${phase}`);
  }
  ariaSnapshotForCall(callId, phase) {
    return this._ariaSnapshots.get(`${callId}/${phase}`);
  }
  eventsForAction(action) {
    let result = this._eventsForAction.get(action);
    if (result)
      return result;
    let nextAction = nextActionByStartTime(action);
    while (nextAction && nextAction.class === "Route")
      nextAction = nextActionByStartTime(nextAction);
    result = this.events.filter((event) => {
      return event.time >= action.startTime && (!nextAction || event.time < nextAction.startTime);
    });
    this._eventsForAction.set(action, result);
    return result;
  }
  stats(action) {
    let errors = 0;
    let warnings = 0;
    for (const event of this.eventsForAction(action)) {
      if (event.type === "console") {
        const type = event.messageType;
        if (type === "warning")
          ++warnings;
        else if (type === "error")
          ++errors;
      }
      if (event.type === "event" && event.method === "pageError")
        ++errors;
    }
    return { errors, warnings };
  }
  filteredActions(actionsFilter) {
    const filter = new Set(actionsFilter);
    return this.actions.filter((action) => !action.group || filter.has(action.group));
  }
  renderActionTree(filter) {
    const actions = this.filteredActions(filter ?? []);
    const { rootItem } = buildActionTree(actions);
    const actionTree = [];
    const visit = (actionItem, indent) => {
      const title = renderTitleForCall({ ...actionItem.action, type: actionItem.action.class });
      actionTree.push(`${indent}${title || actionItem.id}`);
      for (const child of actionItem.children)
        visit(child, indent + "  ");
    };
    rootItem.children.forEach((a) => visit(a, ""));
    return actionTree;
  }
  _errorDescriptorsFromActions() {
    const errors = [];
    for (const action of this.actions || []) {
      if (!action.error?.message)
        continue;
      errors.push({
        action,
        stack: action.stack,
        message: action.error.message
      });
    }
    return errors;
  }
  _errorDescriptorsFromTestRunner() {
    return this.errors.filter((e) => !!e.message).map((error, i) => ({
      stack: error.stack,
      message: error.message
    }));
  }
}
function mergeActionsAndUpdateTiming(contexts) {
  const result = mergeActionsAndUpdateTimingSameTrace(contexts);
  result.sort((a1, a2) => {
    if (a2.parentId === a1.callId)
      return 1;
    if (a1.parentId === a2.callId)
      return -1;
    return a1.endTime - a2.endTime;
  });
  for (let i = 1; i < result.length; ++i)
    result[i][prevByEndTimeSymbol] = result[i - 1];
  result.sort((a1, a2) => {
    if (a2.parentId === a1.callId)
      return -1;
    if (a1.parentId === a2.callId)
      return 1;
    return a1.startTime - a2.startTime;
  });
  for (let i = 0; i + 1 < result.length; ++i)
    result[i][nextByStartTimeSymbol] = result[i + 1];
  return result;
}
let lastTmpStepId = 0;
function mergeActionsAndUpdateTimingSameTrace(contexts) {
  const map = /* @__PURE__ */ new Map();
  const libraryContexts = contexts.filter((context) => context.origin === "library");
  const testRunnerContexts = contexts.filter((context) => context.origin === "testRunner");
  if (!testRunnerContexts.length || !libraryContexts.length) {
    return contexts.map((context) => {
      return context.actions.map((action) => ({ ...action }));
    }).flat();
  }
  const timeOrigin = (context) => context.wallTime - context.monotonicTime;
  const runnerContext = testRunnerContexts.find((context) => context.monotonicTime);
  for (const context of libraryContexts) {
    if (runnerContext && context.monotonicTime)
      adjustMonotonicTime(context, timeOrigin(context) - timeOrigin(runnerContext));
  }
  for (const context of libraryContexts) {
    for (const action of context.actions) {
      map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action });
    }
  }
  const nonPrimaryIdToPrimaryId = /* @__PURE__ */ new Map();
  for (const context of testRunnerContexts) {
    for (const action of context.actions) {
      const existing = action.stepId && map.get(action.stepId);
      if (existing) {
        nonPrimaryIdToPrimaryId.set(action.callId, existing.callId);
        if (action.error)
          existing.error = action.error;
        if (action.attachments)
          existing.attachments = action.attachments;
        if (action.annotations)
          existing.annotations = action.annotations;
        if (action.parentId)
          existing.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
        if (action.group)
          existing.group = action.group;
        existing.startTime = action.startTime;
        existing.endTime = action.endTime;
        continue;
      }
      if (action.parentId)
        action.parentId = nonPrimaryIdToPrimaryId.get(action.parentId) ?? action.parentId;
      map.set(action.stepId || `tmp-step@${++lastTmpStepId}`, { ...action });
    }
  }
  return [...map.values()];
}
function adjustMonotonicTime(context, monotonicTimeDelta) {
  if (!monotonicTimeDelta)
    return;
  context.startTime += monotonicTimeDelta;
  context.endTime += monotonicTimeDelta;
  context.monotonicTime += monotonicTimeDelta;
  for (const action of context.actions) {
    if (action.startTime)
      action.startTime += monotonicTimeDelta;
    if (action.endTime)
      action.endTime += monotonicTimeDelta;
  }
  for (const event of context.events)
    event.time += monotonicTimeDelta;
  for (const event of context.stdio)
    event.timestamp += monotonicTimeDelta;
  for (const page of context.pages) {
    for (const frame of page.screencastFrames)
      frame.timestamp += monotonicTimeDelta;
  }
  for (const resource of context.resources) {
    if (resource._monotonicTime)
      resource._monotonicTime += monotonicTimeDelta;
  }
}
function buildActionTree(actions) {
  const itemMap = /* @__PURE__ */ new Map();
  for (const action of actions) {
    itemMap.set(action.callId, {
      id: action.callId,
      parent: void 0,
      children: [],
      action
    });
  }
  const rootItem = { action: { ...kFakeRootAction }, id: "", parent: void 0, children: [] };
  for (const item of itemMap.values()) {
    rootItem.action.startTime = Math.min(rootItem.action.startTime, item.action.startTime);
    rootItem.action.endTime = Math.max(rootItem.action.endTime, item.action.endTime);
    const parent = item.action.parentId ? itemMap.get(item.action.parentId) || rootItem : rootItem;
    parent.children.push(item);
    item.parent = parent;
  }
  const inheritStack = (item) => {
    for (const child of item.children) {
      child.action.stack = child.action.stack ?? item.action.stack;
      inheritStack(child);
    }
  };
  inheritStack(rootItem);
  return { rootItem, itemMap };
}
function previousActionByEndTime(action) {
  return action[prevByEndTimeSymbol];
}
function nextActionByStartTime(action) {
  return action[nextByStartTimeSymbol];
}
function collectSources(actions, errorDescriptors) {
  const result = /* @__PURE__ */ new Map();
  for (const action of actions) {
    for (const frame of action.stack || []) {
      let source = result.get(frame.file);
      if (!source) {
        source = { errors: [], content: void 0 };
        result.set(frame.file, source);
      }
    }
  }
  for (const error of errorDescriptors) {
    const { action, stack, message } = error;
    if (!action || !stack)
      continue;
    result.get(stack[0].file)?.errors.push({
      line: stack[0].line || 0,
      message
    });
  }
  return result;
}
const kFakeRootAction = {
  type: "action",
  callId: "",
  startTime: 0,
  endTime: 0,
  class: "",
  method: "",
  params: {},
  log: []
};
export {
  TraceModel,
  buildActionTree,
  nextActionByStartTime,
  previousActionByEndTime
};

//# sourceMappingURL=traceModel.mjs.map
