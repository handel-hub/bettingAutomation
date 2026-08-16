import * as css from "../isomorphic/cssTokenizer.mjs";
import { beginDOMCaches, closestCrossShadow, elementSafeTagName, enclosingShadowRootOrDocument, endDOMCaches, getElementComputedStyle, isElementStyleVisibilityVisible, isVisibleTextNode, parentElementOrShadowHost } from "./domUtils.mjs";
function hasExplicitAccessibleName(e) {
  return e.hasAttribute("aria-label") || e.hasAttribute("aria-labelledby");
}
const kAncestorPreventingLandmark = "article:not([role]), aside:not([role]), main:not([role]), nav:not([role]), section:not([role]), [role=article], [role=complementary], [role=main], [role=navigation], [role=region]";
const kGlobalAriaAttributes = [
  ["aria-atomic", void 0],
  ["aria-busy", void 0],
  ["aria-controls", void 0],
  ["aria-current", void 0],
  ["aria-describedby", void 0],
  ["aria-details", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-disabled', undefined],
  ["aria-dropeffect", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-errormessage', undefined],
  ["aria-flowto", void 0],
  ["aria-grabbed", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-haspopup', undefined],
  ["aria-hidden", void 0],
  // Global use deprecated in ARIA 1.2
  // ['aria-invalid', undefined],
  ["aria-keyshortcuts", void 0],
  ["aria-label", ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]],
  ["aria-labelledby", ["caption", "code", "deletion", "emphasis", "generic", "insertion", "paragraph", "presentation", "strong", "subscript", "superscript"]],
  ["aria-live", void 0],
  ["aria-owns", void 0],
  ["aria-relevant", void 0],
  ["aria-roledescription", ["generic"]]
];
function hasGlobalAriaAttribute(element, forRole) {
  return kGlobalAriaAttributes.some(([attr, prohibited]) => {
    return !prohibited?.includes(forRole || "") && element.hasAttribute(attr);
  });
}
function hasTabIndex(element) {
  return !Number.isNaN(Number(String(element.getAttribute("tabindex"))));
}
function isFocusable(element) {
  return !isNativelyDisabled(element) && (isNativelyFocusable(element) || hasTabIndex(element));
}
function isNativelyFocusable(element) {
  const tagName = elementSafeTagName(element);
  if (["BUTTON", "DETAILS", "SELECT", "TEXTAREA"].includes(tagName))
    return true;
  if (tagName === "A" || tagName === "AREA")
    return element.hasAttribute("href");
  if (tagName === "INPUT")
    return !element.hidden;
  return false;
}
const kImplicitRoleByTagName = {
  "A": (e) => {
    return e.hasAttribute("href") ? "link" : null;
  },
  "AREA": (e) => {
    return e.hasAttribute("href") ? "link" : null;
  },
  "ARTICLE": () => "article",
  "ASIDE": () => "complementary",
  "BLOCKQUOTE": () => "blockquote",
  "BUTTON": () => "button",
  "CAPTION": () => "caption",
  "CODE": () => "code",
  "DATALIST": () => "listbox",
  "DD": () => "definition",
  "DEL": () => "deletion",
  "DETAILS": () => "group",
  "DFN": () => "term",
  "DIALOG": () => "dialog",
  "DT": () => "term",
  "EM": () => "emphasis",
  "FIELDSET": () => "group",
  "FIGURE": () => "figure",
  "FOOTER": (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "contentinfo",
  "FORM": (e) => hasExplicitAccessibleName(e) ? "form" : null,
  "H1": () => "heading",
  "H2": () => "heading",
  "H3": () => "heading",
  "H4": () => "heading",
  "H5": () => "heading",
  "H6": () => "heading",
  "HEADER": (e) => closestCrossShadow(e, kAncestorPreventingLandmark) ? null : "banner",
  "HR": () => "separator",
  "HTML": () => "document",
  "IMG": (e) => e.getAttribute("alt") === "" && !e.getAttribute("title") && !hasGlobalAriaAttribute(e) && !hasTabIndex(e) ? "presentation" : "img",
  "INPUT": (e) => {
    const type = e.type.toLowerCase();
    if (["email", "search", "tel", "text", "url", ""].includes(type)) {
      const list = getIdRefs(e, e.getAttribute("list"))[0];
      if (list && elementSafeTagName(list) === "DATALIST")
        return "combobox";
      return type === "search" ? "searchbox" : "textbox";
    }
    if (type === "hidden")
      return null;
    if (type === "file")
      return "button";
    return inputTypeToRole[type] || "textbox";
  },
  "INS": () => "insertion",
  "LI": () => "listitem",
  "MAIN": () => "main",
  "MARK": () => "mark",
  "MATH": () => "math",
  "MENU": () => "list",
  "METER": () => "meter",
  "NAV": () => "navigation",
  "OL": () => "list",
  "OPTGROUP": () => "group",
  "OPTION": () => "option",
  "OUTPUT": () => "status",
  "P": () => "paragraph",
  "PROGRESS": () => "progressbar",
  "SEARCH": () => "search",
  "SECTION": (e) => hasExplicitAccessibleName(e) ? "region" : null,
  "SELECT": (e) => e.hasAttribute("multiple") || e.size > 1 ? "listbox" : "combobox",
  "STRONG": () => "strong",
  "SUB": () => "subscript",
  "SUP": () => "superscript",
  // For <svg> we default to Chrome behavior:
  // - Chrome reports 'img'.
  // - Firefox reports 'diagram' that is not in official ARIA spec yet.
  // - Safari reports 'no role', but still computes accessible name.
  "SVG": () => "img",
  "TABLE": () => "table",
  "TBODY": () => "rowgroup",
  "TD": (e) => {
    const table = closestCrossShadow(e, "table");
    const role = table ? getExplicitAriaRole(table) : "";
    return role === "grid" || role === "treegrid" ? "gridcell" : "cell";
  },
  "TEXTAREA": () => "textbox",
  "TFOOT": () => "rowgroup",
  "TH": (e) => {
    const scope = e.getAttribute("scope");
    if (scope === "col" || scope === "colgroup")
      return "columnheader";
    if (scope === "row" || scope === "rowgroup")
      return "rowheader";
    const nextSibling = e.nextElementSibling;
    const prevSibling = e.previousElementSibling;
    const row = !!e.parentElement && elementSafeTagName(e.parentElement) === "TR" ? e.parentElement : void 0;
    if (!nextSibling && !prevSibling) {
      if (row) {
        const table = closestCrossShadow(row, "table");
        if (table && table.rows.length <= 1)
          return null;
      }
      return "columnheader";
    }
    if (isHeaderCell(nextSibling) && isHeaderCell(prevSibling))
      return "columnheader";
    if (isNonEmptyDataCell(nextSibling) || isNonEmptyDataCell(prevSibling))
      return "rowheader";
    return "columnheader";
  },
  "THEAD": () => "rowgroup",
  "TIME": () => "time",
  "TR": () => "row",
  "UL": () => "list"
};
function isHeaderCell(element) {
  return !!element && elementSafeTagName(element) === "TH";
}
function isNonEmptyDataCell(element) {
  if (!element || elementSafeTagName(element) !== "TD")
    return false;
  return !!(element.textContent?.trim() || element.children.length > 0);
}
const kPresentationInheritanceParents = {
  "DD": ["DL", "DIV"],
  "DIV": ["DL"],
  "DT": ["DL", "DIV"],
  "LI": ["OL", "UL"],
  "TBODY": ["TABLE"],
  "TD": ["TR"],
  "TFOOT": ["TABLE"],
  "TH": ["TR"],
  "THEAD": ["TABLE"],
  "TR": ["THEAD", "TBODY", "TFOOT", "TABLE"]
};
function getImplicitAriaRole(element) {
  const implicitRole = kImplicitRoleByTagName[elementSafeTagName(element)]?.(element) || "";
  if (!implicitRole)
    return null;
  let ancestor = element;
  while (ancestor) {
    const parent = parentElementOrShadowHost(ancestor);
    const parents = kPresentationInheritanceParents[elementSafeTagName(ancestor)];
    if (!parents || !parent || !parents.includes(elementSafeTagName(parent)))
      break;
    const parentExplicitRole = getExplicitAriaRole(parent);
    if ((parentExplicitRole === "none" || parentExplicitRole === "presentation") && !hasPresentationConflictResolution(parent, parentExplicitRole))
      return parentExplicitRole;
    ancestor = parent;
  }
  return implicitRole;
}
const validRoles = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "directory",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "insertion",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "mark",
  "marquee",
  "math",
  "meter",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
];
function getExplicitAriaRole(element) {
  const roles = (element.getAttribute("role") || "").split(" ").map((role) => role.trim());
  return roles.find((role) => validRoles.includes(role)) || null;
}
function hasPresentationConflictResolution(element, role) {
  return hasGlobalAriaAttribute(element, role) || isFocusable(element);
}
function getAriaRole(element) {
  const cached = cacheAriaRole?.get(element);
  if (cached !== void 0)
    return cached;
  const role = computeAriaRole(element);
  cacheAriaRole?.set(element, role);
  return role;
}
function computeAriaRole(element) {
  const explicitRole = getExplicitAriaRole(element);
  if (!explicitRole)
    return getImplicitAriaRole(element);
  if (explicitRole === "none" || explicitRole === "presentation") {
    const implicitRole = getImplicitAriaRole(element);
    if (hasPresentationConflictResolution(element, implicitRole))
      return implicitRole;
  }
  return explicitRole;
}
function getAriaBoolean(attr) {
  return attr === null ? void 0 : attr.toLowerCase() === "true";
}
function isElementIgnoredForAria(element) {
  return ["STYLE", "SCRIPT", "NOSCRIPT", "TEMPLATE"].includes(elementSafeTagName(element));
}
function isElementHiddenForAria(element) {
  if (isElementIgnoredForAria(element))
    return true;
  const style = getElementComputedStyle(element);
  const isSlot = element.nodeName === "SLOT";
  if (style?.display === "contents" && !isSlot) {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && !isElementHiddenForAria(child))
        return false;
      if (child.nodeType === 3 && isVisibleTextNode(child))
        return false;
    }
    return true;
  }
  const isOptionInsideSelect = element.nodeName === "OPTION" && !!element.closest("select");
  if (!isOptionInsideSelect && !isSlot && !isElementStyleVisibilityVisible(element, style))
    return true;
  return belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element);
}
function belongsToDisplayNoneOrAriaHiddenOrNonSlotted(element) {
  let hidden = cacheIsHidden?.get(element);
  if (hidden === void 0) {
    hidden = false;
    if (element.parentElement && element.parentElement.shadowRoot && !element.assignedSlot)
      hidden = true;
    if (!hidden) {
      const style = getElementComputedStyle(element);
      hidden = !style || style.display === "none" || getAriaBoolean(element.getAttribute("aria-hidden")) === true;
    }
    if (!hidden) {
      const parent = parentElementOrShadowHost(element);
      if (parent)
        hidden = belongsToDisplayNoneOrAriaHiddenOrNonSlotted(parent);
    }
    cacheIsHidden?.set(element, hidden);
  }
  return hidden;
}
function getIdRefs(element, ref) {
  if (!ref)
    return [];
  const root = enclosingShadowRootOrDocument(element);
  if (!root)
    return [];
  try {
    const ids = ref.split(" ").filter((id) => !!id);
    const result = [];
    for (const id of ids) {
      const firstElement = root.querySelector("#" + CSS.escape(id));
      if (firstElement && !result.includes(firstElement))
        result.push(firstElement);
    }
    return result;
  } catch (e) {
    return [];
  }
}
function trimFlatString(s) {
  return s.trim();
}
function asFlatString(s) {
  return s.split("\xA0").map((chunk) => chunk.replace(/\r\n/g, "\n").replace(/[\u200b\u00ad]/g, "").replace(/\s\s*/g, " ")).join("\xA0").trim();
}
function queryInAriaOwned(element, selector) {
  const result = [...element.querySelectorAll(selector)];
  for (const owned of getIdRefs(element, element.getAttribute("aria-owns"))) {
    if (owned.matches(selector))
      result.push(owned);
    result.push(...owned.querySelectorAll(selector));
  }
  return result;
}
function getCSSContent(element, pseudo) {
  const cache = pseudo === "::before" ? cachePseudoContentBefore : pseudo === "::after" ? cachePseudoContentAfter : cachePseudoContent;
  if (cache?.has(element))
    return cache?.get(element);
  const style = getElementComputedStyle(element, pseudo);
  let content;
  if (style) {
    const contentValue = style.content;
    if (contentValue && contentValue !== "none" && contentValue !== "normal") {
      if (style.display !== "none" && style.visibility !== "hidden") {
        content = parseCSSContentPropertyAsString(element, contentValue, !!pseudo);
      }
    }
  }
  if (pseudo && content !== void 0) {
    const display = style?.display || "inline";
    if (display !== "inline")
      content = " " + content + " ";
  }
  if (cache)
    cache.set(element, content);
  return content;
}
function parseCSSContentPropertyAsString(element, content, isPseudo) {
  if (!content || content === "none" || content === "normal") {
    return;
  }
  try {
    let tokens = css.tokenize(content).filter((token) => !(token instanceof css.WhitespaceToken));
    const delimIndex = tokens.findIndex((token) => token instanceof css.DelimToken && token.value === "/");
    if (delimIndex !== -1) {
      tokens = tokens.slice(delimIndex + 1);
    } else if (!isPseudo) {
      return;
    }
    const accumulated = [];
    let index = 0;
    while (index < tokens.length) {
      if (tokens[index] instanceof css.StringToken) {
        accumulated.push(tokens[index].value);
        index++;
      } else if (index + 2 < tokens.length && tokens[index] instanceof css.FunctionToken && tokens[index].value === "attr" && tokens[index + 1] instanceof css.IdentToken && tokens[index + 2] instanceof css.CloseParenToken) {
        const attrName = tokens[index + 1].value;
        accumulated.push(element.getAttribute(attrName) || "");
        index += 3;
      } else {
        return;
      }
    }
    return accumulated.join("");
  } catch {
  }
}
function getAriaLabelledByElements(element) {
  const ref = element.getAttribute("aria-labelledby");
  if (ref === null)
    return null;
  const refs = getIdRefs(element, ref);
  return refs.length ? refs : null;
}
function allowsNameFromContent(role, targetDescendant) {
  const alwaysAllowsNameFromContent = ["button", "cell", "checkbox", "columnheader", "gridcell", "heading", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem"].includes(role);
  const descendantAllowsNameFromContent = targetDescendant && ["", "caption", "code", "contentinfo", "definition", "deletion", "emphasis", "insertion", "list", "listitem", "mark", "none", "paragraph", "presentation", "region", "row", "rowgroup", "section", "strong", "subscript", "superscript", "table", "term", "time"].includes(role);
  return alwaysAllowsNameFromContent || descendantAllowsNameFromContent;
}
function computeAccessibleNameComposite(element, includeHidden, collectElements) {
  const elementProhibitsNaming = ["caption", "code", "definition", "deletion", "emphasis", "generic", "insertion", "mark", "paragraph", "presentation", "strong", "subscript", "suggestion", "superscript", "term", "time"].includes(getAriaRole(element) || "");
  if (elementProhibitsNaming)
    return { ...emptyCompositeString(), derivedFromContent: false };
  const outDerivedFromContent = { value: false };
  const result = getTextAlternativeInternal(element, {
    includeHidden,
    collectElements,
    outDerivedFromContent,
    visitedElements: /* @__PURE__ */ new Set(),
    embeddedInTargetElement: "self"
  });
  return { text: asFlatString(result.text), elements: result.elements, derivedFromContent: outDerivedFromContent.value };
}
function getElementAccessibleName(element, includeHidden) {
  const cache = includeHidden ? cacheAccessibleNameHidden : cacheAccessibleName;
  let accessibleName = cache?.get(element);
  if (accessibleName === void 0) {
    accessibleName = computeAccessibleNameComposite(
      element,
      includeHidden,
      true
      /* collectElements */
    );
    cache?.set(element, accessibleName);
  }
  return accessibleName;
}
function getElementAccessibleNameText(element, includeHidden) {
  const composite = (includeHidden ? cacheAccessibleNameHidden : cacheAccessibleName)?.get(element);
  if (composite !== void 0)
    return composite.text;
  const cache = includeHidden ? cacheAccessibleNameTextHidden : cacheAccessibleNameText;
  let text = cache?.get(element);
  if (text === void 0) {
    text = computeAccessibleNameComposite(
      element,
      includeHidden,
      false
      /* collectElements */
    ).text;
    cache?.set(element, text);
  }
  return text;
}
function getElementAccessibleDescription(element, includeHidden) {
  const cache = includeHidden ? cacheAccessibleDescriptionHidden : cacheAccessibleDescription;
  let accessibleDescription = cache?.get(element);
  if (accessibleDescription === void 0) {
    accessibleDescription = { text: "", derivedFromContent: false };
    if (element.hasAttribute("aria-describedby")) {
      const describedBy = getIdRefs(element, element.getAttribute("aria-describedby"));
      accessibleDescription.text = asFlatString(describedBy.map((ref) => getTextAlternativeInternal(ref, {
        includeHidden,
        visitedElements: /* @__PURE__ */ new Set(),
        embeddedInDescribedBy: { element: ref, hidden: isElementHiddenForAria(ref) }
      }).text).join(" "));
      accessibleDescription.derivedFromContent = describedBy.some((ref) => ref === element || element.contains(ref));
    } else if (element.hasAttribute("aria-description")) {
      accessibleDescription.text = asFlatString(element.getAttribute("aria-description") || "");
    } else {
      accessibleDescription.text = asFlatString(element.getAttribute("title") || "");
    }
    cache?.set(element, accessibleDescription);
  }
  return accessibleDescription;
}
const kAriaInvalidRoles = [
  "application",
  "checkbox",
  "columnheader",
  "combobox",
  "gridcell",
  "listbox",
  "radiogroup",
  "rowheader",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "textbox",
  "tree"
];
function getAriaInvalid(element) {
  const ariaInvalid = element.getAttribute("aria-invalid");
  if (!ariaInvalid || ariaInvalid.trim() === "" || ariaInvalid.toLocaleLowerCase() === "false")
    return "false";
  if (ariaInvalid === "true" || ariaInvalid === "grammar" || ariaInvalid === "spelling")
    return ariaInvalid;
  return "true";
}
function getValidityInvalid(element) {
  if ("validity" in element) {
    const validity = element.validity;
    return validity?.valid === false;
  }
  return false;
}
function getElementAccessibleErrorMessage(element) {
  const cache = cacheAccessibleErrorMessage;
  let accessibleErrorMessage = cacheAccessibleErrorMessage?.get(element);
  if (accessibleErrorMessage === void 0) {
    accessibleErrorMessage = "";
    const isAriaInvalid = getAriaInvalid(element) !== "false";
    const isValidityInvalid = getValidityInvalid(element);
    if (isAriaInvalid || isValidityInvalid) {
      const errorMessageId = element.getAttribute("aria-errormessage");
      const errorMessages = getIdRefs(element, errorMessageId);
      const parts = errorMessages.map((errorMessage) => asFlatString(
        getTextAlternativeInternal(errorMessage, {
          visitedElements: /* @__PURE__ */ new Set(),
          embeddedInDescribedBy: { element: errorMessage, hidden: isElementHiddenForAria(errorMessage) }
        }).text
      ));
      accessibleErrorMessage = parts.join(" ").trim();
    }
    cache?.set(element, accessibleErrorMessage);
  }
  return accessibleErrorMessage;
}
function insideTargetElement(options) {
  return options.embeddedInTargetElement === "self" || options.embeddedInTargetElement === "descendant";
}
function getTextAlternativeInternal(element, options) {
  if (options.visitedElements.has(element))
    return emptyCompositeString();
  const childOptions = {
    ...options,
    embeddedInTargetElement: options.embeddedInTargetElement === "self" ? "descendant" : options.embeddedInTargetElement
  };
  if (!options.includeHidden) {
    const isEmbeddedInHiddenReferenceTraversal = !!options.embeddedInLabelledBy?.hidden || !!options.embeddedInDescribedBy?.hidden || !!options.embeddedInNativeTextAlternative?.hidden || !!options.embeddedInLabel?.hidden;
    if (isElementIgnoredForAria(element) || !isEmbeddedInHiddenReferenceTraversal && isElementHiddenForAria(element)) {
      options.visitedElements.add(element);
      return emptyCompositeString();
    }
  }
  const labelledBy = getAriaLabelledByElements(element);
  if (!options.embeddedInLabelledBy) {
    const accessibleName = joinCompositeString((labelledBy || []).map((ref) => getTextAlternativeInternal(ref, {
      ...options,
      embeddedInLabelledBy: { element: ref, hidden: isElementHiddenForAria(ref) },
      embeddedInDescribedBy: void 0,
      embeddedInTargetElement: void 0,
      embeddedInLabel: void 0,
      embeddedInNativeTextAlternative: void 0
    })), " ", options.collectElements);
    if (accessibleName.text) {
      if (options.outDerivedFromContent && insideTargetElement(options) && (labelledBy || []).some((ref) => ref === element || element.contains(ref)))
        options.outDerivedFromContent.value = true;
      return accessibleName;
    }
  }
  const role = getAriaRole(element) || "";
  const tagName = elementSafeTagName(element);
  if (!!options.embeddedInLabel || !!options.embeddedInLabelledBy || options.embeddedInTargetElement === "descendant") {
    const isOwnLabel = [...element.labels || []].includes(element);
    const isOwnLabelledBy = (labelledBy || []).includes(element);
    if (!isOwnLabel && !isOwnLabelledBy) {
      if (role === "textbox") {
        options.visitedElements.add(element);
        if (tagName === "INPUT" || tagName === "TEXTAREA")
          return compositeString(element.value, element, options.collectElements);
        return compositeString(element.textContent, element, options.collectElements);
      }
      if (["combobox", "listbox"].includes(role)) {
        options.visitedElements.add(element);
        let selectedOptions;
        if (tagName === "SELECT") {
          selectedOptions = [...element.selectedOptions];
          if (!selectedOptions.length && element.options.length)
            selectedOptions.push(element.options[0]);
        } else {
          const listbox = role === "combobox" ? queryInAriaOwned(element, "*").find((e) => getAriaRole(e) === "listbox") : element;
          selectedOptions = listbox ? queryInAriaOwned(listbox, '[aria-selected="true"]').filter((e) => getAriaRole(e) === "option") : [];
        }
        if (!selectedOptions.length && tagName === "INPUT") {
          return compositeString(element.value, element, options.collectElements);
        }
        return joinCompositeString(selectedOptions.map((option) => getTextAlternativeInternal(option, childOptions)), " ", options.collectElements);
      }
      if (["progressbar", "scrollbar", "slider", "spinbutton", "meter"].includes(role)) {
        options.visitedElements.add(element);
        if (element.hasAttribute("aria-valuetext"))
          return compositeString(element.getAttribute("aria-valuetext"), element, options.collectElements);
        if (element.hasAttribute("aria-valuenow"))
          return compositeString(element.getAttribute("aria-valuenow"), element, options.collectElements);
        return compositeString(element.getAttribute("value"), element, options.collectElements);
      }
      if (["menu"].includes(role)) {
        options.visitedElements.add(element);
        return emptyCompositeString();
      }
    }
  }
  const ariaLabel = element.getAttribute("aria-label") || "";
  if (trimFlatString(ariaLabel)) {
    options.visitedElements.add(element);
    return compositeString(ariaLabel, element, options.collectElements);
  }
  if (!["presentation", "none"].includes(role)) {
    if (tagName === "INPUT" && ["button", "submit", "reset"].includes(element.type)) {
      options.visitedElements.add(element);
      const value = element.value || "";
      if (trimFlatString(value))
        return compositeString(value, element, options.collectElements);
      if (element.type === "submit")
        return compositeString("Submit", element, options.collectElements);
      if (element.type === "reset")
        return compositeString("Reset", element, options.collectElements);
      const title = element.getAttribute("title") || "";
      return compositeString(title, element, options.collectElements);
    }
    if (tagName === "INPUT" && element.type === "file") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length && !options.embeddedInLabelledBy)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      return compositeString("Choose File", element, options.collectElements);
    }
    if (tagName === "INPUT" && element.type === "image") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length && !options.embeddedInLabelledBy)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt))
        return compositeString(alt, element, options.collectElements);
      const title = element.getAttribute("title") || "";
      if (trimFlatString(title))
        return compositeString(title, element, options.collectElements);
      return compositeString("Submit", element, options.collectElements);
    }
    if (!labelledBy && tagName === "BUTTON") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
    }
    if (!labelledBy && tagName === "OUTPUT") {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      return compositeString(element.getAttribute("title") || "", element, options.collectElements);
    }
    if (!labelledBy && (tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "INPUT" || tagName === "METER" || tagName === "PROGRESS")) {
      options.visitedElements.add(element);
      const labels = element.labels || [];
      if (labels.length)
        return getAccessibleNameFromAssociatedLabels(labels, options);
      const usePlaceholder = tagName === "INPUT" && ["text", "password", "number", "search", "tel", "email", "url"].includes(element.type) || tagName === "TEXTAREA";
      const placeholder = element.getAttribute("placeholder") || "";
      const title = element.getAttribute("title") || "";
      if (!usePlaceholder || title)
        return compositeString(title, element, options.collectElements);
      return compositeString(placeholder, element, options.collectElements);
    }
    if (!labelledBy && tagName === "FIELDSET") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "LEGEND") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
          });
        }
      }
      const title = element.getAttribute("title") || "";
      return compositeString(title, element, options.collectElements);
    }
    if (!labelledBy && tagName === "FIGURE") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "FIGCAPTION") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
          });
        }
      }
      const title = element.getAttribute("title") || "";
      return compositeString(title, element, options.collectElements);
    }
    if (tagName === "IMG") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt))
        return compositeString(alt, element, options.collectElements);
      const title = element.getAttribute("title") || "";
      return compositeString(title, element, options.collectElements);
    }
    if (tagName === "TABLE") {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "CAPTION") {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInNativeTextAlternative: { element: child, hidden: isElementHiddenForAria(child) }
          });
        }
      }
      const summary = element.getAttribute("summary") || "";
      if (summary)
        return compositeString(summary, element, options.collectElements);
    }
    if (tagName === "AREA") {
      options.visitedElements.add(element);
      const alt = element.getAttribute("alt") || "";
      if (trimFlatString(alt))
        return compositeString(alt, element, options.collectElements);
      const title = element.getAttribute("title") || "";
      return compositeString(title, element, options.collectElements);
    }
    if (tagName === "SVG" || element.ownerSVGElement) {
      options.visitedElements.add(element);
      for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
        if (elementSafeTagName(child) === "TITLE" && child.ownerSVGElement) {
          return getTextAlternativeInternal(child, {
            ...childOptions,
            embeddedInLabelledBy: { element: child, hidden: isElementHiddenForAria(child) }
          });
        }
      }
    }
    if (element.ownerSVGElement && tagName === "A") {
      const title = element.getAttribute("xlink:title") || "";
      if (trimFlatString(title)) {
        options.visitedElements.add(element);
        return compositeString(title, element, options.collectElements);
      }
    }
  }
  const shouldNameFromContentForSummary = tagName === "SUMMARY" && !["presentation", "none"].includes(role);
  if (allowsNameFromContent(role, options.embeddedInTargetElement === "descendant") || shouldNameFromContentForSummary || !!options.embeddedInLabelledBy || !!options.embeddedInDescribedBy || !!options.embeddedInLabel || !!options.embeddedInNativeTextAlternative) {
    options.visitedElements.add(element);
    const accessibleName = innerAccumulatedElementText(element, childOptions);
    const maybeTrimmedAccessibleName = options.embeddedInTargetElement === "self" ? trimFlatString(accessibleName.text) : accessibleName.text;
    if (maybeTrimmedAccessibleName) {
      if (options.outDerivedFromContent && insideTargetElement(options) && trimFlatString(accessibleName.text))
        options.outDerivedFromContent.value = true;
      accessibleName.elements?.add(element);
      return accessibleName;
    }
  }
  if (!["presentation", "none"].includes(role) || tagName === "IFRAME" || tagName === "FRAME") {
    options.visitedElements.add(element);
    const title = element.getAttribute("title") || "";
    if (trimFlatString(title))
      return compositeString(title, element, options.collectElements);
  }
  options.visitedElements.add(element);
  return emptyCompositeString();
}
function innerAccumulatedElementText(element, options) {
  const tokens = [];
  const elements = options.collectElements ? /* @__PURE__ */ new Set() : void 0;
  const visit = (node, skipSlotted) => {
    if (skipSlotted && node.assignedSlot)
      return;
    if (node.nodeType === 1) {
      const display = getElementComputedStyle(node)?.display || "inline";
      const childComposite = getTextAlternativeInternal(node, options);
      let token = childComposite.text;
      for (const contributor of childComposite.elements || [])
        elements?.add(contributor);
      if (display !== "inline" || node.nodeName === "BR")
        token = " " + token + " ";
      tokens.push(token);
    } else if (node.nodeType === 3) {
      tokens.push(node.textContent || "");
    }
  };
  tokens.push(getCSSContent(element, "::before") || "");
  const content = getCSSContent(element);
  if (content !== void 0) {
    tokens.push(content);
  } else {
    const assignedNodes = element.nodeName === "SLOT" ? element.assignedNodes() : [];
    if (assignedNodes.length) {
      for (const child of assignedNodes)
        visit(child, false);
    } else {
      for (let child = element.firstChild; child; child = child.nextSibling)
        visit(child, true);
      if (element.shadowRoot) {
        for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling)
          visit(child, true);
      }
      for (const owned of getIdRefs(element, element.getAttribute("aria-owns")))
        visit(owned, true);
    }
  }
  tokens.push(getCSSContent(element, "::after") || "");
  return { text: tokens.join(""), elements };
}
const kAriaSelectedRoles = ["gridcell", "option", "row", "tab", "rowheader", "columnheader", "treeitem"];
function getAriaSelected(element) {
  if (elementSafeTagName(element) === "OPTION")
    return element.selected;
  if (kAriaSelectedRoles.includes(getAriaRole(element) || ""))
    return getAriaBoolean(element.getAttribute("aria-selected")) === true;
  return false;
}
const kAriaCheckedRoles = ["checkbox", "menuitemcheckbox", "option", "radio", "switch", "menuitemradio", "treeitem"];
function getAriaChecked(element) {
  const result = getChecked(element, true);
  return result === "error" ? false : result;
}
function getCheckedAllowMixed(element) {
  return getChecked(element, true);
}
function getCheckedWithoutMixed(element) {
  const result = getChecked(element, false);
  return result;
}
function getChecked(element, allowMixed) {
  const tagName = elementSafeTagName(element);
  if (allowMixed && tagName === "INPUT" && element.indeterminate)
    return "mixed";
  if (tagName === "INPUT" && ["checkbox", "radio"].includes(element.type))
    return element.checked;
  if (kAriaCheckedRoles.includes(getAriaRole(element) || "")) {
    const checked = element.getAttribute("aria-checked");
    if (checked === "true")
      return true;
    if (allowMixed && checked === "mixed")
      return "mixed";
    return false;
  }
  return "error";
}
const kAriaReadonlyRoles = ["checkbox", "combobox", "grid", "gridcell", "listbox", "radiogroup", "slider", "spinbutton", "textbox", "columnheader", "rowheader", "searchbox", "switch", "treegrid"];
function getReadonly(element) {
  const tagName = elementSafeTagName(element);
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName))
    return element.hasAttribute("readonly");
  if (kAriaReadonlyRoles.includes(getAriaRole(element) || ""))
    return element.getAttribute("aria-readonly") === "true";
  if (element.isContentEditable)
    return false;
  return "error";
}
const kAriaPressedRoles = ["button"];
function getAriaPressed(element) {
  if (kAriaPressedRoles.includes(getAriaRole(element) || "")) {
    const pressed = element.getAttribute("aria-pressed");
    if (pressed === "true")
      return true;
    if (pressed === "mixed")
      return "mixed";
  }
  return false;
}
const kAriaExpandedRoles = ["application", "button", "checkbox", "combobox", "gridcell", "link", "listbox", "menuitem", "row", "rowheader", "tab", "treeitem", "columnheader", "menuitemcheckbox", "menuitemradio", "rowheader", "switch"];
function getAriaExpanded(element) {
  if (elementSafeTagName(element) === "DETAILS")
    return element.open;
  if (kAriaExpandedRoles.includes(getAriaRole(element) || "")) {
    const expanded = element.getAttribute("aria-expanded");
    if (expanded === null)
      return void 0;
    if (expanded === "true")
      return true;
    return false;
  }
  return void 0;
}
const kAriaLevelRoles = ["heading", "listitem", "row", "treeitem"];
function getAriaLevel(element) {
  const native = { "H1": 1, "H2": 2, "H3": 3, "H4": 4, "H5": 5, "H6": 6 }[elementSafeTagName(element)];
  if (native)
    return native;
  if (kAriaLevelRoles.includes(getAriaRole(element) || "")) {
    const attr = element.getAttribute("aria-level");
    const value = attr === null ? Number.NaN : Number(attr);
    if (Number.isInteger(value) && value >= 1)
      return value;
  }
  return 0;
}
const kAriaDisabledRoles = ["application", "button", "composite", "gridcell", "group", "input", "link", "menuitem", "scrollbar", "separator", "tab", "checkbox", "columnheader", "combobox", "grid", "listbox", "menu", "menubar", "menuitemcheckbox", "menuitemradio", "option", "radio", "radiogroup", "row", "rowheader", "searchbox", "select", "slider", "spinbutton", "switch", "tablist", "textbox", "toolbar", "tree", "treegrid", "treeitem"];
function getAriaDisabled(element) {
  return isNativelyDisabled(element) || hasExplicitAriaDisabled(element);
}
function isNativelyDisabled(element) {
  const isNativeFormControl = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION", "OPTGROUP"].includes(elementSafeTagName(element));
  return isNativeFormControl && (element.hasAttribute("disabled") || belongsToDisabledOptGroup(element) || belongsToDisabledFieldSet(element));
}
function belongsToDisabledOptGroup(element) {
  return elementSafeTagName(element) === "OPTION" && !!element.closest("OPTGROUP[DISABLED]");
}
function belongsToDisabledFieldSet(element) {
  const fieldSetElement = element?.closest("FIELDSET[DISABLED]");
  if (!fieldSetElement)
    return false;
  const legendElement = fieldSetElement.querySelector(":scope > LEGEND");
  return !legendElement || !legendElement.contains(element);
}
function hasExplicitAriaDisabled(element) {
  if (!kAriaDisabledRoles.includes(getAriaRole(element) || ""))
    return false;
  return hasAriaDisabledInChain(element);
}
function hasAriaDisabledInChain(element) {
  let result = cacheAriaDisabled?.get(element);
  if (result === void 0) {
    const attribute = (element.getAttribute("aria-disabled") || "").toLowerCase();
    if (attribute === "true") {
      result = true;
    } else if (attribute === "false") {
      result = false;
    } else {
      const parent = parentElementOrShadowHost(element);
      result = parent ? hasAriaDisabledInChain(parent) : false;
    }
    cacheAriaDisabled?.set(element, result);
  }
  return result;
}
function getAccessibleNameFromAssociatedLabels(labels, options) {
  return joinCompositeString([...labels].map((label) => getTextAlternativeInternal(label, {
    ...options,
    embeddedInLabel: { element: label, hidden: isElementHiddenForAria(label) },
    embeddedInNativeTextAlternative: void 0,
    embeddedInLabelledBy: void 0,
    embeddedInDescribedBy: void 0,
    embeddedInTargetElement: void 0
  })).filter((accessibleName) => !!accessibleName.text), " ", options.collectElements);
}
function receivesPointerEvents(element) {
  const cache = cachePointerEvents;
  let e = element;
  let result;
  const parents = [];
  for (; e; e = parentElementOrShadowHost(e)) {
    const cached = cache.get(e);
    if (cached !== void 0) {
      result = cached;
      break;
    }
    parents.push(e);
    const style = getElementComputedStyle(e);
    if (!style) {
      result = true;
      break;
    }
    const value = style.pointerEvents;
    if (value) {
      result = value !== "none";
      break;
    }
  }
  if (result === void 0)
    result = true;
  for (const parent of parents)
    cache.set(parent, result);
  return result;
}
let cacheAccessibleName;
let cacheAccessibleNameHidden;
let cacheAccessibleNameText;
let cacheAccessibleNameTextHidden;
let cacheAccessibleDescription;
let cacheAccessibleDescriptionHidden;
let cacheAccessibleErrorMessage;
let cacheIsHidden;
let cachePseudoContent;
let cachePseudoContentBefore;
let cachePseudoContentAfter;
let cachePointerEvents;
let cacheAriaRole;
let cacheAriaDisabled;
let cachesCounter = 0;
function beginAriaCaches() {
  beginDOMCaches();
  ++cachesCounter;
  cacheAriaRole ??= /* @__PURE__ */ new Map();
  cacheAriaDisabled ??= /* @__PURE__ */ new Map();
  cacheAccessibleName ??= /* @__PURE__ */ new Map();
  cacheAccessibleNameHidden ??= /* @__PURE__ */ new Map();
  cacheAccessibleNameText ??= /* @__PURE__ */ new Map();
  cacheAccessibleNameTextHidden ??= /* @__PURE__ */ new Map();
  cacheAccessibleDescription ??= /* @__PURE__ */ new Map();
  cacheAccessibleDescriptionHidden ??= /* @__PURE__ */ new Map();
  cacheAccessibleErrorMessage ??= /* @__PURE__ */ new Map();
  cacheIsHidden ??= /* @__PURE__ */ new Map();
  cachePseudoContent ??= /* @__PURE__ */ new Map();
  cachePseudoContentBefore ??= /* @__PURE__ */ new Map();
  cachePseudoContentAfter ??= /* @__PURE__ */ new Map();
  cachePointerEvents ??= /* @__PURE__ */ new Map();
}
function endAriaCaches() {
  if (!--cachesCounter) {
    cacheAccessibleName = void 0;
    cacheAccessibleNameHidden = void 0;
    cacheAccessibleNameText = void 0;
    cacheAccessibleNameTextHidden = void 0;
    cacheAccessibleDescription = void 0;
    cacheAccessibleDescriptionHidden = void 0;
    cacheAccessibleErrorMessage = void 0;
    cacheIsHidden = void 0;
    cachePseudoContent = void 0;
    cachePseudoContentBefore = void 0;
    cachePseudoContentAfter = void 0;
    cachePointerEvents = void 0;
    cacheAriaRole = void 0;
    cacheAriaDisabled = void 0;
  }
  endDOMCaches();
}
const inputTypeToRole = {
  "button": "button",
  "checkbox": "checkbox",
  "image": "button",
  "number": "spinbutton",
  "radio": "radio",
  "range": "slider",
  "reset": "button",
  "submit": "button"
};
function emptyCompositeString() {
  return { text: "" };
}
function compositeString(text, element, collectElements) {
  const elements = text && collectElements ? /* @__PURE__ */ new Set([element]) : void 0;
  return { text: text || "", elements };
}
function joinCompositeString(parts, separator, collectElements) {
  let elements;
  if (collectElements) {
    elements = /* @__PURE__ */ new Set();
    for (const part of parts) {
      for (const element of part.elements || [])
        elements.add(element);
    }
  }
  return { text: parts.map((part) => part.text).join(separator), elements };
}
export {
  beginAriaCaches,
  endAriaCaches,
  getAriaChecked,
  getAriaDisabled,
  getAriaExpanded,
  getAriaInvalid,
  getAriaLabelledByElements,
  getAriaLevel,
  getAriaPressed,
  getAriaRole,
  getAriaSelected,
  getCSSContent,
  getCheckedAllowMixed,
  getCheckedWithoutMixed,
  getElementAccessibleDescription,
  getElementAccessibleErrorMessage,
  getElementAccessibleName,
  getElementAccessibleNameText,
  getReadonly,
  isElementHiddenForAria,
  isElementIgnoredForAria,
  kAriaCheckedRoles,
  kAriaDisabledRoles,
  kAriaExpandedRoles,
  kAriaInvalidRoles,
  kAriaLevelRoles,
  kAriaPressedRoles,
  kAriaSelectedRoles,
  receivesPointerEvents
};

//# sourceMappingURL=roleUtils.mjs.map
