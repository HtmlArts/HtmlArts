import { insertDocument } from "../storage/document-repository.js";
import { createDocument } from "../storage/model.js";
import { HtmlImportError, parseHtmlSource, readHtmlFile } from "./html-parser.js";
import { extractDocumentMetadata } from "./metadata-extractor.js";
import { sanitizeHtml } from "./html-sanitizer.js";
import { selectRenderingStrategy } from "./rendering-strategy.js";

export async function importHtmlFile(
  database,
  file,
  {
    documentObject = globalThis.document,
    windowObject = globalThis.window,
    createId = createDocumentId,
  } = {},
) {
  const originalHtml = await readHtmlFile(file);
  const parsedSource = parseHtmlSource(originalHtml, documentObject);
  const metadata = extractDocumentMetadata(parsedSource, file.name ?? "");
  const sanitized = sanitizeHtml(originalHtml, { document: documentObject, windowObject });
  const rendering = selectRenderingStrategy(sanitized.html, documentObject);
  const documentRecord = createDocument({
    id: createId(),
    ...metadata,
    kind: "imported",
    category: "Imported",
    sourceFormat: "text/html",
    renderingStrategy: rendering.strategy,
    sizeBytes: file.size,
  });
  const content = {
    originalHtml,
    safeHtml: sanitized.html,
  };

  try {
    await insertDocument(database, documentRecord, content);
  } catch (error) {
    if (error?.name === "ConstraintError") {
      throw new HtmlImportError(
        "duplicate-document",
        "This import could not be assigned a unique document identity. No existing document was changed.",
        error,
      );
    }
    throw new HtmlImportError(
      "persistence-failed",
      "The document could not be saved to your local library. No successful import was recorded.",
      error,
    );
  }

  const message = sanitized.restrictions.length
    ? `Imported "${documentRecord.title}". Some content was blocked for safe reading.`
    : `Imported "${documentRecord.title}" and saved it to your local library.`;
  return {
    status: "imported",
    document: documentRecord,
    content,
    rendering,
    restrictions: sanitized.restrictions,
    message,
  };
}

function createDocumentId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new HtmlImportError("identity-unavailable", "A secure document identity could not be generated.");
}
