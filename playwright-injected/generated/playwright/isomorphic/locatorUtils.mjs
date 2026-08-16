import { escapeForAttributeSelector, escapeForTextSelector } from "./stringUtils.mjs";
function getByAttributeTextSelector(attrName, text, options) {
  return `internal:attr=[${attrName}=${escapeForAttributeSelector(text, options?.exact || false)}]`;
}
function splitTestIdAttributeNames(testIdAttributeName) {
  return testIdAttributeName.split(",");
}
function encodeTestIdAttributeName(testIdAttributeName) {
  return testIdAttributeName.includes(",") ? JSON.stringify(testIdAttributeName) : testIdAttributeName;
}
function getByTestIdSelector(testIdAttributeName, testId) {
  return `internal:testid=[${encodeTestIdAttributeName(testIdAttributeName)}=${escapeForAttributeSelector(testId, true)}]`;
}
function getByLabelSelector(text, options) {
  return "internal:label=" + escapeForTextSelector(text, !!options?.exact);
}
function getByAltTextSelector(text, options) {
  return getByAttributeTextSelector("alt", text, options);
}
function getByTitleSelector(text, options) {
  return getByAttributeTextSelector("title", text, options);
}
function getByPlaceholderSelector(text, options) {
  return getByAttributeTextSelector("placeholder", text, options);
}
function getByTextSelector(text, options) {
  return "internal:text=" + escapeForTextSelector(text, !!options?.exact);
}
function getByRoleSelector(role, options = {}) {
  const props = [];
  if (options.checked !== void 0)
    props.push(["checked", String(options.checked)]);
  if (options.disabled !== void 0)
    props.push(["disabled", String(options.disabled)]);
  if (options.selected !== void 0)
    props.push(["selected", String(options.selected)]);
  if (options.expanded !== void 0)
    props.push(["expanded", String(options.expanded)]);
  if (options.includeHidden !== void 0)
    props.push(["include-hidden", String(options.includeHidden)]);
  if (options.level !== void 0)
    props.push(["level", String(options.level)]);
  if (options.name !== void 0)
    props.push(["name", escapeForAttributeSelector(options.name, !!options.exact)]);
  if (options.description !== void 0)
    props.push(["description", escapeForAttributeSelector(options.description, !!options.exact)]);
  if (options.pressed !== void 0)
    props.push(["pressed", String(options.pressed)]);
  return `internal:role=${role}${props.map(([n, v]) => `[${n}=${v}]`).join("")}`;
}
export {
  encodeTestIdAttributeName,
  getByAltTextSelector,
  getByLabelSelector,
  getByPlaceholderSelector,
  getByRoleSelector,
  getByTestIdSelector,
  getByTextSelector,
  getByTitleSelector,
  splitTestIdAttributeNames
};

//# sourceMappingURL=locatorUtils.mjs.map
