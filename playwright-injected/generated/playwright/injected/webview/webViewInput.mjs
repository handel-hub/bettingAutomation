const kTrustedSynthetic = "__pwTrustedSynthetic";
function markAndDispatch(node, event) {
  Object.defineProperty(event, kTrustedSynthetic, { value: true });
  return node.dispatchEvent(event);
}
function isFrameOwner(element) {
  return !!element && (element.localName === "iframe" || element.localName === "frame");
}
const kNamedKeyIdentifiers = {
  8: "U+0008",
  // Backspace
  9: "U+0009",
  // Tab
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  27: "U+001B",
  // Escape
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "Left",
  38: "Up",
  39: "Right",
  40: "Down",
  45: "Insert",
  46: "U+007F"
  // Delete
};
function keyIdentifierFor(keyCode, key) {
  const named = kNamedKeyIdentifiers[keyCode];
  if (named !== void 0)
    return named;
  if (keyCode >= 112 && keyCode <= 135)
    return "F" + (keyCode - 111);
  if (key.length === 1)
    return "U+" + key.toUpperCase().charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
  return "";
}
function dispatchKeyEvent(node, type, init, keyCode, key) {
  const event = new KeyboardEvent(type, init);
  Object.defineProperty(event, "keyIdentifier", { value: keyIdentifierFor(keyCode, key), configurable: true });
  return markAndDispatch(node, event);
}
class WebViewInput {
  _window;
  _document;
  _hoverTarget = null;
  _setTimeout;
  constructor(window, document) {
    this._window = window;
    this._document = document;
    this._setTimeout = (window.__pwSnapshotGlobals || window).setTimeout;
  }
  // Run each event in its own task (like real input).
  _postTask(task) {
    return new Promise((resolve) => {
      this._setTimeout.call(this._window, () => {
        try {
          task();
        } finally {
          resolve();
        }
      });
    });
  }
  // Descend through open shadow roots so synthetic events land on the actual
  // element under the pointer rather than on the shadow host.
  _deepElementFromPoint(x, y) {
    let el = this._document.elementFromPoint(x, y);
    while (el && el.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el)
        break;
      el = inner;
    }
    return el;
  }
  positionInIFrame(x, y) {
    const target = this._deepElementFromPoint(x, y);
    if (!isFrameOwner(target))
      return { iframe: null, x, y };
    const frameRect = target.getBoundingClientRect();
    const frameStyle = this._window.getComputedStyle(target);
    return {
      iframe: target,
      x: x - frameRect.left - parseFloat(frameStyle.borderLeftWidth) - parseFloat(frameStyle.paddingLeft),
      y: y - frameRect.top - parseFloat(frameStyle.borderTopWidth) - parseFloat(frameStyle.paddingTop)
    };
  }
  // The focused element may live inside one or more shadow roots, where
  // document.activeElement only reports the outermost shadow host.
  _deepActiveElement() {
    let active = this._document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement)
      active = active.shadowRoot.activeElement;
    return active;
  }
  activeIFrame() {
    const active = this._deepActiveElement();
    return isFrameOwner(active) ? active : null;
  }
  _insertText(target, text) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.value = target.value.slice(0, start) + text + target.value.slice(end);
      const pos = start + text.length;
      try {
        target.setSelectionRange(pos, pos);
      } catch {
      }
      target.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: false, data: text, inputType: "insertText" }));
    } else if (target && target.isContentEditable) {
      this._document.execCommand("insertText", false, text);
    }
  }
  keydown(params) {
    const target = this._deepActiveElement() || this._document.body;
    if (!target)
      return Promise.resolve();
    const init = {
      bubbles: true,
      cancelable: true,
      view: this._window,
      code: params.code,
      key: params.key,
      keyCode: params.keyCode,
      which: params.keyCode,
      location: params.location,
      repeat: params.repeat,
      ctrlKey: params.ctrlKey,
      shiftKey: params.shiftKey,
      altKey: params.altKey,
      metaKey: params.metaKey
    };
    let notPrevented = true;
    let charNotPrevented = true;
    let lastTask = this._postTask(() => {
      notPrevented = dispatchKeyEvent(target, "keydown", init, params.keyCode, params.key);
    });
    if (params.text !== void 0) {
      const text = params.text;
      void this._postTask(() => {
        if (!notPrevented)
          return;
        const charCode = text.charCodeAt(0);
        charNotPrevented = markAndDispatch(target, new KeyboardEvent("keypress", { ...init, charCode, keyCode: charCode, which: charCode }));
      });
      lastTask = this._postTask(() => {
        if (!notPrevented || !charNotPrevented)
          return;
        this._dispatchTextInput(target, text === "\r" ? "\n" : text);
      });
    }
    return lastTask;
  }
  _dispatchTextInput(target, text) {
    const event = this._document.createEvent("TextEvent");
    event.initTextEvent("textInput", true, true, this._window, text);
    markAndDispatch(target, event);
  }
  keyup(params) {
    const target = this._deepActiveElement() || this._document.body;
    if (!target)
      return Promise.resolve();
    return this._postTask(() => {
      dispatchKeyEvent(target, "keyup", {
        bubbles: true,
        cancelable: true,
        view: this._window,
        code: params.code,
        key: params.key,
        keyCode: params.keyCode,
        which: params.keyCode,
        location: params.location,
        ctrlKey: params.ctrlKey,
        shiftKey: params.shiftKey,
        altKey: params.altKey,
        metaKey: params.metaKey
      }, params.keyCode, params.key);
    });
  }
  insertText(text) {
    return this._postTask(() => this._insertText(this._deepActiveElement(), text));
  }
  mouseMove(params) {
    const target = this._deepElementFromPoint(params.x, params.y) || this._document.documentElement;
    const base = {
      bubbles: true,
      cancelable: true,
      view: this._window,
      clientX: params.x,
      clientY: params.y,
      screenX: params.x,
      screenY: params.y,
      button: params.button,
      buttons: params.buttons,
      ctrlKey: params.ctrlKey,
      shiftKey: params.shiftKey,
      altKey: params.altKey,
      metaKey: params.metaKey
    };
    const pointer = { ...base, pointerId: 1, pointerType: "mouse", isPrimary: true };
    let lastTask = Promise.resolve();
    const prev = this._hoverTarget;
    if (prev !== target) {
      if (prev && prev.isConnected) {
        void this._postTask(() => markAndDispatch(prev, new PointerEvent("pointerout", { ...pointer, relatedTarget: target })));
        void this._postTask(() => markAndDispatch(prev, new MouseEvent("mouseout", { ...base, relatedTarget: target })));
        void this._postTask(() => markAndDispatch(prev, new PointerEvent("pointerleave", { ...pointer, bubbles: false, cancelable: false, relatedTarget: target })));
        void this._postTask(() => markAndDispatch(prev, new MouseEvent("mouseleave", { ...base, bubbles: false, cancelable: false, relatedTarget: target })));
      }
      void this._postTask(() => markAndDispatch(target, new PointerEvent("pointerover", { ...pointer, relatedTarget: prev })));
      void this._postTask(() => markAndDispatch(target, new MouseEvent("mouseover", { ...base, relatedTarget: prev })));
      void this._postTask(() => markAndDispatch(target, new PointerEvent("pointerenter", { ...pointer, bubbles: false, cancelable: false, relatedTarget: prev })));
      lastTask = this._postTask(() => markAndDispatch(target, new MouseEvent("mouseenter", { ...base, bubbles: false, cancelable: false, relatedTarget: prev })));
      this._hoverTarget = target;
    }
    if (isFrameOwner(target))
      return lastTask;
    void this._postTask(() => markAndDispatch(target, new PointerEvent("pointermove", pointer)));
    return this._postTask(() => markAndDispatch(target, new MouseEvent("mousemove", base)));
  }
  clearHover() {
    const prev = this._hoverTarget;
    this._hoverTarget = null;
    if (!prev?.isConnected)
      return Promise.resolve();
    const base = { bubbles: true, cancelable: true, view: this._window, relatedTarget: null };
    const pointer = { ...base, pointerId: 1, pointerType: "mouse", isPrimary: true };
    void this._postTask(() => markAndDispatch(prev, new PointerEvent("pointerout", pointer)));
    void this._postTask(() => markAndDispatch(prev, new MouseEvent("mouseout", base)));
    void this._postTask(() => markAndDispatch(prev, new PointerEvent("pointerleave", { ...pointer, bubbles: false, cancelable: false })));
    return this._postTask(() => markAndDispatch(prev, new MouseEvent("mouseleave", { ...base, bubbles: false, cancelable: false })));
  }
  mouseEvent(params) {
    return this._postTask(() => {
      const target = this._deepElementFromPoint(params.x, params.y) || this._document.documentElement;
      markAndDispatch(target, new MouseEvent(params.type, {
        bubbles: true,
        cancelable: true,
        view: this._window,
        clientX: params.x,
        clientY: params.y,
        screenX: params.x,
        screenY: params.y,
        button: params.button,
        buttons: params.buttons,
        detail: params.clickCount,
        ctrlKey: params.ctrlKey,
        shiftKey: params.shiftKey,
        altKey: params.altKey,
        metaKey: params.metaKey
      }));
    });
  }
  wheel(params) {
    return this._postTask(() => {
      const target = this._deepElementFromPoint(params.x, params.y) || this._document.documentElement;
      markAndDispatch(target, new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        view: this._window,
        clientX: params.x,
        clientY: params.y,
        screenX: params.x,
        screenY: params.y,
        deltaX: params.deltaX,
        deltaY: params.deltaY,
        deltaMode: 0,
        ctrlKey: params.ctrlKey,
        shiftKey: params.shiftKey,
        altKey: params.altKey,
        metaKey: params.metaKey
      }));
      this._window.scrollBy(params.deltaX, params.deltaY);
    });
  }
  tap(params) {
    const target = this._deepElementFromPoint(params.x, params.y) || this._document.documentElement;
    const init = {
      bubbles: true,
      cancelable: true,
      view: this._window,
      clientX: params.x,
      clientY: params.y,
      screenX: params.x,
      screenY: params.y,
      ctrlKey: params.ctrlKey,
      shiftKey: params.shiftKey,
      altKey: params.altKey,
      metaKey: params.metaKey
    };
    try {
      const touch = new Touch({ identifier: 0, target, clientX: params.x, clientY: params.y, screenX: params.x, screenY: params.y, pageX: params.x + this._window.scrollX, pageY: params.y + this._window.scrollY, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 });
      void this._postTask(() => markAndDispatch(target, new TouchEvent("touchstart", { ...init, touches: [touch], targetTouches: [touch], changedTouches: [touch] })));
      void this._postTask(() => markAndDispatch(target, new TouchEvent("touchend", { ...init, touches: [], targetTouches: [], changedTouches: [touch] })));
    } catch {
    }
    void this._postTask(() => markAndDispatch(target, new MouseEvent("mousedown", { ...init, button: 0, buttons: 1, detail: 1 })));
    void this._postTask(() => markAndDispatch(target, new MouseEvent("mouseup", { ...init, button: 0, buttons: 0, detail: 1 })));
    return this._postTask(() => markAndDispatch(target, new MouseEvent("click", { ...init, button: 0, buttons: 0, detail: 1 })));
  }
}
var webViewInput_default = WebViewInput;
export {
  WebViewInput,
  webViewInput_default as default
};

//# sourceMappingURL=webViewInput.mjs.map
