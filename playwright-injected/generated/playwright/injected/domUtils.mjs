let globalOptions = {};
function setGlobalOptions(options) {
  globalOptions = options;
}
function getGlobalOptions() {
  return globalOptions;
}
function isInsideScope(scope, element) {
  while (element) {
    if (scope.contains(element))
      return true;
    element = enclosingShadowHost(element);
  }
  return false;
}
function enclosingElement(node) {
  if (node.nodeType === 1)
    return node;
  return node.parentElement ?? void 0;
}
function parentElementOrShadowHost(element) {
  if (element.parentElement)
    return element.parentElement;
  if (!element.parentNode)
    return;
  if (element.parentNode.nodeType === 11 && element.parentNode.host)
    return element.parentNode.host;
}
function enclosingShadowRootOrDocument(element) {
  let node = element;
  while (node.parentNode)
    node = node.parentNode;
  if (node.nodeType === 11 || node.nodeType === 9)
    return node;
}
function enclosingShadowHost(element) {
  while (element.parentElement)
    element = element.parentElement;
  return parentElementOrShadowHost(element);
}
function closestCrossShadow(element, css, scope) {
  while (element) {
    const closest = element.closest(css);
    if (scope && closest !== scope && closest?.contains(scope))
      return;
    if (closest)
      return closest;
    element = enclosingShadowHost(element);
  }
}
function getElementComputedStyle(element, pseudo) {
  const cache = pseudo === "::before" ? cacheStyleBefore : pseudo === "::after" ? cacheStyleAfter : cacheStyle;
  if (cache && cache.has(element))
    return cache.get(element);
  const style = element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView.getComputedStyle(element, pseudo) : void 0;
  cache?.set(element, style);
  return style;
}
function isElementStyleVisibilityVisible(element, style) {
  const cached = cacheStyleVisibility?.get(element);
  if (cached !== void 0)
    return cached;
  const result = computeElementStyleVisibilityVisible(element, style);
  cacheStyleVisibility?.set(element, result);
  return result;
}
function computeElementStyleVisibilityVisible(element, style) {
  style = style ?? getElementComputedStyle(element);
  if (!style)
    return true;
  if (Element.prototype.checkVisibility && globalOptions.browserNameForWorkarounds !== "webkit") {
    if (!element.checkVisibility())
      return false;
  } else {
    const detailsOrSummary = element.closest("details,summary");
    if (detailsOrSummary !== element && detailsOrSummary?.nodeName === "DETAILS" && !detailsOrSummary.open)
      return false;
  }
  if (style.visibility !== "visible")
    return false;
  return true;
}
function computeBox(element) {
  const style = getElementComputedStyle(element);
  if (!style)
    return { visible: true, inline: false };
  const cursor = style.cursor;
  if (style.display === "contents") {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && isElementVisible(child))
        return { visible: true, inline: false, cursor };
      if (child.nodeType === 3 && isVisibleTextNode(child))
        return { visible: true, inline: true, cursor };
    }
    return { visible: false, inline: false, cursor };
  }
  if (!isElementStyleVisibilityVisible(element, style))
    return { cursor, visible: false, inline: false };
  const rect = element.getBoundingClientRect();
  return { cursor, visible: rect.width > 0 && rect.height > 0, inline: style.display === "inline" };
}
function isElementVisible(element) {
  return computeBox(element).visible;
}
function isVisibleTextNode(node) {
  const range = node.ownerDocument.createRange();
  range.selectNode(node);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
function elementSafeTagName(element) {
  const tagName = element.tagName;
  if (typeof tagName === "string") {
    const firstCharCode = tagName.charCodeAt(0);
    if (firstCharCode >= 97 && firstCharCode <= 122)
      return tagName.toUpperCase();
    return tagName;
  }
  if (element instanceof HTMLFormElement)
    return "FORM";
  return element.tagName.toUpperCase();
}
let cacheStyle;
let cacheStyleBefore;
let cacheStyleAfter;
let cacheStyleVisibility;
let cachesCounter = 0;
function beginDOMCaches() {
  ++cachesCounter;
  cacheStyle ??= /* @__PURE__ */ new Map();
  cacheStyleBefore ??= /* @__PURE__ */ new Map();
  cacheStyleAfter ??= /* @__PURE__ */ new Map();
  cacheStyleVisibility ??= /* @__PURE__ */ new Map();
}
function endDOMCaches() {
  if (!--cachesCounter) {
    cacheStyle = void 0;
    cacheStyleBefore = void 0;
    cacheStyleAfter = void 0;
    cacheStyleVisibility = void 0;
  }
}
export {
  beginDOMCaches,
  closestCrossShadow,
  computeBox,
  elementSafeTagName,
  enclosingElement,
  enclosingShadowRootOrDocument,
  endDOMCaches,
  getElementComputedStyle,
  getGlobalOptions,
  isElementStyleVisibilityVisible,
  isElementVisible,
  isInsideScope,
  isVisibleTextNode,
  parentElementOrShadowHost,
  setGlobalOptions
};

//# sourceMappingURL=domUtils.mjs.map
