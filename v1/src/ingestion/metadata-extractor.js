export function extractDocumentMetadata(parsedDocument, fileName = "") {
  const sourceFilename = typeof fileName === "string" ? fileName : "";
  const title =
    cleanText(parsedDocument.querySelector("title")?.textContent) ||
    cleanText(parsedDocument.querySelector('meta[property="og:title"]')?.getAttribute("content")) ||
    cleanText(parsedDocument.querySelector("h1")?.textContent) ||
    filenameTitle(sourceFilename) ||
    "Untitled HTML document";

  return {
    title,
    description: cleanText(
      parsedDocument.querySelector('meta[name="description"]')?.getAttribute("content"),
    ),
    author: cleanText(parsedDocument.querySelector('meta[name="author"]')?.getAttribute("content")),
    language: cleanText(parsedDocument.documentElement.getAttribute("lang")),
    sourceFilename: cleanText(sourceFilename),
  };
}

function filenameTitle(fileName) {
  return cleanText(fileName.replace(/\.html?$/i, "").replace(/[_-]+/g, " "));
}

function cleanText(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}
