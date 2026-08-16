function generateCode(actions, languageGenerator, options) {
  languageGenerator.reset();
  const header = languageGenerator.generateHeader(options);
  const footer = languageGenerator.generateFooter(options.saveStorage);
  const actionTexts = actions.map((a) => languageGenerator.generateAction(a, options)).filter(Boolean);
  const text = [header, ...actionTexts, footer].join("\n");
  return { header, footer, actionTexts, text };
}
function expectSignalAction(actionInContext, signal) {
  return {
    pageGuid: actionInContext.pageGuid,
    signals: [],
    action: {
      name: "assertVisible",
      selector: signal.selector
    }
  };
}
function sanitizeDeviceOptions(device, options) {
  const cleanedOptions = {};
  for (const property in options) {
    if (JSON.stringify(device[property]) !== JSON.stringify(options[property]))
      cleanedOptions[property] = options[property];
  }
  return cleanedOptions;
}
function toSignalMap(actionInContext) {
  let popup;
  let download;
  let dialog;
  let expect;
  for (const signal of actionInContext.signals) {
    if (signal.name === "popup")
      popup = signal;
    else if (signal.name === "download")
      download = signal;
    else if (signal.name === "dialog")
      dialog = signal;
    else if (signal.name === "expect")
      expect = signal;
  }
  return {
    popup,
    download,
    dialog,
    expect
  };
}
function toKeyboardModifiers(modifiers) {
  const result = [];
  if (modifiers & 1)
    result.push("Alt");
  if (modifiers & 2)
    result.push("ControlOrMeta");
  if (modifiers & 4)
    result.push("ControlOrMeta");
  if (modifiers & 8)
    result.push("Shift");
  return result;
}
function fromKeyboardModifiers(modifiers) {
  let result = 0;
  if (!modifiers)
    return result;
  if (modifiers.includes("Alt"))
    result |= 1;
  if (modifiers.includes("Control"))
    result |= 2;
  if (modifiers.includes("ControlOrMeta"))
    result |= 2;
  if (modifiers.includes("Meta"))
    result |= 4;
  if (modifiers.includes("Shift"))
    result |= 8;
  return result;
}
function toClickOptionsForSourceCode(action) {
  const modifiers = toKeyboardModifiers(action.modifiers);
  const options = {};
  if (action.button !== "left")
    options.button = action.button;
  if (modifiers.length)
    options.modifiers = modifiers;
  if (action.clickCount > 2)
    options.clickCount = action.clickCount;
  if (action.position)
    options.position = action.position;
  return options;
}
export {
  expectSignalAction,
  fromKeyboardModifiers,
  generateCode,
  sanitizeDeviceOptions,
  toClickOptionsForSourceCode,
  toKeyboardModifiers,
  toSignalMap
};

//# sourceMappingURL=language.mjs.map
