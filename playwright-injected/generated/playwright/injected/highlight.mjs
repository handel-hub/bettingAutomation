import { asLocator } from "../isomorphic/locatorGenerators.mjs";
import { stringifySelector } from "../isomorphic/selectorParser.mjs";
import highlightCSS from "./highlight.css.mjs";
class Highlight {
  _glassPaneElement;
  _glassPaneShadow;
  _renderedEntries = [];
  _actionPointElement;
  _actionCursorElement;
  _titleElement;
  _userOverlayContainer;
  _userOverlays = /* @__PURE__ */ new Map();
  _userOverlayHidden = false;
  _isUnderTest;
  _injectedScript;
  _rafRequest;
  _language = "javascript";
  _elementHighlightSelectors = /* @__PURE__ */ new Map();
  constructor(injectedScript) {
    this._injectedScript = injectedScript;
    const document = injectedScript.document;
    this._isUnderTest = injectedScript.isUnderTest;
    this._glassPaneElement = document.createElement("x-pw-glass");
    this._glassPaneElement.setAttribute("popover", "manual");
    this._glassPaneElement.style.inset = "0";
    this._glassPaneElement.style.width = "100%";
    this._glassPaneElement.style.height = "100%";
    this._glassPaneElement.style.maxWidth = "none";
    this._glassPaneElement.style.maxHeight = "none";
    this._glassPaneElement.style.padding = "0";
    this._glassPaneElement.style.margin = "0";
    this._glassPaneElement.style.border = "none";
    this._glassPaneElement.style.overflow = "visible";
    this._glassPaneElement.style.pointerEvents = "none";
    this._glassPaneElement.style.display = "flex";
    this._glassPaneElement.style.backgroundColor = "transparent";
    this._actionPointElement = document.createElement("x-pw-action-point");
    this._actionPointElement.setAttribute("hidden", "true");
    this._actionCursorElement = document.createElement("x-pw-action-cursor");
    this._actionCursorElement.style.visibility = "hidden";
    this._actionCursorElement.appendChild(this._createCursorSvg(document));
    this._titleElement = document.createElement("x-pw-title");
    this._titleElement.setAttribute("hidden", "true");
    this._userOverlayContainer = document.createElement("x-pw-user-overlays");
    this._userOverlayContainer.setAttribute("hidden", "true");
    this._glassPaneShadow = this._glassPaneElement.attachShadow({ mode: this._isUnderTest ? "open" : "closed" });
    if (typeof this._glassPaneShadow.adoptedStyleSheets.push === "function") {
      const sheet = new this._injectedScript.window.CSSStyleSheet();
      sheet.replaceSync(highlightCSS);
      this._glassPaneShadow.adoptedStyleSheets.push(sheet);
    } else {
      const styleElement = this._injectedScript.document.createElement("style");
      styleElement.textContent = highlightCSS;
      this._glassPaneShadow.appendChild(styleElement);
    }
    this._glassPaneShadow.appendChild(this._actionPointElement);
    this._glassPaneShadow.appendChild(this._actionCursorElement);
    this._glassPaneShadow.appendChild(this._titleElement);
    this._glassPaneShadow.appendChild(this._userOverlayContainer);
  }
  install() {
    if (!this._injectedScript.document.documentElement)
      return;
    if (!this._injectedScript.document.documentElement.contains(this._glassPaneElement) || this._glassPaneElement.nextElementSibling)
      this._injectedScript.document.documentElement.appendChild(this._glassPaneElement);
    this._bringToFront();
  }
  _bringToFront() {
    this._glassPaneElement.hidePopover();
    this._glassPaneElement.showPopover();
  }
  setLanguage(language) {
    this._language = language;
  }
  addElementHighlight(selector, cssStyle) {
    const key = stringifySelector(selector);
    this._elementHighlightSelectors.set(key, { selector, cssStyle });
    this._ensureElementHighlightRaf();
  }
  removeElementHighlight(selector) {
    const key = stringifySelector(selector);
    if (!this._elementHighlightSelectors.delete(key))
      return;
    if (this._elementHighlightSelectors.size === 0) {
      if (this._rafRequest) {
        this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest);
        this._rafRequest = void 0;
      }
      this.clearHighlight();
    }
  }
  _ensureElementHighlightRaf() {
    if (this._rafRequest)
      return;
    const tick = () => {
      const entries = [];
      for (const { selector, cssStyle } of this._elementHighlightSelectors.values()) {
        const elements = this._injectedScript.querySelectorAll(selector, this._injectedScript.document.documentElement);
        const locator = asLocator(this._language, stringifySelector(selector));
        const color = elements.length > 1 ? "#f6b26b7f" : "#6fa8dc7f";
        for (let i = 0; i < elements.length; ++i) {
          const suffix = elements.length > 1 ? ` [${i + 1} of ${elements.length}]` : "";
          entries.push({ element: elements[i], color, tooltipText: locator + suffix, cssStyle });
        }
      }
      this.updateHighlight(entries);
      this._rafRequest = this._injectedScript.utils.builtins.requestAnimationFrame(tick);
    };
    this._rafRequest = this._injectedScript.utils.builtins.requestAnimationFrame(tick);
  }
  uninstall() {
    if (this._rafRequest) {
      this._injectedScript.utils.builtins.cancelAnimationFrame(this._rafRequest);
      this._rafRequest = void 0;
    }
    this._elementHighlightSelectors.clear();
    this._glassPaneElement.remove();
  }
  showActionPoint(x, y, fadeDuration) {
    this._actionPointElement.style.top = y + "px";
    this._actionPointElement.style.left = x + "px";
    this._actionPointElement.hidden = false;
    if (fadeDuration)
      this._actionPointElement.style.animation = `pw-fade-out ${fadeDuration}ms ease-out forwards`;
    else
      this._actionPointElement.style.animation = "";
  }
  hideActionPoint() {
    this._actionPointElement.hidden = true;
  }
  moveActionCursor(x, y, fadeDuration) {
    const moveDuration = fadeDuration ? Math.max(80, Math.min(fadeDuration * 0.6, 400)) : 0;
    this._actionCursorElement.style.transition = `top ${moveDuration}ms ease, left ${moveDuration}ms ease`;
    this._actionCursorElement.style.left = x + "px";
    this._actionCursorElement.style.top = y + "px";
    this._actionCursorElement.style.visibility = "visible";
  }
  hideActionCursor() {
    this._actionCursorElement.style.visibility = "hidden";
  }
  _createCursorSvg(document) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 18 22");
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", "M1 1 L1 17 L5.5 13 L8 20.5 L11 19.5 L8.5 12 L15 12 Z");
    path.setAttribute("fill", "white");
    path.setAttribute("stroke", "black");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }
  showActionTitle(text, fadeDuration, position, fontSize) {
    this._titleElement.textContent = text;
    this._titleElement.hidden = false;
    if (fadeDuration) {
      const fadeTime = fadeDuration / 4;
      this._titleElement.style.animation = `pw-fade-out ${fadeTime}ms ease-out ${fadeDuration - fadeTime}ms forwards`;
    } else {
      this._titleElement.style.animation = "";
    }
    this._titleElement.style.top = "";
    this._titleElement.style.bottom = "";
    this._titleElement.style.left = "";
    this._titleElement.style.right = "";
    this._titleElement.style.transform = "";
    switch (position) {
      case "top-left":
        this._titleElement.style.top = "6px";
        this._titleElement.style.left = "6px";
        break;
      case "top":
        this._titleElement.style.top = "6px";
        this._titleElement.style.left = "50%";
        this._titleElement.style.transform = "translateX(-50%)";
        break;
      case "bottom-left":
        this._titleElement.style.bottom = "6px";
        this._titleElement.style.left = "6px";
        break;
      case "bottom":
        this._titleElement.style.bottom = "6px";
        this._titleElement.style.left = "50%";
        this._titleElement.style.transform = "translateX(-50%)";
        break;
      case "bottom-right":
        this._titleElement.style.bottom = "6px";
        this._titleElement.style.right = "6px";
        break;
      case "top-right":
      default:
        this._titleElement.style.top = "6px";
        this._titleElement.style.right = "6px";
        break;
    }
    if (fontSize)
      this._titleElement.style.fontSize = fontSize + "px";
  }
  hideActionTitle() {
    this._titleElement.hidden = true;
  }
  addUserOverlay(id, html) {
    const element = this._injectedScript.document.createElement("div");
    element.className = "x-pw-user-overlay";
    element.innerHTML = html;
    for (const script of element.querySelectorAll("script"))
      script.remove();
    for (const el of element.querySelectorAll("*")) {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith("on"))
          el.removeAttribute(attr.name);
      }
    }
    this._userOverlays.set(id, element);
    this._userOverlayContainer.appendChild(element);
    this._userOverlayContainer.hidden = this._userOverlayHidden;
    return id;
  }
  getUserOverlay(id) {
    return this._userOverlays.get(id);
  }
  removeUserOverlay(id) {
    const element = this._userOverlays.get(id);
    if (element) {
      element.remove();
      this._userOverlays.delete(id);
    }
    if (this._userOverlays.size === 0)
      this._userOverlayContainer.hidden = true;
  }
  setUserOverlaysVisible(visible) {
    this._userOverlayHidden = !visible;
    this._userOverlayContainer.hidden = !visible || this._userOverlays.size === 0;
  }
  clearHighlight() {
    for (const entry of this._renderedEntries) {
      entry.highlightElement?.remove();
      entry.tooltipElement?.remove();
    }
    this._renderedEntries = [];
  }
  addMaskedElements(elements, color) {
    const existingEntries = this._renderedEntries.map((e) => ({ element: e.targetElement, color: e.color }));
    const newEntries = elements.map((element) => ({ element, color }));
    this.updateHighlight([...existingEntries, ...newEntries]);
  }
  updateHighlight(entries) {
    if (this._highlightIsUpToDate(entries))
      return;
    this.clearHighlight();
    for (const entry of entries) {
      const highlightElement = this._createHighlightElement();
      this._glassPaneShadow.appendChild(highlightElement);
      let tooltipElement;
      if (entry.tooltipText) {
        tooltipElement = this._injectedScript.document.createElement("x-pw-tooltip");
        this._glassPaneShadow.appendChild(tooltipElement);
        tooltipElement.style.top = "0";
        tooltipElement.style.left = "0";
        tooltipElement.style.display = "flex";
        const lineElement = this._injectedScript.document.createElement("x-pw-tooltip-line");
        lineElement.textContent = entry.tooltipText;
        tooltipElement.appendChild(lineElement);
      }
      this._renderedEntries.push({ targetElement: entry.element, box: toDOMRect(entry.box), color: entry.color, borderColor: entry.borderColor, fadeDuration: entry.fadeDuration, cssStyle: entry.cssStyle, tooltipElement, highlightElement });
    }
    for (const entry of this._renderedEntries) {
      if (!entry.box && !entry.targetElement)
        continue;
      entry.box = entry.box || entry.targetElement.getBoundingClientRect();
      if (!entry.tooltipElement)
        continue;
      const { anchorLeft, anchorTop } = this.tooltipPosition(entry.box, entry.tooltipElement);
      entry.tooltipTop = anchorTop;
      entry.tooltipLeft = anchorLeft;
    }
    for (const entry of this._renderedEntries) {
      if (entry.tooltipElement) {
        entry.tooltipElement.style.top = entry.tooltipTop + "px";
        entry.tooltipElement.style.left = entry.tooltipLeft + "px";
      }
      const box = entry.box;
      entry.highlightElement.style.backgroundColor = entry.color;
      entry.highlightElement.style.left = box.x + "px";
      entry.highlightElement.style.top = box.y + "px";
      entry.highlightElement.style.width = box.width + "px";
      entry.highlightElement.style.height = box.height + "px";
      entry.highlightElement.style.display = "block";
      if (entry.borderColor)
        entry.highlightElement.style.border = "2px solid " + entry.borderColor;
      if (entry.fadeDuration)
        entry.highlightElement.style.animation = `pw-fade-out ${entry.fadeDuration}ms ease-out forwards`;
      if (entry.cssStyle)
        entry.highlightElement.style.cssText += ";" + entry.cssStyle;
      if (this._isUnderTest)
        console.error("Highlight box for test: " + JSON.stringify({ x: box.x, y: box.y, width: box.width, height: box.height }));
    }
  }
  firstBox() {
    return this._renderedEntries[0]?.box;
  }
  firstTooltipBox() {
    const entry = this._renderedEntries[0];
    if (!entry || !entry.tooltipElement || entry.tooltipLeft === void 0 || entry.tooltipTop === void 0)
      return;
    return {
      x: entry.tooltipLeft,
      y: entry.tooltipTop,
      left: entry.tooltipLeft,
      top: entry.tooltipTop,
      width: entry.tooltipElement.offsetWidth,
      height: entry.tooltipElement.offsetHeight,
      bottom: entry.tooltipTop + entry.tooltipElement.offsetHeight,
      right: entry.tooltipLeft + entry.tooltipElement.offsetWidth,
      toJSON: () => {
      }
    };
  }
  // Note: there is a copy of this method in dialog.tsx. Please fix bugs in both places.
  tooltipPosition(box, tooltipElement) {
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;
    const totalWidth = this._glassPaneElement.offsetWidth;
    const totalHeight = this._glassPaneElement.offsetHeight;
    let anchorLeft = Math.max(5, box.left);
    if (anchorLeft + tooltipWidth > totalWidth - 5)
      anchorLeft = totalWidth - tooltipWidth - 5;
    let anchorTop = Math.max(0, box.bottom) + 5;
    if (anchorTop + tooltipHeight > totalHeight - 5) {
      if (Math.max(0, box.top) > tooltipHeight + 5) {
        anchorTop = Math.max(0, box.top) - tooltipHeight - 5;
      } else {
        anchorTop = totalHeight - 5 - tooltipHeight;
      }
    }
    return { anchorLeft, anchorTop };
  }
  _highlightIsUpToDate(entries) {
    if (entries.length !== this._renderedEntries.length)
      return false;
    for (let i = 0; i < this._renderedEntries.length; ++i) {
      if (entries[i].element !== this._renderedEntries[i].targetElement)
        return false;
      if (entries[i].color !== this._renderedEntries[i].color)
        return false;
      if (entries[i].cssStyle !== this._renderedEntries[i].cssStyle)
        return false;
      const oldBox = this._renderedEntries[i].box;
      if (!oldBox)
        return false;
      const box = entries[i].box ? toDOMRect(entries[i].box) : entries[i].element.getBoundingClientRect();
      if (box.top !== oldBox.top || box.right !== oldBox.right || box.bottom !== oldBox.bottom || box.left !== oldBox.left)
        return false;
    }
    return true;
  }
  _createHighlightElement() {
    return this._injectedScript.document.createElement("x-pw-highlight");
  }
  appendChild(element) {
    this._glassPaneShadow.appendChild(element);
  }
  onGlassPaneClick(handler) {
    this._glassPaneElement.style.pointerEvents = "auto";
    this._glassPaneElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    this._glassPaneElement.addEventListener("click", handler);
  }
  offGlassPaneClick(handler) {
    this._glassPaneElement.style.pointerEvents = "none";
    this._glassPaneElement.style.backgroundColor = "transparent";
    this._glassPaneElement.removeEventListener("click", handler);
  }
}
function toDOMRect(box) {
  if (!box)
    return void 0;
  return new DOMRect(box.x, box.y, box.width, box.height);
}
export {
  Highlight
};

//# sourceMappingURL=highlight.mjs.map
