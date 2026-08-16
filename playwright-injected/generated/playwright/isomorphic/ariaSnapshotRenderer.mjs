import { escapeRegExp, longestCommonSubstring } from "./stringUtils.mjs";
import { yamlEscapeKeyIfNeeded, yamlEscapeValueIfNeeded } from "./yaml.mjs";
function renderAriaSnapshotAsYaml(snapshot, options = {}) {
  const lines = [];
  const includeText = options.convertStringsToRegex ? textContributesInfo : () => true;
  const renderString = options.convertStringsToRegex ? convertToBestGuessRegex : (str) => str;
  const visitText = (text, depth) => {
    const escaped = yamlEscapeValueIfNeeded(renderString(text));
    if (escaped)
      lines.push(indent(depth) + "- text: " + escaped);
  };
  const createKey = (node) => {
    let key = node.role;
    if (node.name && node.name.length <= 900) {
      const name = renderString(node.name);
      if (name) {
        const stringifiedName = name.startsWith("/") && name.endsWith("/") ? name : JSON.stringify(name);
        key += " " + stringifiedName;
      }
    }
    if (node.checked === "mixed")
      key += ` [checked=mixed]`;
    if (node.checked === true)
      key += ` [checked]`;
    if (node.disabled)
      key += ` [disabled]`;
    if (node.expanded)
      key += ` [expanded]`;
    if (node.active)
      key += ` [active]`;
    if (node.invalid === "grammar" || node.invalid === "spelling")
      key += ` [invalid=${node.invalid}]`;
    if (node.invalid === true)
      key += ` [invalid]`;
    if (node.level)
      key += ` [level=${node.level}]`;
    if (node.pressed === "mixed")
      key += ` [pressed=mixed]`;
    if (node.pressed === true)
      key += ` [pressed]`;
    if (node.selected === true)
      key += ` [selected]`;
    if (node.ref) {
      key += ` [ref=${node.ref}]`;
      if (node.cursor === "pointer")
        key += " [cursor=pointer]";
    }
    if (node.box)
      key += ` [box=${node.box.x},${node.box.y},${node.box.width},${node.box.height}]`;
    return key;
  };
  const visit = (node, depth) => {
    if (node.role === "text") {
      visitText(node.text || "", depth);
      return;
    }
    options.lineToNode?.set(lines.length, node);
    const escapedKey = indent(depth) + "- " + yamlEscapeKeyIfNeeded(createKey(node));
    const props = [];
    if (node.url !== void 0)
      props.push(["url", node.url]);
    if (node.placeholder !== void 0)
      props.push(["placeholder", node.placeholder]);
    if (node.text === void 0 && !props.length && !node.children?.length) {
      lines.push(escapedKey);
    } else if (node.text !== void 0 && !props.length) {
      if (includeText(node, node.text))
        lines.push(escapedKey + ": " + yamlEscapeValueIfNeeded(renderString(node.text)));
      else
        lines.push(escapedKey);
    } else {
      lines.push(escapedKey + ":");
      for (const [name, value] of props)
        lines.push(indent(depth + 1) + "- /" + name + ": " + yamlEscapeValueIfNeeded(value));
      if (node.text !== void 0) {
        visitText(includeText(node, node.text) ? node.text : "", depth + 1);
      } else {
        for (const child of node.children || []) {
          if (typeof child === "string")
            visitText(includeText(node, child) ? child : "", depth + 1);
          else
            visit(child, depth + 1);
        }
      }
    }
  };
  for (const node of snapshot)
    visit(node, 0);
  return lines.join("\n");
}
function indent(depth) {
  return "  ".repeat(depth);
}
function convertToBestGuessRegex(text) {
  const dynamicContent = [
    // 550e8400-e29b-41d4-a716-446655440000
    { regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/, replacement: "[0-9a-fA-F-]+" },
    // 2mb
    { regex: /\b[\d,.]+[bkmBKM]+\b/, replacement: "[\\d,.]+[bkmBKM]+" },
    // 2ms, 20s
    { regex: /\b\d+[hmsp]+\b/, replacement: "\\d+[hmsp]+" },
    { regex: /\b[\d,.]+[hmsp]+\b/, replacement: "[\\d,.]+[hmsp]+" },
    // Do not replace single digits with regex by default.
    // 2+ digits: [Issue 22, 22.3, 2.33, 2,333]
    { regex: /\b\d+,\d+\b/, replacement: "\\d+,\\d+" },
    { regex: /\b\d+\.\d{2,}\b/, replacement: "\\d+\\.\\d+" },
    { regex: /\b\d{2,}\.\d+\b/, replacement: "\\d+\\.\\d+" },
    { regex: /\b\d{2,}\b/, replacement: "\\d+" }
  ];
  let pattern = "";
  let lastIndex = 0;
  const combinedRegex = new RegExp(dynamicContent.map((r) => "(" + r.regex.source + ")").join("|"), "g");
  text.replace(combinedRegex, (match, ...args) => {
    const offset = args[args.length - 2];
    const groups = args.slice(0, -2);
    pattern += escapeRegExp(text.slice(lastIndex, offset));
    for (let i = 0; i < groups.length; i++) {
      if (groups[i]) {
        const { replacement } = dynamicContent[i];
        pattern += replacement;
        break;
      }
    }
    lastIndex = offset + match.length;
    return match;
  });
  if (!pattern)
    return text;
  pattern += escapeRegExp(text.slice(lastIndex));
  return String(new RegExp(pattern));
}
function textContributesInfo(node, text) {
  if (!text.length)
    return false;
  if (!node.name)
    return true;
  const substr = text.length <= 200 && node.name.length <= 200 ? longestCommonSubstring(text, node.name) : "";
  let filtered = text;
  while (substr && filtered.includes(substr))
    filtered = filtered.replace(substr, "");
  return filtered.trim().length / text.length > 0.1;
}
export {
  renderAriaSnapshotAsYaml
};

//# sourceMappingURL=ariaSnapshotRenderer.mjs.map
