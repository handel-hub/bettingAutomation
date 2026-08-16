import clipPaths from "./clipPaths.mjs";
const HighlightColors = {
  multiple: "#f6b26b7f",
  single: "#6fa8dc7f",
  assert: "#8acae480",
  action: "#dc6f6f7f"
};
class NoneTool {
}
class InspectTool {
  _recorder;
  _hoveredModel = null;
  _hoveredElement = null;
  _assertVisibility;
  constructor(recorder, assertVisibility) {
    this._recorder = recorder;
    this._assertVisibility = assertVisibility;
  }
  cursor() {
    return "pointer";
  }
  uninstall() {
    this._hoveredModel = null;
    this._hoveredElement = null;
  }
  onClick(event) {
    consumeEvent(event);
    if (event.button !== 0)
      return;
    if (this._hoveredModel?.selector)
      this._commit(this._hoveredModel.selector, this._hoveredModel);
  }
  onPointerDown(event) {
    consumeEvent(event);
  }
  onPointerUp(event) {
    consumeEvent(event);
  }
  onMouseDown(event) {
    consumeEvent(event);
  }
  onMouseUp(event) {
    consumeEvent(event);
  }
  onMouseMove(event) {
    consumeEvent(event);
    let target = this._recorder.deepEventTarget(event);
    if (!target.isConnected)
      target = null;
    if (this._hoveredElement === target)
      return;
    this._hoveredElement = target;
    let model = null;
    if (this._hoveredElement) {
      const generated = this._recorder.injectedScript.generateSelector(this._hoveredElement, { testIdAttributeName: this._recorder.state.testIdAttributeName });
      model = {
        selector: generated.selector,
        elements: generated.elements,
        tooltipText: this._recorder.injectedScript.utils.asLocator(this._recorder.state.language, generated.selector),
        color: this._assertVisibility ? HighlightColors.assert : HighlightColors.single
      };
    }
    if (this._hoveredModel?.selector === model?.selector)
      return;
    this._hoveredModel = model;
    this._recorder.updateHighlight(model, true);
  }
  onMouseEnter(event) {
    consumeEvent(event);
  }
  onMouseLeave(event) {
    consumeEvent(event);
    const window = this._recorder.injectedScript.window;
    if (window.top !== window && this._recorder.deepEventTarget(event).nodeType === Node.DOCUMENT_NODE)
      this._reset(true);
  }
  onKeyDown(event) {
    consumeEvent(event);
    if (event.key === "Escape") {
      if (this._assertVisibility)
        this._recorder.setMode("recording");
    }
  }
  onKeyUp(event) {
    consumeEvent(event);
  }
  onScroll(event) {
    this._reset(false);
  }
  _commit(selector, model) {
    if (this._assertVisibility) {
      void this._recorder.recordAction({
        name: "assertVisible",
        selector
      });
      this._recorder.setMode("recording");
      this._recorder.overlay?.flashToolSucceeded("assertingVisibility");
    } else {
      this._recorder.elementPicked(selector, model);
    }
  }
  _reset(userGesture) {
    this._hoveredElement = null;
    this._hoveredModel = null;
    this._recorder.updateHighlight(null, userGesture);
  }
}
class RecordActionTool {
  _recorder;
  _performingActions;
  _hoveredModel = null;
  _hoveredElement = null;
  _activeModel = null;
  _observer = null;
  _dialog;
  constructor(recorder) {
    this._recorder = recorder;
    this._performingActions = /* @__PURE__ */ new Set();
    this._dialog = new Dialog(recorder);
  }
  cursor() {
    return "pointer";
  }
  _installObserverIfNeeded() {
    if (this._observer)
      return;
    if (!this._recorder.injectedScript.document?.body)
      return;
    this._observer = new MutationObserver((mutations) => {
      if (!this._hoveredElement)
        return;
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (node === this._hoveredElement || node.contains(this._hoveredElement))
            this._resetHoveredModel();
        }
      }
    });
    this._observer.observe(this._recorder.injectedScript.document.body, { childList: true, subtree: true });
  }
  uninstall() {
    this._observer?.disconnect();
    this._observer = null;
    this._hoveredModel = null;
    this._hoveredElement = null;
    this._activeModel = null;
    this._dialog.close();
  }
  onClick(event) {
    if (this._dialog.isShowing()) {
      if (event.button === 2 && event.type === "auxclick") {
        consumeEvent(event);
      }
      return;
    }
    if (isRangeInput(this._hoveredElement))
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    if (event.button === 2 && event.type === "auxclick") {
      if (!this._performingActions.size)
        this._showActionListDialog(event);
      return;
    }
    if (event.detail === 0)
      return;
    const target = this._recorder.deepEventTarget(event);
    const checkbox = asCheckbox(target);
    if (checkbox && event.detail === 1) {
      this._recordAction({
        name: checkbox.checked ? "check" : "uncheck",
        selector: this._hoveredModel?.selector ?? this._selectorForElement(target)
      }, { autoExpect: true });
      return;
    }
    this._recordAction({
      name: "click",
      selector: this._hoveredModel?.selector ?? this._selectorForElement(target),
      position: positionForEvent(event),
      button: buttonForEvent(event),
      modifiers: modifiersForEvent(event),
      clickCount: event.detail
    }, { autoExpect: true });
  }
  onContextMenu(event) {
    if (this._dialog.isShowing()) {
      consumeEvent(event);
      return;
    }
    if (this._shouldIgnoreMouseEvent(event))
      return;
    if (this._performingActions.size) {
      const target = this._recorder.deepEventTarget(event);
      this._recordAction({
        name: "click",
        selector: this._hoveredModel?.selector ?? this._selectorForElement(target),
        position: positionForEvent(event),
        button: "right",
        modifiers: modifiersForEvent(event),
        clickCount: 1
      }, { autoExpect: true });
      return;
    }
    this._showActionListDialog(event);
  }
  onPointerDown(event) {
    if (this._dialog.isShowing())
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    this._consumeRightButtonEvent(event);
  }
  onPointerUp(event) {
    if (this._dialog.isShowing())
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    this._consumeRightButtonEvent(event);
  }
  onMouseDown(event) {
    if (this._dialog.isShowing())
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    this._consumeRightButtonEvent(event);
    this._activeModel = this._hoveredModel;
  }
  onMouseUp(event) {
    if (this._dialog.isShowing())
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    this._consumeRightButtonEvent(event);
  }
  onMouseMove(event) {
    if (this._dialog.isShowing())
      return;
    const target = this._recorder.deepEventTarget(event);
    if (this._hoveredElement === target)
      return;
    this._hoveredElement = target;
    this._updateModelForHoveredElement();
  }
  onMouseLeave(event) {
    if (this._dialog.isShowing())
      return;
    const window = this._recorder.injectedScript.window;
    if (window.top !== window && this._recorder.deepEventTarget(event).nodeType === Node.DOCUMENT_NODE) {
      this._hoveredElement = null;
      this._updateModelForHoveredElement();
    }
  }
  onFocus(event) {
    if (this._dialog.isShowing())
      return;
    this._onFocus(true);
  }
  onInput(event) {
    if (this._dialog.isShowing())
      return;
    const target = this._recorder.deepEventTarget(event);
    if (target.nodeName === "INPUT" && target.type.toLowerCase() === "file") {
      const selector = target === this._hoveredElement && this._hoveredModel ? this._hoveredModel.selector : this._selectorForElement(target);
      this._recordAction({
        name: "setInputFiles",
        selector,
        files: [...target.files || []].map((file) => file.name)
      });
      return;
    }
    if (isRangeInput(target)) {
      this._recordAction({
        name: "fill",
        // must use hoveredModel instead of activeModel for it to work in webkit
        selector: this._hoveredModel?.selector ?? this._selectorForElement(target),
        text: target.value
      });
      return;
    }
    if (["INPUT", "TEXTAREA"].includes(target.nodeName) || target.isContentEditable) {
      if (target.nodeName === "INPUT" && ["checkbox", "radio"].includes(target.type.toLowerCase())) {
        return;
      }
      const selector = target.isContentEditable ? this._selectorForElement(target, { noText: true }) : this._activeSelectorForEvent(event);
      this._recordAction({
        name: "fill",
        selector,
        text: target.isContentEditable ? target.innerText : target.value
      });
    }
    if (target.nodeName === "SELECT") {
      const selectElement = target;
      this._recordAction({
        name: "select",
        selector: this._activeSelectorForEvent(event),
        options: [...selectElement.selectedOptions].map((option) => option.value)
      });
    }
  }
  onKeyDown(event) {
    if (this._dialog.isShowing())
      return;
    if (!this._shouldGenerateKeyPressFor(event))
      return;
    if (event.key === " ") {
      const checkbox = asCheckbox(this._recorder.deepEventTarget(event));
      if (checkbox && event.detail === 0) {
        this._recordAction({
          name: checkbox.checked ? "uncheck" : "check",
          selector: this._activeSelectorForEvent(event)
        }, { autoExpect: true });
        return;
      }
    }
    this._recordAction({
      name: "press",
      selector: this._activeSelectorForEvent(event),
      key: event.key,
      modifiers: modifiersForEvent(event)
    }, { autoExpect: true });
  }
  onScroll(event) {
    if (this._dialog.isShowing())
      return;
    this._resetHoveredModel();
  }
  _showActionListDialog(event) {
    consumeEvent(event);
    const model = this._hoveredModel ?? this._modelForElement(this._recorder.deepEventTarget(event));
    if (!model)
      return;
    const actionPosition = positionForEvent(event);
    const actions = [
      {
        title: "Click",
        cb: () => this._performAction({
          name: "click",
          selector: model.selector,
          position: actionPosition,
          button: "left",
          modifiers: 0,
          clickCount: 1
        })
      },
      {
        title: "Right click",
        cb: () => this._performAction({
          name: "click",
          selector: model.selector,
          position: actionPosition,
          button: "right",
          modifiers: 0,
          clickCount: 1
        })
      },
      {
        title: "Double click",
        cb: () => this._performAction({
          name: "click",
          selector: model.selector,
          position: actionPosition,
          button: "left",
          modifiers: 0,
          clickCount: 2
        })
      },
      {
        title: "Hover",
        cb: () => this._recordAction({
          name: "hover",
          selector: model.selector,
          position: actionPosition
        })
      },
      {
        title: "Pick locator",
        cb: () => this._recorder.elementPicked(model.selector, model)
      }
    ];
    const listElement = this._recorder.document.createElement("x-pw-action-list");
    listElement.setAttribute("role", "list");
    listElement.setAttribute("aria-label", "Choose action");
    for (const action of actions) {
      const actionElement = this._recorder.document.createElement("x-pw-action-item");
      actionElement.setAttribute("role", "listitem");
      actionElement.textContent = action.title;
      actionElement.setAttribute("aria-label", action.title);
      actionElement.addEventListener("click", () => {
        this._dialog.close();
        action.cb();
      });
      listElement.appendChild(actionElement);
    }
    const dialogElement = this._dialog.show({
      label: "Choose action",
      body: listElement,
      autosize: true
    });
    const anchorBox = this._recorder.highlight.firstTooltipBox() || model.elements[0].getBoundingClientRect();
    const dialogPosition = this._recorder.highlight.tooltipPosition(anchorBox, dialogElement);
    this._dialog.moveTo(dialogPosition.anchorTop, dialogPosition.anchorLeft);
  }
  _resetHoveredModel() {
    this._hoveredModel = null;
    this._hoveredElement = null;
    this._updateHighlight(false);
  }
  _onFocus(userGesture) {
    const activeElement = deepActiveElement(this._recorder.document);
    if (userGesture && activeElement === this._recorder.document.body)
      return;
    const result = activeElement ? this._recorder.injectedScript.generateSelector(activeElement, { testIdAttributeName: this._recorder.state.testIdAttributeName }) : null;
    this._activeModel = result && result.selector ? { ...result, color: HighlightColors.action } : null;
    if (userGesture) {
      this._hoveredElement = activeElement;
      this._updateModelForHoveredElement();
    }
  }
  _shouldIgnoreMouseEvent(event) {
    return shouldIgnoreMouseEvent(this._recorder.deepEventTarget(event));
  }
  _consumeRightButtonEvent(event) {
    if (event.button === 2 && !this._performingActions.size)
      consumeEvent(event);
  }
  _selectorForElement(element, options) {
    return this._recorder.injectedScript.generateSelector(element, { ...options, testIdAttributeName: this._recorder.state.testIdAttributeName }).selector;
  }
  _modelForElement(element) {
    const { selector, elements } = this._recorder.injectedScript.generateSelector(element, { testIdAttributeName: this._recorder.state.testIdAttributeName });
    return selector ? { selector, elements, color: HighlightColors.action } : null;
  }
  _activeSelectorForEvent(event) {
    const target = this._recorder.deepEventTarget(event);
    if (this._activeModel && this._activeModel.elements[0] === target)
      return this._activeModel.selector;
    return this._selectorForElement(target);
  }
  _reportPerformedActionForTests() {
    if (!this._recorder.injectedScript.isUnderTest)
      return;
    console.error("Action performed for test: " + JSON.stringify({
      // eslint-disable-line no-console
      hovered: this._hoveredModel ? this._hoveredModel.selector : null,
      active: this._activeModel ? this._activeModel.selector : null
    }));
  }
  _recordAction(action, options) {
    void this._recorder.recordAction(action, options).then(() => this._reportPerformedActionForTests());
  }
  _performAction(action) {
    this._recorder.updateHighlight(null, false);
    this._performingActions.add(action);
    void this._recorder.performAction(action).finally(() => {
      this._performingActions.delete(action);
      this._onFocus(false);
    }).then(() => this._reportPerformedActionForTests());
  }
  _shouldGenerateKeyPressFor(event) {
    if (typeof event.key !== "string")
      return false;
    if (event.key === "Enter" && (this._recorder.deepEventTarget(event).nodeName === "TEXTAREA" || this._recorder.deepEventTarget(event).isContentEditable))
      return false;
    if (["Backspace", "Delete", "AltGraph"].includes(event.key))
      return false;
    if (event.key === "@" && event.code === "KeyL")
      return false;
    if (navigator.platform.includes("Mac")) {
      if (event.key === "v" && event.metaKey)
        return false;
    } else {
      if (event.key === "v" && event.ctrlKey)
        return false;
      if (event.key === "Insert" && event.shiftKey)
        return false;
    }
    if (["Shift", "Control", "Meta", "Alt", "Process"].includes(event.key))
      return false;
    const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (event.key.length === 1 && !hasModifier)
      return !!asCheckbox(this._recorder.deepEventTarget(event));
    return true;
  }
  _updateModelForHoveredElement() {
    this._installObserverIfNeeded();
    if (this._performingActions.size)
      return;
    if (!this._hoveredElement || !this._hoveredElement.isConnected) {
      this._hoveredModel = null;
      this._hoveredElement = null;
      this._updateHighlight(true);
      return;
    }
    const { selector, elements } = this._recorder.injectedScript.generateSelector(this._hoveredElement, { testIdAttributeName: this._recorder.state.testIdAttributeName });
    if (this._hoveredModel && this._hoveredModel.selector === selector)
      return;
    this._hoveredModel = selector ? { selector, elements, color: HighlightColors.action } : null;
    this._updateHighlight(true);
  }
  _updateHighlight(userGesture) {
    this._recorder.updateHighlight(this._hoveredModel, userGesture);
  }
}
class JsonRecordActionTool {
  _recorder;
  constructor(recorder) {
    this._recorder = recorder;
  }
  install() {
    this._recorder.highlight.uninstall();
  }
  uninstall() {
    this._recorder.highlight.install();
  }
  onClick(event) {
    const element = this._recorder.deepEventTarget(event);
    if (isRangeInput(element))
      return;
    if (event.button === 2 && event.type === "auxclick")
      return;
    if (this._shouldIgnoreMouseEvent(event))
      return;
    const checkbox = asCheckbox(element);
    const { ariaSnapshot, selector, ref } = this._ariaSnapshot(element);
    if (checkbox && event.detail === 1) {
      void this._recorder.recordAction({
        name: checkbox.checked ? "check" : "uncheck",
        selector,
        ref,
        ariaSnapshot
      });
      return;
    }
    void this._recorder.recordAction({
      name: "click",
      selector,
      ref,
      ariaSnapshot,
      position: positionForEvent(event),
      button: buttonForEvent(event),
      modifiers: modifiersForEvent(event),
      clickCount: event.detail
    });
  }
  onContextMenu(event) {
    const element = this._recorder.deepEventTarget(event);
    const { ariaSnapshot, selector, ref } = this._ariaSnapshot(element);
    void this._recorder.recordAction({
      name: "click",
      selector,
      ref,
      ariaSnapshot,
      position: positionForEvent(event),
      button: "right",
      modifiers: modifiersForEvent(event),
      clickCount: 1
    });
  }
  onInput(event) {
    const element = this._recorder.deepEventTarget(event);
    const { ariaSnapshot, selector, ref } = this._ariaSnapshot(element);
    if (isRangeInput(element)) {
      void this._recorder.recordAction({
        name: "fill",
        selector,
        ref,
        ariaSnapshot,
        text: element.value
      });
      return;
    }
    if (["INPUT", "TEXTAREA"].includes(element.nodeName) || element.isContentEditable) {
      if (element.nodeName === "INPUT" && ["checkbox", "radio"].includes(element.type.toLowerCase())) {
        return;
      }
      void this._recorder.recordAction({
        name: "fill",
        ref,
        selector,
        ariaSnapshot,
        text: element.isContentEditable ? element.innerText : element.value
      });
      return;
    }
    if (element.nodeName === "SELECT") {
      const selectElement = element;
      void this._recorder.recordAction({
        name: "select",
        selector,
        ref,
        ariaSnapshot,
        options: [...selectElement.selectedOptions].map((option) => option.value)
      });
      return;
    }
  }
  onKeyDown(event) {
    if (!this._shouldGenerateKeyPressFor(event))
      return;
    const element = this._recorder.deepEventTarget(event);
    const { ariaSnapshot, selector, ref } = this._ariaSnapshot(element);
    if (event.key === " ") {
      const checkbox = asCheckbox(element);
      if (checkbox && event.detail === 0) {
        void this._recorder.recordAction({
          name: checkbox.checked ? "uncheck" : "check",
          selector,
          ref,
          ariaSnapshot
        });
        return;
      }
    }
    void this._recorder.recordAction({
      name: "press",
      selector,
      ref,
      ariaSnapshot,
      key: event.key,
      modifiers: modifiersForEvent(event)
    });
  }
  _shouldIgnoreMouseEvent(event) {
    return shouldIgnoreMouseEvent(this._recorder.deepEventTarget(event));
  }
  _shouldGenerateKeyPressFor(event) {
    if (typeof event.key !== "string")
      return false;
    if (event.key === "Enter" && (this._recorder.deepEventTarget(event).nodeName === "TEXTAREA" || this._recorder.deepEventTarget(event).isContentEditable))
      return false;
    if (["Backspace", "Delete", "AltGraph"].includes(event.key))
      return false;
    if (event.key === "@" && event.code === "KeyL")
      return false;
    if (navigator.platform.includes("Mac")) {
      if (event.key === "v" && event.metaKey)
        return false;
    } else {
      if (event.key === "v" && event.ctrlKey)
        return false;
      if (event.key === "Insert" && event.shiftKey)
        return false;
    }
    if (["Shift", "Control", "Meta", "Alt", "Process"].includes(event.key))
      return false;
    const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
    if (event.key.length === 1 && !hasModifier)
      return !this._isEditable(this._recorder.deepEventTarget(event));
    return true;
  }
  _isEditable(element) {
    if (element.nodeName === "TEXTAREA" || element.nodeName === "INPUT")
      return true;
    if (element.isContentEditable)
      return true;
    return false;
  }
  _ariaSnapshot(element) {
    const { ariaSnapshot, refs } = this._recorder.injectedScript.ariaSnapshotForRecorder();
    const ref = element ? refs.get(element) : void 0;
    const elementInfo = element ? this._recorder.injectedScript.generateSelector(element, { testIdAttributeName: this._recorder.state.testIdAttributeName }) : void 0;
    return { ariaSnapshot, selector: elementInfo?.selector, ref };
  }
}
class TextAssertionTool {
  _recorder;
  _hoverHighlight = null;
  _action = null;
  _dialog;
  _textCache;
  _kind;
  constructor(recorder, kind) {
    this._recorder = recorder;
    this._textCache = /* @__PURE__ */ new Map();
    this._kind = kind;
    this._dialog = new Dialog(recorder);
  }
  cursor() {
    return "pointer";
  }
  uninstall() {
    this._dialog.close();
    this._hoverHighlight = null;
  }
  onClick(event) {
    consumeEvent(event);
    if (this._kind === "value") {
      this._commitAssertValue();
    } else {
      if (!this._dialog.isShowing())
        this._showDialog();
    }
  }
  onMouseDown(event) {
    const target = this._recorder.deepEventTarget(event);
    if (this._elementHasValue(target))
      event.preventDefault();
  }
  onPointerUp(event) {
    const target = this._hoverHighlight?.elements[0];
    if (this._kind === "value" && target && (target.nodeName === "INPUT" || target.nodeName === "SELECT") && target.disabled) {
      this._commitAssertValue();
    }
  }
  onMouseMove(event) {
    if (this._dialog.isShowing())
      return;
    const target = this._recorder.deepEventTarget(event);
    if (this._hoverHighlight?.elements[0] === target)
      return;
    if (this._kind === "text" || this._kind === "snapshot") {
      this._hoverHighlight = this._recorder.injectedScript.utils.elementText(this._textCache, target).full ? { elements: [target], selector: "", color: HighlightColors.assert } : null;
    } else if (this._elementHasValue(target)) {
      const generated = this._recorder.injectedScript.generateSelector(target, { testIdAttributeName: this._recorder.state.testIdAttributeName });
      this._hoverHighlight = { selector: generated.selector, elements: generated.elements, color: HighlightColors.assert };
    } else {
      this._hoverHighlight = null;
    }
    this._recorder.updateHighlight(this._hoverHighlight, true);
  }
  onKeyDown(event) {
    if (event.key === "Escape")
      this._recorder.setMode("recording");
    consumeEvent(event);
  }
  onScroll(event) {
    this._recorder.updateHighlight(this._hoverHighlight, false);
  }
  _elementHasValue(element) {
    return element.nodeName === "TEXTAREA" || element.nodeName === "SELECT" || element.nodeName === "INPUT" && !["button", "image", "reset", "submit"].includes(element.type);
  }
  _generateAction() {
    this._textCache.clear();
    const target = this._hoverHighlight?.elements[0];
    if (!target)
      return null;
    if (this._kind === "value") {
      if (!this._elementHasValue(target))
        return null;
      const { selector } = this._recorder.injectedScript.generateSelector(target, { testIdAttributeName: this._recorder.state.testIdAttributeName });
      if (target.nodeName === "INPUT" && ["checkbox", "radio"].includes(target.type.toLowerCase())) {
        return {
          name: "assertChecked",
          selector,
          // Interestingly, inputElement.checked is reversed inside this event handler.
          checked: !target.checked
        };
      } else {
        return {
          name: "assertValue",
          selector,
          value: target.value
        };
      }
    } else if (this._kind === "snapshot") {
      const generated = this._recorder.injectedScript.generateSelector(target, { testIdAttributeName: this._recorder.state.testIdAttributeName, forTextExpect: true });
      this._hoverHighlight = { selector: generated.selector, elements: generated.elements, color: HighlightColors.assert };
      this._recorder.updateHighlight(this._hoverHighlight, true);
      return {
        name: "assertSnapshot",
        selector: this._hoverHighlight.selector,
        ariaSnapshot: this._recorder.injectedScript.ariaSnapshot(target, { mode: "codegen" })
      };
    } else {
      const generated = this._recorder.injectedScript.generateSelector(target, { testIdAttributeName: this._recorder.state.testIdAttributeName, forTextExpect: true });
      this._hoverHighlight = { selector: generated.selector, elements: generated.elements, color: HighlightColors.assert };
      this._recorder.updateHighlight(this._hoverHighlight, true);
      return {
        name: "assertText",
        selector: this._hoverHighlight.selector,
        text: this._recorder.injectedScript.utils.elementText(this._textCache, target).normalized,
        substring: true
      };
    }
  }
  _renderValue(action) {
    if (action?.name === "assertText")
      return this._recorder.injectedScript.utils.normalizeWhiteSpace(action.text);
    if (action?.name === "assertChecked")
      return String(action.checked);
    if (action?.name === "assertValue")
      return action.value;
    if (action?.name === "assertSnapshot")
      return action.ariaSnapshot;
    return "";
  }
  _commit() {
    if (!this._action || !this._dialog.isShowing())
      return;
    this._dialog.close();
    void this._recorder.recordAction(this._action);
    this._recorder.setMode("recording");
  }
  _showDialog() {
    if (!this._hoverHighlight?.elements[0])
      return;
    this._action = this._generateAction();
    if (this._action?.name === "assertText") {
      this._showTextDialog(this._action);
    } else if (this._action?.name === "assertSnapshot") {
      void this._recorder.recordAction(this._action);
      this._recorder.setMode("recording");
      this._recorder.overlay?.flashToolSucceeded("assertingSnapshot");
    }
  }
  _showTextDialog(action) {
    const textElement = this._recorder.document.createElement("textarea");
    textElement.setAttribute("spellcheck", "false");
    textElement.value = this._renderValue(action);
    textElement.classList.add("text-editor");
    const updateAndValidate = () => {
      const newValue = this._recorder.injectedScript.utils.normalizeWhiteSpace(textElement.value);
      const target = this._hoverHighlight?.elements[0];
      if (!target)
        return;
      action.text = newValue;
      const targetText = this._recorder.injectedScript.utils.elementText(this._textCache, target).normalized;
      const matches = newValue && targetText.includes(newValue);
      textElement.classList.toggle("does-not-match", !matches);
    };
    textElement.addEventListener("input", updateAndValidate);
    const label = "Assert that element contains text";
    const dialogElement = this._dialog.show({
      label,
      body: textElement,
      onCommit: () => this._commit()
    });
    const position = this._recorder.highlight.tooltipPosition(this._recorder.highlight.firstBox(), dialogElement);
    this._dialog.moveTo(position.anchorTop, position.anchorLeft);
    textElement.focus();
  }
  _commitAssertValue() {
    if (this._kind !== "value")
      return;
    const action = this._generateAction();
    if (!action)
      return;
    void this._recorder.recordAction(action);
    this._recorder.setMode("recording");
    this._recorder.overlay?.flashToolSucceeded("assertingValue");
  }
}
class Overlay {
  _recorder;
  _listeners = [];
  _overlayElement;
  _dragHandle;
  _recordToggle;
  _pickLocatorToggle;
  _assertVisibilityToggle;
  _assertTextToggle;
  _assertValuesToggle;
  _assertSnapshotToggle;
  _offsetX = 0;
  _dragState;
  _measure = { width: 0, height: 0 };
  constructor(recorder) {
    this._recorder = recorder;
    const document = this._recorder.document;
    this._overlayElement = document.createElement("x-pw-overlay");
    const toolsListElement = document.createElement("x-pw-tools-list");
    this._overlayElement.appendChild(toolsListElement);
    this._dragHandle = document.createElement("x-pw-tool-gripper");
    this._dragHandle.appendChild(document.createElement("x-div"));
    toolsListElement.appendChild(this._dragHandle);
    this._recordToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._recordToggle.title = "Record";
    this._recordToggle.classList.add("record");
    this._recordToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._recordToggle);
    this._pickLocatorToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._pickLocatorToggle.title = "Pick locator";
    this._pickLocatorToggle.classList.add("pick-locator");
    this._pickLocatorToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._pickLocatorToggle);
    this._assertVisibilityToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._assertVisibilityToggle.title = "Assert visibility";
    this._assertVisibilityToggle.classList.add("visibility");
    this._assertVisibilityToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._assertVisibilityToggle);
    this._assertTextToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._assertTextToggle.title = "Assert text";
    this._assertTextToggle.classList.add("text");
    this._assertTextToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._assertTextToggle);
    this._assertValuesToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._assertValuesToggle.title = "Assert value";
    this._assertValuesToggle.classList.add("value");
    this._assertValuesToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._assertValuesToggle);
    this._assertSnapshotToggle = this._recorder.document.createElement("x-pw-tool-item");
    this._assertSnapshotToggle.title = "Assert snapshot";
    this._assertSnapshotToggle.classList.add("snapshot");
    this._assertSnapshotToggle.appendChild(this._recorder.document.createElement("x-div"));
    toolsListElement.appendChild(this._assertSnapshotToggle);
    this._updateVisualPosition();
    this._refreshListeners();
  }
  _refreshListeners() {
    removeEventListeners(this._listeners);
    this._listeners = [
      addEventListener(this._dragHandle, "mousedown", (event) => {
        this._dragState = { offsetX: this._offsetX, dragStart: { x: event.clientX, y: 0 } };
      }),
      addEventListener(this._recordToggle, "click", () => {
        if (this._recordToggle.classList.contains("disabled"))
          return;
        this._recorder.setMode(this._recorder.state.mode === "none" || this._recorder.state.mode === "standby" || this._recorder.state.mode === "inspecting" ? "recording" : "standby");
      }),
      addEventListener(this._pickLocatorToggle, "click", () => {
        if (this._pickLocatorToggle.classList.contains("disabled"))
          return;
        const newMode = {
          "inspecting": "standby",
          "none": "inspecting",
          "standby": "inspecting",
          "recording": "recording-inspecting",
          "recording-inspecting": "recording",
          "assertingText": "recording-inspecting",
          "assertingVisibility": "recording-inspecting",
          "assertingValue": "recording-inspecting",
          "assertingSnapshot": "recording-inspecting"
        };
        this._recorder.setMode(newMode[this._recorder.state.mode]);
      }),
      addEventListener(this._assertVisibilityToggle, "click", () => {
        if (!this._assertVisibilityToggle.classList.contains("disabled"))
          this._recorder.setMode(this._recorder.state.mode === "assertingVisibility" ? "recording" : "assertingVisibility");
      }),
      addEventListener(this._assertTextToggle, "click", () => {
        if (!this._assertTextToggle.classList.contains("disabled"))
          this._recorder.setMode(this._recorder.state.mode === "assertingText" ? "recording" : "assertingText");
      }),
      addEventListener(this._assertValuesToggle, "click", () => {
        if (!this._assertValuesToggle.classList.contains("disabled"))
          this._recorder.setMode(this._recorder.state.mode === "assertingValue" ? "recording" : "assertingValue");
      }),
      addEventListener(this._assertSnapshotToggle, "click", () => {
        if (!this._assertSnapshotToggle.classList.contains("disabled"))
          this._recorder.setMode(this._recorder.state.mode === "assertingSnapshot" ? "recording" : "assertingSnapshot");
      })
    ];
  }
  install() {
    this._recorder.highlight.appendChild(this._overlayElement);
    this._refreshListeners();
    this._updateVisualPosition();
  }
  contains(element) {
    return this._recorder.injectedScript.utils.isInsideScope(this._overlayElement, element);
  }
  setUIState(state) {
    const isRecording = state.mode === "recording" || state.mode === "assertingText" || state.mode === "assertingVisibility" || state.mode === "assertingValue" || state.mode === "assertingSnapshot" || state.mode === "recording-inspecting";
    this._recordToggle.classList.toggle("toggled", isRecording);
    this._recordToggle.title = isRecording ? "Stop Recording" : "Start Recording";
    this._pickLocatorToggle.classList.toggle("toggled", state.mode === "inspecting" || state.mode === "recording-inspecting");
    this._assertVisibilityToggle.classList.toggle("toggled", state.mode === "assertingVisibility");
    this._assertVisibilityToggle.classList.toggle("disabled", state.mode === "none" || state.mode === "standby" || state.mode === "inspecting");
    this._assertTextToggle.classList.toggle("toggled", state.mode === "assertingText");
    this._assertTextToggle.classList.toggle("disabled", state.mode === "none" || state.mode === "standby" || state.mode === "inspecting");
    this._assertValuesToggle.classList.toggle("toggled", state.mode === "assertingValue");
    this._assertValuesToggle.classList.toggle("disabled", state.mode === "none" || state.mode === "standby" || state.mode === "inspecting");
    this._assertSnapshotToggle.classList.toggle("toggled", state.mode === "assertingSnapshot");
    this._assertSnapshotToggle.classList.toggle("disabled", state.mode === "none" || state.mode === "standby" || state.mode === "inspecting");
    if (this._offsetX !== state.overlay.offsetX) {
      this._offsetX = state.overlay.offsetX;
      this._updateVisualPosition();
    }
    if (state.mode === "none")
      this._hideOverlay();
    else
      this._showOverlay();
  }
  flashToolSucceeded(tool) {
    let element;
    if (tool === "assertingVisibility")
      element = this._assertVisibilityToggle;
    else if (tool === "assertingSnapshot")
      element = this._assertSnapshotToggle;
    else
      element = this._assertValuesToggle;
    element.classList.add("succeeded");
    this._recorder.injectedScript.utils.builtins.setTimeout(() => element.classList.remove("succeeded"), 2e3);
  }
  _hideOverlay() {
    this._overlayElement.setAttribute("hidden", "true");
  }
  _showOverlay() {
    if (!this._overlayElement.hasAttribute("hidden"))
      return;
    this._overlayElement.removeAttribute("hidden");
    this._updateVisualPosition();
  }
  _updateVisualPosition() {
    this._measure = this._overlayElement.getBoundingClientRect();
    this._overlayElement.style.left = (this._recorder.injectedScript.window.innerWidth - this._measure.width) / 2 + this._offsetX + "px";
  }
  onMouseMove(event) {
    if (!event.buttons) {
      this._dragState = void 0;
      return false;
    }
    if (this._dragState) {
      this._offsetX = this._dragState.offsetX + event.clientX - this._dragState.dragStart.x;
      const halfGapSize = (this._recorder.injectedScript.window.innerWidth - this._measure.width) / 2 - 10;
      this._offsetX = Math.max(-halfGapSize, Math.min(halfGapSize, this._offsetX));
      this._updateVisualPosition();
      this._recorder.setOverlayState({ offsetX: this._offsetX });
      consumeEvent(event);
      return true;
    }
    return false;
  }
  onMouseUp(event) {
    if (this._dragState) {
      consumeEvent(event);
      return true;
    }
    return false;
  }
  onClick(event) {
    if (this._dragState) {
      this._dragState = void 0;
      consumeEvent(event);
      return true;
    }
    return false;
  }
  onDblClick(event) {
    return false;
  }
}
class Recorder {
  injectedScript;
  _listeners = [];
  _currentTool;
  _tools;
  _lastHighlightedSelector = void 0;
  _lastHighlightedAriaTemplateJSON = "undefined";
  _lastActionAutoexpectSnapshot;
  highlight;
  overlay;
  _stylesheet;
  state = {
    mode: "none",
    testIdAttributeName: "data-testid",
    language: "javascript",
    overlay: { offsetX: 0 }
  };
  document;
  _delegate = {};
  constructor(injectedScript, options) {
    this.document = injectedScript.document;
    this.injectedScript = injectedScript;
    this.highlight = injectedScript.createHighlight();
    this._tools = {
      "none": new NoneTool(),
      "standby": new NoneTool(),
      "inspecting": new InspectTool(this, false),
      "recording": options?.recorderMode === "api" ? new JsonRecordActionTool(this) : new RecordActionTool(this),
      "recording-inspecting": new InspectTool(this, false),
      "assertingText": new TextAssertionTool(this, "text"),
      "assertingVisibility": new InspectTool(this, true),
      "assertingValue": new TextAssertionTool(this, "value"),
      "assertingSnapshot": new TextAssertionTool(this, "snapshot")
    };
    this._currentTool = this._tools.none;
    this._currentTool.install?.();
    if (injectedScript.window.top === injectedScript.window && !options?.hideToolbar) {
      this.overlay = new Overlay(this);
      this.overlay.setUIState(this.state);
    }
    this._stylesheet = new injectedScript.window.CSSStyleSheet();
    this._stylesheet.replaceSync(`
      body[data-pw-cursor=pointer] *, body[data-pw-cursor=pointer] *::after { cursor: pointer !important; }
      body[data-pw-cursor=text] *, body[data-pw-cursor=text] *::after { cursor: text !important; }
    `);
    this.installListeners();
    injectedScript.utils.cacheNormalizedWhitespaces();
    if (injectedScript.isUnderTest)
      console.error("Recorder script ready for test");
    injectedScript.consoleApi.install();
  }
  installListeners() {
    removeEventListeners(this._listeners);
    this._listeners = [
      addEventListener(this.document, "click", (event) => this._onClick(event), true),
      addEventListener(this.document, "auxclick", (event) => this._onClick(event), true),
      addEventListener(this.document, "dblclick", (event) => this._onDblClick(event), true),
      addEventListener(this.document, "contextmenu", (event) => this._onContextMenu(event), true),
      addEventListener(this.document, "dragstart", (event) => this._onDragStart(event), true),
      addEventListener(this.document, "input", (event) => this._onInput(event), true),
      addEventListener(this.document, "keydown", (event) => this._onKeyDown(event), true),
      addEventListener(this.document, "keyup", (event) => this._onKeyUp(event), true),
      addEventListener(this.document, "pointerdown", (event) => this._onPointerDown(event), true),
      addEventListener(this.document, "pointerup", (event) => this._onPointerUp(event), true),
      addEventListener(this.document, "mousedown", (event) => this._onMouseDown(event), true),
      addEventListener(this.document, "mouseup", (event) => this._onMouseUp(event), true),
      addEventListener(this.document, "mousemove", (event) => this._onMouseMove(event), true),
      addEventListener(this.document, "mouseleave", (event) => this._onMouseLeave(event), true),
      addEventListener(this.document, "mouseenter", (event) => this._onMouseEnter(event), true),
      addEventListener(this.document, "focus", (event) => this._onFocus(event), true),
      addEventListener(this.document, "scroll", (event) => this._onScroll(event), true)
    ];
    this.highlight.install();
    let recreationInterval;
    const recreate = () => {
      this.highlight.install();
      recreationInterval = this.injectedScript.utils.builtins.setTimeout(recreate, 500);
    };
    recreationInterval = this.injectedScript.utils.builtins.setTimeout(recreate, 500);
    this._listeners.push(() => this.injectedScript.utils.builtins.clearTimeout(recreationInterval));
    this.highlight.appendChild(createSvgElement(this.document, clipPaths));
    this.overlay?.install();
    this._currentTool?.install?.();
    this.document.adoptedStyleSheets.push(this._stylesheet);
  }
  _switchCurrentTool() {
    const newTool = this._tools[this.state.mode];
    if (newTool === this._currentTool)
      return;
    this._currentTool.uninstall?.();
    this.clearHighlight();
    this._currentTool = newTool;
    this._currentTool.install?.();
    const cursor = newTool.cursor?.();
    if (cursor)
      this.injectedScript.document.body?.setAttribute("data-pw-cursor", cursor);
  }
  setUIState(state, delegate) {
    this._delegate = delegate;
    if (state.actionPoint && this.state.actionPoint && state.actionPoint.x === this.state.actionPoint.x && state.actionPoint.y === this.state.actionPoint.y) {
    } else if (!state.actionPoint && !this.state.actionPoint) {
    } else {
      if (state.actionPoint)
        this.highlight.showActionPoint(state.actionPoint.x, state.actionPoint.y);
      else
        this.highlight.hideActionPoint();
    }
    this.state = state;
    this.highlight.setLanguage(state.language);
    this._switchCurrentTool();
    this.overlay?.setUIState(state);
    let highlight = "noop";
    if (state.actionSelector !== this._lastHighlightedSelector) {
      const entries = state.actionSelector ? entriesForSelectorHighlight(this.injectedScript, state.language, state.actionSelector, this.document) : null;
      highlight = entries?.length ? entries : "clear";
      this._lastHighlightedSelector = entries?.length ? state.actionSelector : void 0;
    }
    const ariaTemplateJSON = JSON.stringify(state.ariaTemplate);
    if (this._lastHighlightedAriaTemplateJSON !== ariaTemplateJSON) {
      const elements = state.ariaTemplate ? this.injectedScript.getAllElementsMatchingExpectAriaTemplate(this.document, state.ariaTemplate) : [];
      if (elements.length) {
        const color = elements.length > 1 ? HighlightColors.multiple : HighlightColors.single;
        highlight = elements.map((element) => ({ element, color }));
        this._lastHighlightedAriaTemplateJSON = ariaTemplateJSON;
      } else {
        if (!this._lastHighlightedSelector)
          highlight = "clear";
        this._lastHighlightedAriaTemplateJSON = "undefined";
      }
    }
    if (highlight === "clear")
      this.highlight.clearHighlight();
    else if (highlight !== "noop")
      this.highlight.updateHighlight(highlight);
  }
  clearHighlight() {
    this.updateHighlight(null, false);
  }
  _onClick(event) {
    if (!event.isTrusted)
      return;
    if (this.overlay?.onClick(event))
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onClick?.(event);
  }
  _onDblClick(event) {
    if (!event.isTrusted)
      return;
    if (this.overlay?.onDblClick(event))
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onDblClick?.(event);
  }
  _onContextMenu(event) {
    if (!event.isTrusted)
      return;
    this._currentTool.onContextMenu?.(event);
  }
  _onDragStart(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onDragStart?.(event);
  }
  _onPointerDown(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onPointerDown?.(event);
  }
  _onPointerUp(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onPointerUp?.(event);
  }
  _onMouseDown(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onMouseDown?.(event);
  }
  _onMouseUp(event) {
    if (!event.isTrusted)
      return;
    if (this.overlay?.onMouseUp(event))
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onMouseUp?.(event);
  }
  _onMouseMove(event) {
    if (!event.isTrusted)
      return;
    if (this.overlay?.onMouseMove(event))
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onMouseMove?.(event);
  }
  _onMouseEnter(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onMouseEnter?.(event);
  }
  _onMouseLeave(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onMouseLeave?.(event);
  }
  _onFocus(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onFocus?.(event);
  }
  _onScroll(event) {
    if (!event.isTrusted)
      return;
    this._lastHighlightedSelector = void 0;
    this._lastHighlightedAriaTemplateJSON = "undefined";
    this.highlight.hideActionPoint();
    this._currentTool.onScroll?.(event);
  }
  _onInput(event) {
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onInput?.(event);
  }
  _onKeyDown(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onKeyDown?.(event);
  }
  _onKeyUp(event) {
    if (!event.isTrusted)
      return;
    if (this._ignoreOverlayEvent(event))
      return;
    this._currentTool.onKeyUp?.(event);
  }
  updateHighlight(model, userGesture) {
    this._lastHighlightedSelector = void 0;
    this._lastHighlightedAriaTemplateJSON = "undefined";
    this._updateHighlight(model, userGesture);
  }
  _updateHighlight(model, userGesture) {
    let tooltipText = model?.tooltipText;
    if (tooltipText === void 0 && model?.selector)
      tooltipText = this.injectedScript.utils.asLocator(this.state.language, model.selector);
    if (model)
      this.highlight.updateHighlight(model.elements.map((element) => ({ element, color: model.color, tooltipText })));
    else
      this.highlight.clearHighlight();
    if (userGesture)
      this._delegate.highlightUpdated?.();
  }
  _ignoreOverlayEvent(event) {
    return event.composedPath().some((e) => {
      const nodeName = e.nodeName || "";
      return nodeName.toLowerCase() === "x-pw-glass";
    });
  }
  deepEventTarget(event) {
    for (const element of event.composedPath()) {
      if (!this.overlay?.contains(element))
        return element;
    }
    return event.composedPath()[0];
  }
  setMode(mode) {
    void this._delegate.setMode?.(mode);
  }
  _captureAutoExpectSnapshot() {
    const documentElement = this.injectedScript.document.documentElement;
    return documentElement ? this.injectedScript.utils.generateAriaTree(documentElement, { mode: "autoexpect" }) : void 0;
  }
  _computeAutoExpectPrecondition(action, autoExpect) {
    const previousSnapshot = this._lastActionAutoexpectSnapshot;
    this._lastActionAutoexpectSnapshot = this._captureAutoExpectSnapshot();
    if (!autoExpect || isAssertAction(action) || !this._lastActionAutoexpectSnapshot)
      return;
    const element = this.injectedScript.utils.findNewElement(previousSnapshot?.root, this._lastActionAutoexpectSnapshot.root);
    let preconditionSelector = element ? this.injectedScript.generateSelector(element, { testIdAttributeName: this.state.testIdAttributeName }).selector : void 0;
    if ("selector" in action && preconditionSelector === action.selector)
      preconditionSelector = void 0;
    return preconditionSelector;
  }
  async performAction(action) {
    await this._delegate.performAction?.(action).catch(() => {
    });
  }
  async recordAction(action, options) {
    const preconditionSelector = this._computeAutoExpectPrecondition(action, !!options?.autoExpect);
    await this._delegate.recordAction?.(action, preconditionSelector);
  }
  setOverlayState(state) {
    void this._delegate.setOverlayState?.(state);
  }
  elementPicked(selector, model) {
    const ariaSnapshot = this.injectedScript.ariaSnapshot(model.elements[0], { mode: "default" });
    void this._delegate.elementPicked?.({ selector, ariaSnapshot });
  }
}
class Dialog {
  _recorder;
  _dialogElement = null;
  _keyboardListener;
  _onGlassPaneClickHandler;
  constructor(recorder) {
    this._recorder = recorder;
  }
  isShowing() {
    return !!this._dialogElement;
  }
  show(options) {
    const acceptButton = this._recorder.document.createElement("x-pw-tool-item");
    acceptButton.title = "Accept";
    acceptButton.classList.add("accept");
    acceptButton.appendChild(this._recorder.document.createElement("x-div"));
    acceptButton.addEventListener("click", () => options.onCommit?.());
    const cancelButton = this._recorder.document.createElement("x-pw-tool-item");
    cancelButton.title = "Close";
    cancelButton.classList.add("cancel");
    cancelButton.appendChild(this._recorder.document.createElement("x-div"));
    cancelButton.addEventListener("click", () => {
      this.close();
      options.onCancel?.();
    });
    this._dialogElement = this._recorder.document.createElement("x-pw-dialog");
    if (options.autosize)
      this._dialogElement.classList.add("autosize");
    this._keyboardListener = (event) => {
      if (event.key === "Escape") {
        this.close();
        options.onCancel?.();
        return;
      }
      if (options.onCommit && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        if (this._dialogElement)
          options.onCommit();
        return;
      }
    };
    this._onGlassPaneClickHandler = (event) => {
      this.close();
      options.onCancel?.();
    };
    this._dialogElement.addEventListener("click", (event) => event.stopPropagation());
    const toolbarElement = this._recorder.document.createElement("x-pw-tools-list");
    const labelElement = this._recorder.document.createElement("label");
    labelElement.textContent = options.label;
    toolbarElement.appendChild(labelElement);
    toolbarElement.appendChild(this._recorder.document.createElement("x-spacer"));
    if (options.onCommit)
      toolbarElement.appendChild(acceptButton);
    toolbarElement.appendChild(cancelButton);
    this._dialogElement.appendChild(toolbarElement);
    const bodyElement = this._recorder.document.createElement("x-pw-dialog-body");
    bodyElement.appendChild(options.body);
    this._dialogElement.appendChild(bodyElement);
    this._recorder.highlight.appendChild(this._dialogElement);
    this._recorder.highlight.onGlassPaneClick(this._onGlassPaneClickHandler);
    this._recorder.document.addEventListener("keydown", this._keyboardListener, true);
    return this._dialogElement;
  }
  moveTo(top, left) {
    if (!this._dialogElement)
      return;
    this._dialogElement.style.top = top + "px";
    this._dialogElement.style.left = left + "px";
  }
  close() {
    if (!this._dialogElement)
      return;
    this._dialogElement.remove();
    this._recorder.highlight.offGlassPaneClick(this._onGlassPaneClickHandler);
    this._recorder.document.removeEventListener("keydown", this._keyboardListener);
    this._dialogElement = null;
  }
}
function deepActiveElement(document) {
  let activeElement = document.activeElement;
  while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
    activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
}
function modifiersForEvent(event) {
  return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
}
function buttonForEvent(event) {
  switch (event.which) {
    case 1:
      return "left";
    case 2:
      return "middle";
    case 3:
      return "right";
  }
  return "left";
}
function positionForEvent(event) {
  const targetElement = event.target;
  if (targetElement.nodeName !== "CANVAS")
    return;
  return {
    x: event.offsetX,
    y: event.offsetY
  };
}
function consumeEvent(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}
function asCheckbox(node) {
  if (!node || node.nodeName !== "INPUT")
    return null;
  const inputElement = node;
  return ["checkbox", "radio"].includes(inputElement.type) ? inputElement : null;
}
function isRangeInput(node) {
  if (!node || node.nodeName !== "INPUT")
    return false;
  const inputElement = node;
  return inputElement.type.toLowerCase() === "range";
}
const kNativePickerInputTypes = /* @__PURE__ */ new Set(["color", "date", "datetime-local", "file", "month", "range", "time", "week"]);
function shouldIgnoreMouseEvent(target) {
  const nodeName = target.nodeName;
  if (nodeName === "SELECT" || nodeName === "OPTION")
    return true;
  if (nodeName === "INPUT" && kNativePickerInputTypes.has(target.type))
    return true;
  return false;
}
function addEventListener(target, eventName, listener, useCapture) {
  target.addEventListener(eventName, listener, useCapture);
  const remove = () => {
    target.removeEventListener(eventName, listener, useCapture);
  };
  return remove;
}
function removeEventListeners(listeners) {
  for (const listener of listeners)
    listener();
  listeners.splice(0, listeners.length);
}
function entriesForSelectorHighlight(injectedScript, language, selector, ownerDocument) {
  try {
    const parsedSelector = injectedScript.parseSelector(selector);
    const elements = injectedScript.querySelectorAll(parsedSelector, ownerDocument);
    const color = elements.length > 1 ? HighlightColors.multiple : HighlightColors.single;
    const locator = injectedScript.utils.asLocator(language, selector);
    return elements.map((element, index) => {
      const suffix = elements.length > 1 ? ` [${index + 1} of ${elements.length}]` : "";
      return { element, color, tooltipText: locator + suffix };
    });
  } catch (e) {
    return [];
  }
}
function createSvgElement(doc, { tagName, attrs, children }) {
  const elem = doc.createElementNS("http://www.w3.org/2000/svg", tagName);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs))
      elem.setAttribute(k, v);
  }
  if (children) {
    for (const c of children)
      elem.appendChild(createSvgElement(doc, c));
  }
  return elem;
}
function isAssertAction(action) {
  return action.name.startsWith("assert");
}
export {
  Recorder
};

//# sourceMappingURL=recorder.mjs.map
