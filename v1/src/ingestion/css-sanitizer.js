import * as cssTree from "css-tree";

const SAFE_AT_RULES = new Set([
  "charset",
  "container",
  "counter-style",
  "keyframes",
  "layer",
  "media",
  "page",
  "property",
  "supports",
  "-webkit-keyframes",
]);
const UNSAFE_FUNCTIONS = new Set(["element", "expression", "image-set", "-webkit-image-set", "paint"]);
const UNSAFE_PROPERTIES = new Set(["-moz-binding", "behavior"]);

export function sanitizeCssWithReport(source, context = "stylesheet") {
  if (typeof source !== "string" || !source.trim()) {
    return { css: "", removedUnsafeContent: false, blockedResources: 0 };
  }

  let hasParseError = false;
  let ast;
  try {
    ast = cssTree.parse(source, {
      context,
      onParseError() {
        hasParseError = true;
      },
    });
  } catch {
    return { css: "", removedUnsafeContent: true, blockedResources: 0 };
  }
  if (hasParseError) return { css: "", removedUnsafeContent: true, blockedResources: 0 };

  let removedUnsafeContent = false;
  let blockedResources = 0;
  cssTree.walk(ast, {
    enter(node, item, list) {
      if (node.type === "Atrule" && !SAFE_AT_RULES.has(node.name.toLowerCase())) {
        removedUnsafeContent = true;
        if (["import", "font-face", "namespace"].includes(node.name.toLowerCase())) {
          blockedResources += 1;
        }
        list.remove(item);
        return this.skip;
      }

      if (node.type === "Declaration") {
        const resourceValue = hasUnsafeValue(node.value);
        if (UNSAFE_PROPERTIES.has(node.property.toLowerCase()) || resourceValue) {
          removedUnsafeContent = true;
          if (resourceValue) blockedResources += 1;
          list.remove(item);
          return this.skip;
        }
      }
    },
  });

  return {
    css: cssTree.generate(ast),
    removedUnsafeContent,
    blockedResources,
  };
}

function hasUnsafeValue(value) {
  let unsafe = false;
  cssTree.walk(value, (node) => {
    if (
      node.type === "Url" ||
      (node.type === "Function" && UNSAFE_FUNCTIONS.has(node.name.toLowerCase()))
    ) {
      unsafe = true;
    }
  });
  return unsafe;
}
