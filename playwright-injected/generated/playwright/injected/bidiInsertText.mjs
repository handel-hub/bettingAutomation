function bidiInsertText(window, text) {
  let element = window.document.activeElement;
  while (element?.shadowRoot)
    element = element.shadowRoot.activeElement;
  if (!element)
    return;
  const elementType = element.nodeName.toLocaleLowerCase();
  if (elementType === "iframe" || elementType === "frame") {
    return element;
  } else if (elementType === "input" || elementType === "textarea") {
    const inputElement = element;
    const start = inputElement.selectionStart;
    if (start === null) {
      inputElement.value += text;
    } else {
      let value = inputElement.value;
      value = value.substring(0, start) + text + value.substring(inputElement.selectionEnd);
      inputElement.value = value;
      const caretPosition = start + text.length;
      inputElement.setSelectionRange(caretPosition, caretPosition);
    }
    inputElement.dispatchEvent(new InputEvent("input", { data: text, bubbles: true, composed: true }));
  } else if (element instanceof HTMLElement && element.isContentEditable) {
    const selection = window.getSelection();
    let range;
    if (selection.rangeCount)
      range = selection.getRangeAt(0);
    if (!range || !element.contains(range.commonAncestorContainer)) {
      range = window.document.createRange();
      range.selectNodeContents(element);
      range.collapse(true);
    }
    range.deleteContents();
    const lines = text.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      range.insertNode(window.document.createTextNode(lines[i]));
      if (i > 0)
        range.insertNode(window.document.createElement("br"));
    }
    range.collapse();
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new InputEvent("input", { data: text, bubbles: true, composed: true }));
  }
}
class BidiInsertTextInstaller {
  constructor(injectedScript) {
    const window = injectedScript.window;
    window.__pw_bidiInsertText = (text) => bidiInsertText(window, text);
  }
}
var bidiInsertText_default = BidiInsertTextInstaller;
export {
  BidiInsertTextInstaller,
  bidiInsertText_default as default
};

//# sourceMappingURL=bidiInsertText.mjs.map
