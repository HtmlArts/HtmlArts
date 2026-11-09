import createDOMPurify from "dompurify";
import { sanitizeCssWithReport } from "./css-sanitizer.js";
import { HtmlImportError, parseHtmlSource } from "./html-parser.js";

const FORBID_TAGS = [
  "base",
  "button",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "object",
  "option",
  "select",
  "svg",
  "textarea",
  "video",
  "audio",
  "source",
  "track",
  "template",
  "applet",
  "portal",
];
const FORBID_ATTR = [
  "action",
  "background",
  "download",
  "formaction",
  "method",
  "ping",
  "poster",
  "srcdoc",
  "srcset",
  "target",
];
const SAFE_RASTER_DATA_IMAGE =
  /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/]+={0,2}$/i;

export function sanitizeHtml(
  sourceHtml,
  { document = globalThis.document, windowObject = globalThis.window } = {},
) {
  if (!windowObject || typeof windowObject.document?.createElement !== "function") {
    throw new HtmlImportError("unsupported-browser", "This browser cannot safely prepare HTML for reading.");
  }

  const sourceDocument = parseHtmlSource(sourceHtml, document);
  const observed = inspectActiveContent(sourceDocument);
  removeReservedAttributes(sourceDocument);
  const purifier = createDOMPurify(windowObject);
  const purifiedHtml = purifier.sanitize(sourceHtml, {
    FORBID_ATTR,
    FORBID_TAGS,
    WHOLE_DOCUMENT: true,
  });
  const safeDocument = parseHtmlSource(purifiedHtml, document);
  removeReservedAttributes(safeDocument);
  const blockedResources = sanitizeResources(safeDocument, document);
  const cssRestrictions = sanitizeStyles(safeDocument);

  const safeStyles = Array.from(safeDocument.querySelectorAll("style"), (style) =>
    `<style>${style.textContent.replace(/<\/style/gi, "\\3C /style")}</style>`,
  ).join("");
  for (const style of safeDocument.querySelectorAll("style")) style.remove();
  for (const title of safeDocument.querySelectorAll("title")) title.remove();

  if (!safeDocument.body.textContent.trim() && !safeDocument.body.querySelector("img")) {
    throw new HtmlImportError(
      "no-safe-content",
      "No readable content remains after unsafe content is removed. The document was not imported.",
    );
  }

  const language = safeDocument.documentElement.getAttribute("lang");
  const safeLanguage = language ? ` lang="${escapeAttribute(language)}"` : "";
  const html = `<!doctype html><html${safeLanguage}><head><meta charset="utf-8">${safeStyles}</head><body>${safeDocument.template.innerHTML}</body></html>`;
  const restrictions = describeRestrictions(observed, blockedResources, cssRestrictions);
  return { html, restrictions };
}

function inspectActiveContent(document) {
  let eventHandlers = 0;
  for (const element of document.querySelectorAll("*")) {
    eventHandlers += Array.from(element.attributes).filter((attribute) =>
      /^on/i.test(attribute.name),
    ).length;
  }

  return {
    scripts: document.querySelectorAll("script").length,
    eventHandlers,
    forms: document.querySelectorAll("form,input,button,select,textarea").length,
    embedded: document.querySelectorAll("iframe,frame,frameset,object,embed,svg,math").length,
    externalLinks: Array.from(document.querySelectorAll("a[href]")).filter((anchor) =>
      isExternalLink(anchor.getAttribute("href")),
    ).length,
    unsafeLinks: Array.from(document.querySelectorAll("a[href]")).filter((anchor) => {
      const href = anchor.getAttribute("href").trim();
      return !href.startsWith("#") && !isExternalLink(href);
    }).length,
    externalResources: document.querySelectorAll(
      "img[src]:not([src^='data:image/']),video[src],audio[src],source[src],iframe[src],link[href]",
    ).length,
  };
}

function sanitizeResources(document, documentObject) {
  let blockedResources = 0;
  for (const image of document.querySelectorAll("img")) {
    const source = image.getAttribute("src")?.trim() ?? "";
    if (source && SAFE_RASTER_DATA_IMAGE.test(source)) continue;

    blockedResources += 1;
    const replacement = documentObject.createElement("span");
    replacement.className = "htmlarts-resource-blocked";
    replacement.textContent = image.getAttribute("alt")?.trim() || "[Image blocked]";
    image.replaceWith(replacement);
  }

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of ["srcset", "poster", "background", "action", "formaction"]) {
      element.removeAttribute(attribute);
    }
    if (element.localName !== "img") element.removeAttribute("src");
    element.removeAttribute("target");
    element.removeAttribute("ping");

    const href = element.getAttribute("href");
    if (element.localName !== "a" || !href) {
      if (href && element.localName !== "a") element.removeAttribute("href");
      continue;
    }

    const trimmedHref = href.trim();
    if (trimmedHref.startsWith("#")) {
      element.setAttribute("href", trimmedHref);
      continue;
    }

    const externalHref = normalizeExternalLink(trimmedHref);
    element.removeAttribute("href");
    if (externalHref) element.setAttribute("data-htmlarts-external-href", externalHref);
  }

  return blockedResources;
}

function removeReservedAttributes(document) {
  for (const element of document.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("data-htmlarts-")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

function sanitizeStyles(document) {
  let removedUnsafeContent = false;
  let blockedResources = 0;
  for (const style of document.querySelectorAll("style")) {
    const report = sanitizeCssWithReport(style.textContent, "stylesheet");
    removedUnsafeContent ||= report.removedUnsafeContent;
    blockedResources += report.blockedResources;
    if (report.css) style.textContent = report.css;
    else style.remove();
  }

  for (const element of document.querySelectorAll("[style]")) {
    const report = sanitizeCssWithReport(element.getAttribute("style"), "declarationList");
    removedUnsafeContent ||= report.removedUnsafeContent;
    blockedResources += report.blockedResources;
    if (report.css) element.setAttribute("style", report.css);
    else element.removeAttribute("style");
  }
  return { removedUnsafeContent, blockedResources };
}

function describeRestrictions(observed, blockedResources, cssRestrictions) {
  const restrictions = [];
  if (observed.scripts) restrictions.push(`${observed.scripts} script element(s) removed`);
  if (observed.eventHandlers) restrictions.push(`${observed.eventHandlers} event handler(s) removed`);
  if (observed.forms) restrictions.push(`${observed.forms} form control(s) removed`);
  if (observed.embedded) restrictions.push(`${observed.embedded} embedded active element(s) removed`);
  if (observed.externalLinks) {
    restrictions.push(`${observed.externalLinks} external link(s) require confirmation`);
  }
  if (observed.unsafeLinks) restrictions.push(`${observed.unsafeLinks} unsafe link(s) removed`);
  if (blockedResources || observed.externalResources) {
    restrictions.push(`${Math.max(blockedResources, observed.externalResources)} external resource(s) blocked`);
  }
  if (cssRestrictions.removedUnsafeContent) {
    restrictions.push("unsafe CSS rules removed");
  }
  if (cssRestrictions.blockedResources) {
    restrictions.push(`${cssRestrictions.blockedResources} CSS resource reference(s) blocked`);
  }
  return restrictions;
}

function isExternalLink(href) {
  return normalizeExternalLink(href) !== null;
}

function normalizeExternalLink(href) {
  try {
    const candidate = href.startsWith("//") ? `https:${href}` : href;
    const parsed = new URL(candidate);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function escapeAttribute(value) {
  return value.replace(/[&"<>]/g, (character) => {
    const entities = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
    return entities[character];
  });
}
