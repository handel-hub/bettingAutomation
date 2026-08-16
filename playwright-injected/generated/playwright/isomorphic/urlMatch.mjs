import { isString } from "./stringUtils.mjs";
function isHttpUrl(url, base) {
  try {
    return ["http:", "https:"].includes(new URL(url, base).protocol);
  } catch {
    return false;
  }
}
const escapedChars = /* @__PURE__ */ new Set(["$", "^", "+", ".", "*", "(", ")", "|", "\\", "?", "{", "}", "[", "]"]);
function globToRegexPattern(glob) {
  const tokens = ["^"];
  let inGroup = false;
  for (let i = 0; i < glob.length; ++i) {
    const c = glob[i];
    if (c === "\\" && i + 1 < glob.length) {
      const char = glob[++i];
      tokens.push(escapedChars.has(char) ? "\\" + char : char);
      continue;
    }
    if (c === "*") {
      const charBefore = glob[i - 1];
      let starCount = 1;
      while (glob[i + 1] === "*") {
        starCount++;
        i++;
      }
      if (starCount > 1) {
        const charAfter = glob[i + 1];
        if (charAfter === "/") {
          if (charBefore === "/")
            tokens.push("((.+/)|)");
          else
            tokens.push("(.*/)");
          ++i;
        } else {
          tokens.push("(.*)");
        }
      } else {
        tokens.push("([^/]*)");
      }
      continue;
    }
    switch (c) {
      case "{":
        if (inGroup)
          throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: nested '{' is not supported`);
        inGroup = true;
        tokens.push("(");
        break;
      case "}":
        if (!inGroup)
          throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '}'`);
        inGroup = false;
        tokens.push(")");
        break;
      case ",":
        if (inGroup) {
          tokens.push("|");
          break;
        }
        tokens.push("\\" + c);
        break;
      default:
        tokens.push(escapedChars.has(c) ? "\\" + c : c);
    }
  }
  if (inGroup)
    throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '{'`);
  tokens.push("$");
  return tokens.join("");
}
function isRegExp(obj) {
  return obj instanceof RegExp || Object.prototype.toString.call(obj) === "[object RegExp]";
}
const isURLPattern = (v) => typeof globalThis.URLPattern === "function" && v instanceof globalThis.URLPattern;
function serializeURLPattern(v) {
  return {
    hash: v.hash,
    hostname: v.hostname,
    password: v.password,
    pathname: v.pathname,
    port: v.port,
    protocol: v.protocol,
    search: v.search,
    username: v.username
  };
}
function serializeURLMatch(match) {
  if (isString(match))
    return { glob: match };
  if (isRegExp(match))
    return { regexSource: match.source, regexFlags: match.flags };
  if (isURLPattern(match))
    return { urlPattern: serializeURLPattern(match) };
  return void 0;
}
function deserializeURLPattern(v) {
  if (typeof globalThis.URLPattern !== "function")
    return () => true;
  return new globalThis.URLPattern({
    hash: v.hash,
    hostname: v.hostname,
    password: v.password,
    pathname: v.pathname,
    port: v.port,
    protocol: v.protocol,
    search: v.search,
    username: v.username
  });
}
function deserializeURLMatch(match) {
  if (match.regexSource)
    return new RegExp(match.regexSource, match.regexFlags);
  if (match.urlPattern)
    return deserializeURLPattern(match.urlPattern);
  return match.glob;
}
function urlMatchesEqual(match1, match2) {
  if (isRegExp(match1) && isRegExp(match2))
    return match1.source === match2.source && match1.flags === match2.flags;
  return match1 === match2;
}
function urlMatches(baseURL, urlString, match, webSocketUrl) {
  if (match === void 0 || match === "")
    return true;
  if (isString(match))
    match = new RegExp(resolveGlobToRegexPattern(baseURL, match, webSocketUrl));
  if (isRegExp(match)) {
    match.lastIndex = 0;
    return match.test(urlString);
  }
  const url = parseURL(urlString);
  if (!url)
    return false;
  if (isURLPattern(match))
    return match.test(url.href);
  if (typeof match !== "function")
    throw new Error("url parameter should be string, RegExp, URLPattern or function");
  return match(url);
}
function resolveGlobToRegexPattern(baseURL, glob, webSocketUrl) {
  if (webSocketUrl)
    baseURL = toWebSocketBaseUrl(baseURL);
  glob = resolveGlobBase(baseURL, glob);
  return globToRegexPattern(glob);
}
function toWebSocketBaseUrl(baseURL) {
  if (baseURL && /^https?:\/\//i.test(baseURL))
    baseURL = baseURL.replace(/^https?/i, (scheme) => scheme.toLowerCase() === "https" ? "wss" : "ws");
  return baseURL;
}
function resolveGlobBase(baseURL, match) {
  if (!match.startsWith("*")) {
    let mapToken = function(original, replacement) {
      if (original.length === 0)
        return "";
      tokenMap.set(replacement, original);
      return replacement;
    };
    const tokenMap = /* @__PURE__ */ new Map();
    match = match.replaceAll(/\\\\\?/g, "?");
    if (match.startsWith("about:") || match.startsWith("data:") || match.startsWith("chrome:") || match.startsWith("edge:") || match.startsWith("file:"))
      return match;
    const relativePath = match.split("/").map((token, index) => {
      if (token === "." || token === ".." || token === "")
        return token;
      if (index === 0 && token.endsWith(":")) {
        if (token.indexOf("*") !== -1 || token.indexOf("{") !== -1)
          return mapToken(token, "http:");
        return token;
      }
      if (!/[*?{}\\]/.test(token))
        return token;
      const questionIndex = token.indexOf("?");
      if (questionIndex === -1)
        return mapToken(token, `$_${index}_$`);
      const newPrefix = mapToken(token.substring(0, questionIndex), `$_${index}_$`);
      const newSuffix = mapToken(token.substring(questionIndex), `?$_${index}_$`);
      return newPrefix + newSuffix;
    }).join("/");
    const result = resolveBaseURL(baseURL, relativePath);
    let resolved = result.resolved;
    for (const [token, original] of tokenMap) {
      const normalize = result.caseInsensitivePart?.includes(token);
      const replacement = normalize ? original.toLowerCase() : original;
      resolved = resolved.replace(token, () => replacement);
    }
    match = resolved;
  }
  return match;
}
function parseURL(url) {
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}
function constructURLBasedOnBaseURL(baseURL, givenURL) {
  try {
    return resolveBaseURL(baseURL, givenURL).resolved;
  } catch (e) {
    return givenURL;
  }
}
function resolveBaseURL(baseURL, givenURL) {
  try {
    const url = new URL(givenURL, baseURL);
    const resolved = url.toString();
    const caseInsensitivePrefix = url.origin;
    return { resolved, caseInsensitivePart: caseInsensitivePrefix };
  } catch (e) {
    return { resolved: givenURL };
  }
}
export {
  constructURLBasedOnBaseURL,
  deserializeURLMatch,
  globToRegexPattern,
  isHttpUrl,
  isURLPattern,
  resolveGlobToRegexPattern,
  serializeURLMatch,
  serializeURLPattern,
  urlMatches,
  urlMatchesEqual
};

//# sourceMappingURL=urlMatch.mjs.map
