import { requestResult, STORES, transactionResult } from "./database.js";
import { createSnapshot, validateSnapshot } from "./model.js";

const SNAPSHOT_ELEMENT_ID = "htmlarts-snapshot";
const SNAPSHOT_TAG_PATTERN = /(<script\b(?=[^>]*\bid=["']htmlarts-snapshot["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>)[\s\S]*?(<\/script\s*>)/i;

export function serializeSnapshotIntoHtml(html, snapshot) {
  if (typeof html !== "string") throw new TypeError("The HtmlArts document must be text.");
  const normalized = validateSnapshot(snapshot);
  const matches = html.match(SNAPSHOT_TAG_PATTERN);
  if (!matches || html.match(new RegExp(SNAPSHOT_TAG_PATTERN.source, "ig"))?.length !== 1) {
    throw new Error("The HtmlArts release template must contain exactly one snapshot data element.");
  }

  const escapedJson = JSON.stringify(normalized)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return html.replace(SNAPSHOT_TAG_PATTERN, (_match, openingTag, closingTag) =>
    `${openingTag}${escapedJson}${closingTag}`,
  );
}

export async function readSnapshotFromDocument(document) {
  const element = document.getElementById(SNAPSHOT_ELEMENT_ID);
  if (!element) throw new Error("HtmlArts snapshot data element is missing.");
  const text = element.textContent.trim();
  if (!text) throw new Error("HtmlArts snapshot data is empty.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("HtmlArts snapshot data is invalid JSON.", { cause: error });
  }
  return validateSnapshot(parsed);
}

export async function exportLibrarySnapshot(database, html) {
  const snapshot = await readDatabaseSnapshot(database);
  return serializeSnapshotIntoHtml(html, snapshot);
}

export async function readDatabaseSnapshot(database) {
  const names = [STORES.documents, STORES.contents, STORES.annotations];
  const transaction = database.transaction(names, "readonly");
  const completed = transactionResult(transaction);
  const requests = names.map((name) => requestResult(transaction.objectStore(name).getAll()));
  const [documents, contents, annotations] = await Promise.all(requests);
  await completed;
  return createSnapshot({ documents, contents, annotations });
}

export async function hydrateFromSnapshotIfEmpty(database, snapshot) {
  const normalized = validateSnapshot(snapshot);
  const checkTransaction = database.transaction(STORES.documents, "readonly");
  const checkCompleted = transactionResult(checkTransaction);
  const existingCount = await requestResult(checkTransaction.objectStore(STORES.documents).count());
  await checkCompleted;
  if (existingCount > 0) {
    return { status: "existing-runtime-library", importedCount: 0 };
  }

  const transaction = database.transaction(
    [STORES.documents, STORES.contents, STORES.annotations],
    "readwrite",
  );
  const completed = transactionResult(transaction);
  for (const document of normalized.documents) {
    transaction.objectStore(STORES.documents).put(document);
  }
  for (const content of normalized.contents) {
    transaction.objectStore(STORES.contents).put(content);
  }
  for (const annotation of normalized.annotations) {
    transaction.objectStore(STORES.annotations).put(annotation);
  }
  await completed;

  const verifyTransaction = database.transaction(STORES.documents, "readonly");
  const verifyCompleted = transactionResult(verifyTransaction);
  const hydratedCount = await requestResult(verifyTransaction.objectStore(STORES.documents).count());
  await verifyCompleted;
  if (hydratedCount !== normalized.documents.length) {
    throw new Error("Snapshot hydration verification failed; the local library was not fully restored.");
  }
  return { status: "hydrated", importedCount: hydratedCount };
}

export async function downloadLibrarySnapshot(database, document, filename = "HtmlArtsV1.html") {
  if (!document?.documentElement || typeof globalThis.URL?.createObjectURL !== "function") {
    throw new Error("Portable file download is unavailable in this browser.");
  }
  const html = await exportLibrarySnapshot(database, `<!doctype html>\n${document.documentElement.outerHTML}`);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = globalThis.URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    globalThis.URL.revokeObjectURL(url);
  }
}
