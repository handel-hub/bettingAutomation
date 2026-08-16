import { getMetainfo } from "./protocolMetainfo.mjs";
function formatProtocolParam(params, alternatives) {
  return _formatProtocolParam(params, alternatives)?.replaceAll("\n", "\\n");
}
function _formatProtocolParam(params, alternatives) {
  if (!params)
    return void 0;
  for (const name of alternatives.split("|")) {
    if (name === "url") {
      try {
        const urlObject = new URL(params[name]);
        if (urlObject.protocol === "data:")
          return urlObject.protocol;
        if (["about:", "chrome:", "edge:"].includes(urlObject.protocol))
          return params[name];
        return urlObject.pathname + urlObject.search;
      } catch (error) {
        if (params[name] !== void 0)
          return params[name];
      }
    }
    if (name === "timeNumber" && params[name] !== void 0) {
      return new Date(params[name]).toString();
    }
    const value = deepParam(params, name);
    if (value !== void 0)
      return value;
  }
}
function deepParam(params, name) {
  const tokens = name.split(".");
  let current = params;
  for (const token of tokens) {
    if (typeof current !== "object" || current === null)
      return void 0;
    current = current[token];
  }
  if (current === void 0)
    return void 0;
  return String(current);
}
function renderTitleForCall(metadata) {
  const titleFormat = metadata.title ?? getMetainfo(metadata)?.title ?? metadata.method;
  return titleFormat.replace(/\{([^}]+)\}/g, (fullMatch, p1) => {
    return formatProtocolParam(metadata.params, p1) ?? fullMatch;
  });
}
function getActionGroup(metadata) {
  return getMetainfo(metadata)?.group;
}
export {
  formatProtocolParam,
  getActionGroup,
  renderTitleForCall
};

//# sourceMappingURL=protocolFormatter.mjs.map
