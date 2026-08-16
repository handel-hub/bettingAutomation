import { splitTestIdAttributeNames } from "../isomorphic/locatorUtils.mjs";
import { escapeForAttributeSelector, escapeForTextSelector, escapeRegExp, quoteCSSAttributeValue } from "../isomorphic/stringUtils.mjs";
import { beginDOMCaches, closestCrossShadow, endDOMCaches, isElementVisible, isInsideScope, parentElementOrShadowHost } from "./domUtils.mjs";
import { beginAriaCaches, endAriaCaches, getAriaRole, getElementAccessibleDescription, getElementAccessibleName } from "./roleUtils.mjs";
import { elementText, getElementLabels } from "./selectorUtils.mjs";
const kTextScoreRange = 10;
const kExactPenalty = kTextScoreRange / 2;
const kTestIdScore = 1;
const kOtherTestIdScore = 2;
const kIframeByAttributeScore = 10;
const kBeginPenalizedScore = 50;
const kRoleWithNameScore = 100;
const kPlaceholderScore = 120;
const kLabelScore = 140;
const kAltTextScore = 160;
const kTextScore = 180;
const kTitleScore = 200;
const kTextScoreRegex = 250;
const kPlaceholderScoreExact = kPlaceholderScore + kExactPenalty;
const kLabelScoreExact = kLabelScore + kExactPenalty;
const kRoleWithNameScoreExact = kRoleWithNameScore + kExactPenalty;
const kAltTextScoreExact = kAltTextScore + kExactPenalty;
const kTextScoreExact = kTextScore + kExactPenalty;
const kTitleScoreExact = kTitleScore + kExactPenalty;
const kEndPenalizedScore = 300;
const kCSSIdScore = 500;
const kRoleWithoutNameScore = 510;
const kCSSInputTypeNameScore = 520;
const kCSSTagNameScore = 530;
const kNthScore = 1e4;
const kCSSFallbackScore = 1e7;
const kScoreThresholdForTextExpect = 1e3;
function generateSelector(injectedScript, targetElement, options) {
  injectedScript._evaluator.begin();
  const cache = { allowText: /* @__PURE__ */ new Map(), disallowText: /* @__PURE__ */ new Map() };
  beginAriaCaches();
  beginDOMCaches();
  try {
    let targetTokens;
    if (options.forTextExpect) {
      targetTokens = cssFallback(injectedScript, targetElement.ownerDocument.documentElement, options);
      for (let element = targetElement; element; element = parentElementOrShadowHost(element)) {
        const tokens = generateSelectorFor(cache, injectedScript, element, { ...options, noText: true });
        if (!tokens)
          continue;
        const score = combineScores(tokens);
        if (score <= kScoreThresholdForTextExpect) {
          targetTokens = tokens;
          break;
        }
      }
    } else {
      if (!targetElement.matches("input,textarea,select") && !targetElement.isContentEditable) {
        const interactiveParent = closestCrossShadow(targetElement, "button,select,input,[role=button],[role=checkbox],[role=radio],a,[role=link]", options.root);
        if (interactiveParent && isElementVisible(interactiveParent))
          targetElement = interactiveParent;
      }
      targetTokens = generateSelectorFor(cache, injectedScript, targetElement, options) || cssFallback(injectedScript, targetElement, options);
    }
    const selector = joinTokens(targetTokens);
    const parsedSelector = injectedScript.parseSelector(selector);
    return {
      selector,
      elements: injectedScript.querySelectorAll(parsedSelector, options.root ?? targetElement.ownerDocument)
    };
  } finally {
    endDOMCaches();
    endAriaCaches();
    injectedScript._evaluator.end();
  }
}
function generateSelectorFor(cache, injectedScript, targetElement, options) {
  if (options.root && !isInsideScope(options.root, targetElement))
    throw new Error(`Target element must belong to the root's subtree`);
  if (targetElement === options.root)
    return [{ engine: "css", selector: ":scope", score: 1 }];
  if (targetElement.ownerDocument.documentElement === targetElement)
    return [{ engine: "css", selector: "html", score: 1 }];
  let result = null;
  const updateResult = (candidate) => {
    if (!result || combineScores(candidate) < combineScores(result))
      result = candidate;
  };
  const candidates = [];
  for (const candidate of buildTextCandidates(injectedScript, targetElement, !options.isRecursive, options))
    candidates.push({ candidate, isTextCandidate: true });
  for (const token of buildNoTextCandidates(injectedScript, targetElement, options)) {
    if (options.omitInternalEngines && token.engine.startsWith("internal:"))
      continue;
    candidates.push({ candidate: [token], isTextCandidate: false });
  }
  candidates.sort((a, b) => combineScores(a.candidate) - combineScores(b.candidate));
  for (const { candidate, isTextCandidate } of candidates) {
    const elements = injectedScript.querySelectorAll(injectedScript.parseSelector(joinTokens(candidate)), options.root ?? targetElement.ownerDocument);
    if (!elements.includes(targetElement)) {
      continue;
    }
    if (elements.length === 1) {
      updateResult(candidate);
      break;
    }
    const index = elements.indexOf(targetElement);
    if (index > 5) {
      continue;
    }
    updateResult([...candidate, { engine: "nth", selector: String(index), score: kNthScore }]);
    if (options.isRecursive) {
      continue;
    }
    for (let parent = parentElementOrShadowHost(targetElement); parent && parent !== options.root; parent = parentElementOrShadowHost(parent)) {
      const filtered = elements.filter((e) => isInsideScope(parent, e) && e !== parent);
      const newIndex = filtered.indexOf(targetElement);
      if (filtered.length > 5 || newIndex === -1 || newIndex === index && filtered.length > 1) {
        continue;
      }
      const inParent = filtered.length === 1 ? candidate : [...candidate, { engine: "nth", selector: String(newIndex), score: kNthScore }];
      const idealSelectorForParent = { engine: "", selector: "", score: 1 };
      if (result && combineScores([idealSelectorForParent, ...inParent]) >= combineScores(result)) {
        continue;
      }
      const noText = !!options.noText || isTextCandidate;
      const cacheMap = noText ? cache.disallowText : cache.allowText;
      let parentTokens = cacheMap.get(parent);
      if (parentTokens === void 0) {
        parentTokens = generateSelectorFor(cache, injectedScript, parent, { ...options, isRecursive: true, noText }) || cssFallback(injectedScript, parent, options);
        cacheMap.set(parent, parentTokens);
      }
      if (!parentTokens)
        continue;
      updateResult([...parentTokens, ...inParent]);
    }
  }
  return result;
}
function buildNoTextCandidates(injectedScript, element, options) {
  const candidates = [];
  const testIdAttributeNames = splitTestIdAttributeNames(options.testIdAttributeName);
  {
    for (const attr of ["data-testid", "data-test-id", "data-test"]) {
      if (!testIdAttributeNames.includes(attr) && element.getAttribute(attr))
        candidates.push({ engine: "css", selector: `[${attr}=${quoteCSSAttributeValue(element.getAttribute(attr))}]`, score: kOtherTestIdScore });
    }
    const idAttr = element.getAttribute("id");
    if (idAttr && !isGuidLike(idAttr))
      candidates.push({ engine: "css", selector: makeSelectorForId(idAttr), score: kCSSIdScore });
    candidates.push({ engine: "css", selector: escapeNodeName(element), score: kCSSTagNameScore });
  }
  if (element.nodeName === "IFRAME" || element.nodeName === "FRAME") {
    for (const attribute of ["name", "title"]) {
      if (element.getAttribute(attribute))
        candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[${attribute}=${quoteCSSAttributeValue(element.getAttribute(attribute))}]`, score: kIframeByAttributeScore });
    }
    for (const testIdAttr of testIdAttributeNames) {
      if (element.getAttribute(testIdAttr))
        candidates.push({ engine: "css", selector: `[${testIdAttr}=${quoteCSSAttributeValue(element.getAttribute(testIdAttr))}]`, score: kTestIdScore });
    }
    penalizeScoreForLength([candidates]);
    return candidates;
  }
  for (const testIdAttr of testIdAttributeNames) {
    if (element.getAttribute(testIdAttr))
      candidates.push({ engine: "internal:testid", selector: `[${testIdAttr}=${escapeForAttributeSelector(element.getAttribute(testIdAttr), true)}]`, score: kTestIdScore });
  }
  if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
    const input = element;
    if (input.placeholder) {
      candidates.push({ engine: "internal:attr", selector: `[placeholder=${escapeForAttributeSelector(input.placeholder, true)}]`, score: kPlaceholderScoreExact });
      for (const alternative of suitableTextAlternatives(input.placeholder))
        candidates.push({ engine: "internal:attr", selector: `[placeholder=${escapeForAttributeSelector(alternative.text, false)}]`, score: kPlaceholderScore - alternative.scoreBonus });
    }
  }
  const labels = getElementLabels(injectedScript._evaluator._cacheText, element, { skipRefsInsideElement: options.noText });
  for (const label of labels) {
    const labelText = label.normalized;
    candidates.push({ engine: "internal:label", selector: escapeForTextSelector(labelText, true), score: kLabelScoreExact });
    for (const alternative of suitableTextAlternatives(labelText))
      candidates.push({ engine: "internal:label", selector: escapeForTextSelector(alternative.text, false), score: kLabelScore - alternative.scoreBonus });
  }
  const ariaRole = getAriaRole(element);
  if (ariaRole && !["none", "presentation"].includes(ariaRole))
    candidates.push({ engine: "internal:role", selector: ariaRole, score: kRoleWithoutNameScore });
  if (element.getAttribute("name") && ["BUTTON", "FORM", "FIELDSET", "FRAME", "IFRAME", "INPUT", "KEYGEN", "OBJECT", "OUTPUT", "SELECT", "TEXTAREA", "MAP", "META", "PARAM"].includes(element.nodeName))
    candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[name=${quoteCSSAttributeValue(element.getAttribute("name"))}]`, score: kCSSInputTypeNameScore });
  if (["INPUT", "TEXTAREA"].includes(element.nodeName) && element.getAttribute("type") !== "hidden") {
    if (element.getAttribute("type"))
      candidates.push({ engine: "css", selector: `${escapeNodeName(element)}[type=${quoteCSSAttributeValue(element.getAttribute("type"))}]`, score: kCSSInputTypeNameScore });
  }
  if (["INPUT", "TEXTAREA", "SELECT"].includes(element.nodeName) && element.getAttribute("type") !== "hidden")
    candidates.push({ engine: "css", selector: escapeNodeName(element), score: kCSSInputTypeNameScore + 1 });
  penalizeScoreForLength([candidates]);
  return candidates;
}
function buildTextCandidates(injectedScript, element, isTargetNode, options) {
  if (element.nodeName === "SELECT")
    return [];
  const candidates = [];
  if (!options.noText) {
    const title = element.getAttribute("title");
    if (title) {
      candidates.push([{ engine: "internal:attr", selector: `[title=${escapeForAttributeSelector(title, true)}]`, score: kTitleScoreExact }]);
      for (const alternative of suitableTextAlternatives(title))
        candidates.push([{ engine: "internal:attr", selector: `[title=${escapeForAttributeSelector(alternative.text, false)}]`, score: kTitleScore - alternative.scoreBonus }]);
    }
    const alt = element.getAttribute("alt");
    if (alt && ["APPLET", "AREA", "IMG", "INPUT"].includes(element.nodeName)) {
      candidates.push([{ engine: "internal:attr", selector: `[alt=${escapeForAttributeSelector(alt, true)}]`, score: kAltTextScoreExact }]);
      for (const alternative of suitableTextAlternatives(alt))
        candidates.push([{ engine: "internal:attr", selector: `[alt=${escapeForAttributeSelector(alternative.text, false)}]`, score: kAltTextScore - alternative.scoreBonus }]);
    }
  }
  const text = options.noText ? "" : elementText(injectedScript._evaluator._cacheText, element).normalized;
  const textAlternatives = text ? suitableTextAlternatives(text) : [];
  if (text) {
    if (isTargetNode) {
      if (text.length <= 80)
        candidates.push([{ engine: "internal:text", selector: escapeForTextSelector(text, true), score: kTextScoreExact }]);
      for (const alternative of textAlternatives)
        candidates.push([{ engine: "internal:text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
    }
    const cssToken = { engine: "css", selector: escapeNodeName(element), score: kCSSTagNameScore };
    for (const alternative of textAlternatives)
      candidates.push([cssToken, { engine: "internal:has-text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
    if (isTargetNode && text.length <= 80) {
      const re = new RegExp("^" + escapeRegExp(text) + "$");
      candidates.push([cssToken, { engine: "internal:has-text", selector: escapeForTextSelector(re, false), score: kTextScoreRegex }]);
    }
  }
  const ariaRole = getAriaRole(element);
  if (ariaRole && !["none", "presentation"].includes(ariaRole)) {
    const accessibleName = getElementAccessibleName(element, false);
    const ariaName = options.noText && accessibleName.derivedFromContent ? "" : accessibleName.text;
    const accessibleDescription = getElementAccessibleDescription(element, false);
    const ariaDescription = options.noText && accessibleDescription.derivedFromContent ? "" : accessibleDescription.text;
    if (ariaName && !ariaName.match(/^\p{Co}+$/u)) {
      const roleToken = { engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(ariaName, true)}]`, score: kRoleWithNameScoreExact };
      candidates.push([roleToken]);
      for (const alternative of suitableTextAlternatives(ariaName))
        candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(alternative.text, false)}]`, score: kRoleWithNameScore - alternative.scoreBonus }]);
      if (ariaDescription) {
        candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(ariaName, true)}][description=${escapeForAttributeSelector(ariaDescription, true)}]`, score: kRoleWithNameScoreExact + 1 }]);
        for (const alternative of suitableTextAlternatives(ariaName))
          candidates.push([{ engine: "internal:role", selector: `${ariaRole}[name=${escapeForAttributeSelector(alternative.text, false)}][description=${escapeForAttributeSelector(ariaDescription, false)}]`, score: kRoleWithNameScore - alternative.scoreBonus + 1 }]);
      }
    } else {
      const roleToken = { engine: "internal:role", selector: `${ariaRole}`, score: kRoleWithoutNameScore };
      if (ariaDescription)
        candidates.push([{ engine: "internal:role", selector: `${ariaRole}[description=${escapeForAttributeSelector(ariaDescription, true)}]`, score: kRoleWithoutNameScore + 1 }]);
      for (const alternative of textAlternatives)
        candidates.push([roleToken, { engine: "internal:has-text", selector: escapeForTextSelector(alternative.text, false), score: kTextScore - alternative.scoreBonus }]);
      if (!options.noText && isTargetNode && text.length <= 80) {
        const re = new RegExp("^" + escapeRegExp(text) + "$");
        candidates.push([roleToken, { engine: "internal:has-text", selector: escapeForTextSelector(re, false), score: kTextScoreRegex }]);
      }
    }
  }
  penalizeScoreForLength(candidates);
  return candidates;
}
function makeSelectorForId(id) {
  return /^[a-zA-Z][a-zA-Z0-9\-\_]+$/.test(id) ? "#" + id : `[id=${quoteCSSAttributeValue(id)}]`;
}
function cssFallback(injectedScript, targetElement, options) {
  const root = options.root ?? targetElement.ownerDocument;
  const tokens = [];
  function uniqueCSSSelector(prefix) {
    const path = tokens.slice();
    if (prefix)
      path.unshift(prefix);
    const selector = path.join(" > ");
    const parsedSelector = injectedScript.parseSelector(selector);
    const node = injectedScript.querySelector(parsedSelector, root, false);
    return node === targetElement ? selector : void 0;
  }
  function makeStrict(selector) {
    const token = { engine: "css", selector, score: kCSSFallbackScore };
    const parsedSelector = injectedScript.parseSelector(selector);
    const elements = injectedScript.querySelectorAll(parsedSelector, root);
    if (elements.length === 1)
      return [token];
    const nth = { engine: "nth", selector: String(elements.indexOf(targetElement)), score: kNthScore };
    return [token, nth];
  }
  for (let element = targetElement; element && element !== root; element = parentElementOrShadowHost(element)) {
    let bestTokenForLevel = "";
    if (element.id) {
      const token = makeSelectorForId(element.id);
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      bestTokenForLevel = token;
    }
    const parent = element.parentNode;
    const classes = [...element.classList].map(escapeClassName);
    for (let i = 0; i < classes.length; ++i) {
      const token = "." + classes.slice(0, i + 1).join(".");
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      if (!bestTokenForLevel && parent) {
        const sameClassSiblings = parent.querySelectorAll(token);
        if (sameClassSiblings.length === 1)
          bestTokenForLevel = token;
      }
    }
    if (parent) {
      const siblings = [...parent.children];
      const nodeName = element.nodeName;
      const sameTagSiblings = siblings.filter((sibling) => sibling.nodeName === nodeName);
      const token = sameTagSiblings.indexOf(element) === 0 ? escapeNodeName(element) : `${escapeNodeName(element)}:nth-child(${1 + siblings.indexOf(element)})`;
      const selector = uniqueCSSSelector(token);
      if (selector)
        return makeStrict(selector);
      if (!bestTokenForLevel)
        bestTokenForLevel = token;
    } else if (!bestTokenForLevel) {
      bestTokenForLevel = escapeNodeName(element);
    }
    tokens.unshift(bestTokenForLevel);
  }
  return makeStrict(uniqueCSSSelector());
}
function penalizeScoreForLength(groups) {
  for (const group of groups) {
    for (const token of group) {
      if (token.score > kBeginPenalizedScore && token.score < kEndPenalizedScore)
        token.score += Math.min(kTextScoreRange, token.selector.length / 10 | 0);
    }
  }
}
function joinTokens(tokens) {
  const parts = [];
  let lastEngine = "";
  for (const { engine, selector } of tokens) {
    if (parts.length && (lastEngine !== "css" || engine !== "css" || selector.startsWith(":nth-match(")))
      parts.push(">>");
    lastEngine = engine;
    if (engine === "css")
      parts.push(selector);
    else
      parts.push(`${engine}=${selector}`);
  }
  return parts.join(" ");
}
function combineScores(tokens) {
  let score = 0;
  for (let i = 0; i < tokens.length; i++)
    score += tokens[i].score * (tokens.length - i);
  return score;
}
function isGuidLike(id) {
  let lastCharacterType;
  let transitionCount = 0;
  for (let i = 0; i < id.length; ++i) {
    const c = id[i];
    let characterType;
    if (c === "-" || c === "_")
      continue;
    if (c >= "a" && c <= "z")
      characterType = "lower";
    else if (c >= "A" && c <= "Z")
      characterType = "upper";
    else if (c >= "0" && c <= "9")
      characterType = "digit";
    else
      characterType = "other";
    if (characterType === "lower" && lastCharacterType === "upper") {
      lastCharacterType = characterType;
      continue;
    }
    if (lastCharacterType && lastCharacterType !== characterType)
      ++transitionCount;
    lastCharacterType = characterType;
  }
  return transitionCount >= id.length / 4;
}
function trimWordBoundary(text, maxLength) {
  if (text.length <= maxLength)
    return text;
  text = text.substring(0, maxLength);
  const match = text.match(/^(.*)\b(.+?)$/);
  if (!match)
    return "";
  return match[1].trimEnd();
}
function suitableTextAlternatives(text) {
  let result = [];
  {
    const match = text.match(/^([\d.,]+)[^.,\w]/);
    const leadingNumberLength = match ? match[1].length : 0;
    if (leadingNumberLength) {
      const alt = trimWordBoundary(text.substring(leadingNumberLength).trimStart(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }
  {
    const match = text.match(/[^.,\w]([\d.,]+)$/);
    const trailingNumberLength = match ? match[1].length : 0;
    if (trailingNumberLength) {
      const alt = trimWordBoundary(text.substring(0, text.length - trailingNumberLength).trimEnd(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }
  if (text.length <= 30) {
    result.push({ text, scoreBonus: 0 });
  } else {
    result.push({ text: trimWordBoundary(text, 80), scoreBonus: 0 });
    result.push({ text: trimWordBoundary(text, 30), scoreBonus: 1 });
  }
  result = result.filter((r) => r.text);
  if (!result.length)
    result.push({ text: text.substring(0, 80), scoreBonus: 0 });
  return result;
}
function escapeNodeName(node) {
  return node.nodeName.toLocaleLowerCase().replace(/[:\.]/g, (char) => "\\" + char);
}
function escapeClassName(className) {
  let result = "";
  for (let i = 0; i < className.length; i++)
    result += cssEscapeCharacter(className, i);
  return result;
}
function cssEscapeCharacter(s, i) {
  const c = s.charCodeAt(i);
  if (c === 0)
    return "\uFFFD";
  if (c >= 1 && c <= 31 || c >= 48 && c <= 57 && (i === 0 || i === 1 && s.charCodeAt(0) === 45))
    return "\\" + c.toString(16) + " ";
  if (i === 0 && c === 45 && s.length === 1)
    return "\\" + s.charAt(i);
  if (c >= 128 || c === 45 || c === 95 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122)
    return s.charAt(i);
  return "\\" + s.charAt(i);
}
export {
  generateSelector
};

//# sourceMappingURL=selectorGenerator.mjs.map
