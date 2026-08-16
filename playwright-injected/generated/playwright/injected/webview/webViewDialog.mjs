function toMessage(message) {
  return String(message === void 0 || message === null ? "" : message);
}
function installDialogBridge(window, endpoint) {
  function post(type, message, defaultValue) {
    const xhr = new window.XMLHttpRequest();
    try {
      xhr.open("POST", endpoint, false);
    } catch (e) {
      return null;
    }
    try {
      xhr.send(JSON.stringify({ type, message, defaultValue }));
    } catch (e) {
      return null;
    }
    if (xhr.status !== 200)
      return null;
    try {
      return JSON.parse(xhr.responseText);
    } catch (e) {
      return null;
    }
  }
  Object.defineProperty(window, "alert", {
    configurable: true,
    writable: false,
    value: function(message) {
      post("alert", toMessage(message), "");
    }
  });
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: false,
    value: function(message) {
      const r = post("confirm", toMessage(message), "");
      return !!(r && r.accept);
    }
  });
  Object.defineProperty(window, "prompt", {
    configurable: true,
    writable: false,
    value: function(message, defaultValue) {
      const def = toMessage(defaultValue);
      const r = post("prompt", toMessage(message), def);
      if (!r || !r.accept)
        return null;
      return typeof r.promptText === "string" ? r.promptText : def;
    }
  });
}
export {
  installDialogBridge
};

//# sourceMappingURL=webViewDialog.mjs.map
