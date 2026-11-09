import { HtmlImportError, parseHtmlSource } from "./html-parser.js";

export function selectRenderingStrategy(safeHtml, documentObject = globalThis.document) {
  if (typeof safeHtml !== "string" || !safeHtml.trim()) {
    throw new HtmlImportError("no-safe-content", "The document has no safe reading representation.");
  }
  const document = parseHtmlSource(safeHtml, documentObject);
  const stage = document.body.querySelector(".stage");
  const stageParent = stage?.parentNode;
  const supportedContainer =
    stageParent === document.body ||
    (stageParent?.localName === "main" && stageParent.parentNode === document.body);
  if (!stage || !supportedContainer) {
    return { strategy: "SAFE_ORIGINAL", folioCount: 0 };
  }

  const folios = Array.from(stage.children);
  const ids = new Set(folios.map((folio) => folio.id));
  const supported =
    folios.length >= 2 &&
    folios.every(
      (folio) =>
        folio.matches("article.page[data-name]") &&
        folio.id.trim() !== "" &&
        folio.getAttribute("data-name").trim() !== "",
    ) &&
    ids.size === folios.length;

  return supported
    ? { strategy: "STRUCTURED_FOLIOS", folioCount: folios.length }
    : { strategy: "SAFE_ORIGINAL", folioCount: 0 };
}
