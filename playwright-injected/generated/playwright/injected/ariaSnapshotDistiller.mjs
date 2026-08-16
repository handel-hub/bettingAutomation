import { hasPointerCursor } from "../isomorphic/ariaSnapshot.mjs";
import { normalizeWhiteSpace } from "../isomorphic/stringUtils.mjs";
function distillAriaSnapshot(snapshot, options) {
  runPlugins(snapshot, options.mode === "ai" ? aiPlugins : normalizePlugins, options);
}
function runPlugins(snapshot, plugins, options) {
  const ctx = { snapshot, depth: -1, maxDepth: options.depth, ancestors: [], pendingContentRefs: /* @__PURE__ */ new Set() };
  const traverse = (node, depth) => {
    const children = [];
    const visitChild = (child) => {
      if (typeof child === "string") {
        children.push(child);
        return;
      }
      ctx.depth = depth + 1;
      for (const plugin of plugins) {
        const result = plugin.enter?.(child, ctx);
        if (result === "remove")
          return;
        if (result === "unwrap") {
          child.children.forEach(visitChild);
          return;
        }
      }
      traverse(child, depth + 1);
      ctx.depth = depth + 1;
      for (const plugin of plugins) {
        const result = plugin.exit?.(child, ctx);
        if (result === "remove")
          return;
        if (result === "unwrap") {
          children.push(...child.children);
          return;
        }
      }
      children.push(child);
    };
    ctx.ancestors.push(node);
    node.children.forEach(visitChild);
    ctx.ancestors.pop();
    node.children = children;
  };
  for (const plugin of plugins)
    plugin.enter?.(snapshot.root, ctx);
  traverse(snapshot.root, -1);
  ctx.depth = -1;
  for (const plugin of plugins)
    plugin.exit?.(snapshot.root, ctx);
}
function isLeafGeneric(node) {
  return node.role === "generic" && node.children.every((child) => typeof child === "string");
}
function isClickTargetRoot(node, ctx) {
  return !!node.ref && hasPointerCursor(node) && !ctx.ancestors.some((ancestor) => !!ancestor.ref && hasPointerCursor(ancestor));
}
const mergeStringChildren = {
  name: "mergeStringChildren",
  exit(node) {
    const children = [];
    const buffer = [];
    const flush = () => {
      if (!buffer.length)
        return;
      const text = normalizeWhiteSpace(buffer.join(""));
      if (text)
        children.push(text);
      buffer.length = 0;
    };
    for (const child of node.children) {
      if (typeof child === "string") {
        buffer.push(child);
      } else {
        flush();
        children.push(child);
      }
    }
    flush();
    node.children = children;
    if (node.children.length === 1 && node.children[0] === node.name)
      node.children = [];
  }
};
const unwrapSingleChildGenerics = {
  name: "unwrapSingleChildGenerics",
  exit(node, ctx) {
    if (node.role !== "generic" || node.name || node.children.length > 1 || !node.children.every((child) => typeof child !== "string" && !!child.ref))
      return;
    if (!node.children.length && isClickTargetRoot(node, ctx))
      return;
    return "unwrap";
  }
};
const removeNamelessImages = {
  name: "removeNamelessImages",
  exit(node, ctx) {
    if (node.role === "img" && !node.name && !node.children.length && !isClickTargetRoot(node, ctx))
      return "remove";
  }
};
const removeRedundantNames = {
  name: "removeRedundantNames",
  enter(node, ctx) {
    if (!node.ref)
      return;
    for (const ref of ctx.snapshot.info.get(node.ref)?.nameFromContentRefs || [])
      ctx.pendingContentRefs.add(ref);
    const beyondDepth = !!ctx.maxDepth && ctx.depth > ctx.maxDepth;
    if (!beyondDepth && !isLeafGeneric(node))
      ctx.pendingContentRefs.delete(node.ref);
  },
  exit(node, ctx) {
    if (!node.ref)
      return;
    const nameFromContentRefs = ctx.snapshot.info.get(node.ref)?.nameFromContentRefs;
    if (!nameFromContentRefs?.length)
      return;
    if (nameFromContentRefs.every((ref) => !ctx.pendingContentRefs.has(ref))) {
      node.name = "";
    } else {
      for (const ref of nameFromContentRefs)
        ctx.pendingContentRefs.delete(ref);
    }
  }
};
const removeNameRepeatingChild = {
  name: "removeNameRepeatingChild",
  exit(node, ctx) {
    const parent = ctx.ancestors[ctx.ancestors.length - 1];
    if (!parent?.name || node.role !== "generic" || node.active || Object.keys(node.props).length)
      return;
    const singleTextChild = node.children.length === 1 && typeof node.children[0] === "string" ? node.children[0] : void 0;
    const text = node.name ? node.children.length ? void 0 : node.name : singleTextChild;
    if (text && text === parent.name) {
      if (node.ref)
        ctx.pendingContentRefs.add(node.ref);
      return "remove";
    }
  }
};
const inlineTextIntoGeneric = {
  name: "inlineTextIntoGeneric",
  exit(node) {
    if (node.role !== "generic" || Object.keys(node.props).length || node.children.length !== 1)
      return;
    const child = node.children[0];
    if (typeof child === "string")
      return;
    if (child.role !== "generic" || child.name || child.active || Object.keys(child.props).length)
      return;
    if (child.children.length === 1 && typeof child.children[0] === "string")
      node.children = [child.children[0]];
  }
};
const normalizePlugins = [
  mergeStringChildren,
  unwrapSingleChildGenerics
];
const aiPlugins = [
  mergeStringChildren,
  removeNamelessImages,
  removeRedundantNames,
  inlineTextIntoGeneric,
  removeNameRepeatingChild,
  unwrapSingleChildGenerics
];
export {
  distillAriaSnapshot
};

//# sourceMappingURL=ariaSnapshotDistiller.mjs.map
