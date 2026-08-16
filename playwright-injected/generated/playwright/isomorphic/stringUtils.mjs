function escapeWithQuotes(text, char = "'") {
  const stringified = JSON.stringify(text);
  const escapedText = stringified.substring(1, stringified.length - 1).replace(/\\"/g, '"');
  if (char === "'")
    return char + escapedText.replace(/[']/g, "\\'") + char;
  if (char === '"')
    return char + escapedText.replace(/["]/g, '\\"') + char;
  if (char === "`")
    return char + escapedText.replace(/[`]/g, "\\`") + char;
  throw new Error("Invalid escape char");
}
function escapeTemplateString(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
function isString(obj) {
  return typeof obj === "string" || obj instanceof String;
}
function toTitleCase(name) {
  return name.charAt(0).toUpperCase() + name.substring(1);
}
function toSnakeCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
}
function formatObject(value, indent = "  ", mode = "multiline") {
  if (typeof value === "string")
    return escapeWithQuotes(value, "'");
  if (Array.isArray(value))
    return `[${value.map((o) => formatObject(o)).join(", ")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((key) => key !== "timeout" && value[key] !== void 0).sort();
    if (!keys.length)
      return "{}";
    const tokens = [];
    for (const key of keys)
      tokens.push(`${key}: ${formatObject(value[key])}`);
    if (mode === "multiline")
      return `{
${tokens.map((t) => indent + t).join(`,
`)}
}`;
    return `{ ${tokens.join(", ")} }`;
  }
  return String(value);
}
function formatObjectOrVoid(value, indent = "  ") {
  const result = formatObject(value, indent);
  return result === "{}" ? "" : result;
}
function quoteCSSAttributeValue(text) {
  return `"${text.replace(/["\\]/g, (char) => "\\" + char)}"`;
}
let normalizedWhitespaceCache;
function cacheNormalizedWhitespaces() {
  normalizedWhitespaceCache = /* @__PURE__ */ new Map();
}
function normalizeWhiteSpace(text) {
  let result = normalizedWhitespaceCache?.get(text);
  if (result === void 0) {
    result = text.replace(/[\u200b\u00ad]/g, "").trim().replace(/\s+/g, " ");
    normalizedWhitespaceCache?.set(text, result);
  }
  return result;
}
function normalizeEscapedRegexQuotes(source) {
  return source.replace(/(^|[^\\])(\\\\)*\\(['"`])/g, "$1$2$3");
}
function escapeRegexForSelector(re) {
  if (re.unicode || re.unicodeSets)
    return String(re);
  return String(re).replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3").replace(/>>/g, "\\>\\>");
}
function escapeForTextSelector(text, exact) {
  if (typeof text !== "string")
    return escapeRegexForSelector(text);
  return `${JSON.stringify(text)}${exact ? "s" : "i"}`;
}
function escapeForAttributeSelector(value, exact) {
  if (typeof value !== "string")
    return escapeRegexForSelector(value);
  return `"${value.replace(/\\/g, "\\\\").replace(/["]/g, '\\"')}"${exact ? "s" : "i"}`;
}
function trimString(input, cap, suffix = "") {
  if (input.length <= cap)
    return input;
  const chars = [...input];
  if (chars.length > cap)
    return chars.slice(0, cap - suffix.length).join("") + suffix;
  return chars.join("");
}
function trimStringWithEllipsis(input, cap) {
  return trimString(input, cap, "\u2026");
}
function truncateDataUrl(url) {
  if (!url.startsWith("data:"))
    return url;
  const comma = url.indexOf(",");
  if (comma === -1)
    return url;
  return url.slice(0, comma + 1) + "\u2026";
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const escaped = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHTMLAttribute(s) {
  return s.replace(/[&<>"']/ug, (char) => escaped[char]);
}
function escapeHTML(s) {
  return s.replace(/[&<]/ug, (char) => escaped[char]);
}
function longestCommonSubstring(s1, s2) {
  const n = s1.length;
  const m = s2.length;
  let maxLen = 0;
  let endingIndex = 0;
  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endingIndex = i;
        }
      }
    }
  }
  return s1.slice(endingIndex - maxLen, endingIndex);
}
function parseRegex(regex) {
  if (regex[0] !== "/")
    throw new Error(`Invalid regex, must start with '/': ${regex}`);
  const lastSlash = regex.lastIndexOf("/");
  if (lastSlash <= 0)
    throw new Error(`Invalid regex, must end with '/' followed by optional flags: ${regex}`);
  const source = regex.slice(1, lastSlash);
  const flags = regex.slice(lastSlash + 1);
  return new RegExp(source, flags);
}
function tomlBasicString(value) {
  return JSON.stringify(value);
}
function tomlArray(values) {
  return `[${values.map((value) => tomlBasicString(value)).join(", ")}]`;
}
function tomlMultilineBasicString(value) {
  const escaped2 = value.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
  return `"""
${escaped2}
"""`;
}
const ansiRegex = new RegExp("([\\u001B\\u009B][[\\]()#?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{0,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))", "g");
function stripAnsiEscapes(str) {
  return str.replace(ansiRegex, "");
}
export {
  ansiRegex,
  cacheNormalizedWhitespaces,
  escapeForAttributeSelector,
  escapeForTextSelector,
  escapeHTML,
  escapeHTMLAttribute,
  escapeRegExp,
  escapeTemplateString,
  escapeWithQuotes,
  formatObject,
  formatObjectOrVoid,
  isString,
  longestCommonSubstring,
  normalizeEscapedRegexQuotes,
  normalizeWhiteSpace,
  parseRegex,
  quoteCSSAttributeValue,
  stripAnsiEscapes,
  toSnakeCase,
  toTitleCase,
  tomlArray,
  tomlBasicString,
  tomlMultilineBasicString,
  trimString,
  trimStringWithEllipsis,
  truncateDataUrl
};

//# sourceMappingURL=stringUtils.mjs.map
