import { parseAttributeSelector } from "../isomorphic/selectorParser.mjs";
import { normalizeWhiteSpace } from "../isomorphic/stringUtils.mjs";
import { beginAriaCaches, endAriaCaches, getAriaChecked, getAriaDisabled, getAriaExpanded, getAriaLevel, getAriaPressed, getAriaRole, getAriaSelected, getElementAccessibleDescription, getElementAccessibleNameText, isElementHiddenForAria, kAriaCheckedRoles, kAriaExpandedRoles, kAriaLevelRoles, kAriaPressedRoles, kAriaSelectedRoles } from "./roleUtils.mjs";
import { matchesAttributePart } from "./selectorUtils.mjs";
const kSupportedAttributes = ["selected", "checked", "pressed", "expanded", "level", "disabled", "name", "description", "include-hidden"];
kSupportedAttributes.sort();
function validateSupportedRole(attr, roles, role) {
  if (!roles.includes(role))
    throw new Error(`"${attr}" attribute is only supported for roles: ${roles.slice().sort().map((role2) => `"${role2}"`).join(", ")}`);
}
function validateSupportedValues(attr, values) {
  if (attr.op !== "<truthy>" && !values.includes(attr.value))
    throw new Error(`"${attr.name}" must be one of ${values.map((v) => JSON.stringify(v)).join(", ")}`);
}
function validateSupportedOp(attr, ops) {
  if (!ops.includes(attr.op))
    throw new Error(`"${attr.name}" does not support "${attr.op}" matcher`);
}
function validateAttributes(attrs, role) {
  const options = { role };
  for (const attr of attrs) {
    switch (attr.name) {
      case "checked": {
        validateSupportedRole(attr.name, kAriaCheckedRoles, role);
        validateSupportedValues(attr, [true, false, "mixed"]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.checked = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "pressed": {
        validateSupportedRole(attr.name, kAriaPressedRoles, role);
        validateSupportedValues(attr, [true, false, "mixed"]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.pressed = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "selected": {
        validateSupportedRole(attr.name, kAriaSelectedRoles, role);
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.selected = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "expanded": {
        validateSupportedRole(attr.name, kAriaExpandedRoles, role);
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.expanded = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "level": {
        validateSupportedRole(attr.name, kAriaLevelRoles, role);
        if (typeof attr.value === "string")
          attr.value = +attr.value;
        if (attr.op !== "=" || typeof attr.value !== "number" || Number.isNaN(attr.value))
          throw new Error(`"level" attribute must be compared to a number`);
        options.level = attr.value;
        break;
      }
      case "disabled": {
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.disabled = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      case "name": {
        if (attr.op === "<truthy>")
          throw new Error(`"name" attribute must have a value`);
        if (typeof attr.value !== "string" && !(attr.value instanceof RegExp))
          throw new Error(`"name" attribute must be a string or a regular expression`);
        options.name = attr.value;
        options.nameOp = attr.op;
        options.nameExact = attr.caseSensitive;
        break;
      }
      case "description": {
        if (attr.op === "<truthy>")
          throw new Error(`"description" attribute must have a value`);
        if (typeof attr.value !== "string" && !(attr.value instanceof RegExp))
          throw new Error(`"description" attribute must be a string or a regular expression`);
        options.description = attr.value;
        options.descriptionOp = attr.op;
        options.descriptionExact = attr.caseSensitive;
        break;
      }
      case "include-hidden": {
        validateSupportedValues(attr, [true, false]);
        validateSupportedOp(attr, ["<truthy>", "="]);
        options.includeHidden = attr.op === "<truthy>" ? true : attr.value;
        break;
      }
      default: {
        throw new Error(`Unknown attribute "${attr.name}", must be one of ${kSupportedAttributes.map((a) => `"${a}"`).join(", ")}.`);
      }
    }
  }
  return options;
}
function queryRole(scope, options, internal) {
  const result = [];
  const match = (element) => {
    if (getAriaRole(element) !== options.role)
      return;
    if (options.selected !== void 0 && getAriaSelected(element) !== options.selected)
      return;
    if (options.checked !== void 0 && getAriaChecked(element) !== options.checked)
      return;
    if (options.pressed !== void 0 && getAriaPressed(element) !== options.pressed)
      return;
    if (options.expanded !== void 0 && getAriaExpanded(element) !== options.expanded)
      return;
    if (options.level !== void 0 && getAriaLevel(element) !== options.level)
      return;
    if (options.disabled !== void 0 && getAriaDisabled(element) !== options.disabled)
      return;
    if (!options.includeHidden) {
      const isHidden = isElementHiddenForAria(element);
      if (isHidden)
        return;
    }
    if (options.name !== void 0) {
      const accessibleName = normalizeWhiteSpace(getElementAccessibleNameText(element, !!options.includeHidden));
      if (typeof options.name === "string")
        options.name = normalizeWhiteSpace(options.name);
      if (internal && !options.nameExact && options.nameOp === "=")
        options.nameOp = "*=";
      if (!matchesAttributePart(accessibleName, { name: "", jsonPath: [], op: options.nameOp || "=", value: options.name, caseSensitive: !!options.nameExact }))
        return;
    }
    if (options.description !== void 0) {
      const accessibleDescription = normalizeWhiteSpace(getElementAccessibleDescription(element, !!options.includeHidden).text);
      if (typeof options.description === "string")
        options.description = normalizeWhiteSpace(options.description);
      if (internal && !options.descriptionExact && options.descriptionOp === "=")
        options.descriptionOp = "*=";
      if (!matchesAttributePart(accessibleDescription, { name: "", jsonPath: [], op: options.descriptionOp || "=", value: options.description, caseSensitive: !!options.descriptionExact }))
        return;
    }
    result.push(element);
  };
  const query = (root) => {
    const shadows = [];
    if (root.shadowRoot)
      shadows.push(root.shadowRoot);
    for (const element of root.querySelectorAll("*")) {
      match(element);
      if (element.shadowRoot)
        shadows.push(element.shadowRoot);
    }
    shadows.forEach(query);
  };
  query(scope);
  return result;
}
function createRoleEngine(internal) {
  return {
    queryAll: (scope, selector) => {
      const parsed = parseAttributeSelector(selector, true);
      const role = parsed.name.toLowerCase();
      if (!role)
        throw new Error(`Role must not be empty`);
      const options = validateAttributes(parsed.attributes, role);
      beginAriaCaches();
      try {
        return queryRole(scope, options, internal);
      } finally {
        endAriaCaches();
      }
    }
  };
}
export {
  createRoleEngine
};

//# sourceMappingURL=roleSelectorEngine.mjs.map
