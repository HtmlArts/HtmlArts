import { requestResult, STORES, transactionResult } from "./database.js";
import { createDocument } from "./model.js";

export const METADATA_SCHEMA = "htmlarts-library-metadata";
export const METADATA_VERSION = 1;

const EXPORTED_FIELDS = [
  "id",
  "title",
  "category",
  "genre",
  "kind",
  "template",
  "color",
  "description",
  "author",
  "language",
  "sourceFilename",
  "createdAt",
  "updatedAt",
  "sizeBytes",
  "visitCount",
];

export function createMetadataManifest(documents) {
  if (!Array.isArray(documents)) {
    throw new TypeError("Library metadata must contain a documents array.");
  }
  const normalized = documents.map(createDocument);
  if (new Set(normalized.map((item) => item.id)).size !== normalized.length) {
    throw new TypeError("Library metadata contains duplicate document ids.");
  }
  return {
    schema: METADATA_SCHEMA,
    version: METADATA_VERSION,
    exportedAt: new Date().toISOString(),
    documents: normalized.map((item) =>
      Object.fromEntries(EXPORTED_FIELDS.map((field) => [field, item[field]])),
    ),
  };
}

export function validateMetadataManifest(value) {
  if (
    !value ||
    typeof value !== "object" ||
    value.schema !== METADATA_SCHEMA ||
    value.version !== METADATA_VERSION ||
    !Array.isArray(value.documents)
  ) {
    throw new TypeError("This is not a supported HtmlArts metadata file.");
  }
  return createMetadataManifest(value.documents);
}

export async function importMetadataManifest(database, input, mode = "merge") {
  if (mode !== "merge" && mode !== "replace") {
    throw new TypeError("Metadata import mode must be merge or replace.");
  }
  const manifest = validateMetadataManifest(input);
  const transaction = database.transaction(
    [STORES.documents, STORES.contents, STORES.annotations],
    "readwrite",
  );
  const completed = transactionResult(transaction);
  const documentsStore = transaction.objectStore(STORES.documents);
  const localDocuments = await requestResult(documentsStore.getAll());
  const localById = new Map(localDocuments.map((item) => [item.id, item]));
  const incomingById = new Map(manifest.documents.map((item) => [item.id, item]));
  const missing = manifest.documents.filter((item) => !localById.has(item.id));
  if (mode === "replace" && missing.length) {
    transaction.abort();
    await completed.catch(() => {});
    throw new Error(
      `Replace was not applied: ${missing.length} metadata item(s) have no matching local content. Import the source HTML or a complete library file first.`,
    );
  }

  let updated = 0;
  for (const incoming of manifest.documents) {
    const local = localById.get(incoming.id);
    if (!local) continue;
    documentsStore.put(createDocument({
      ...local,
      ...incoming,
      id: local.id,
      createdAt: local.createdAt,
      updatedAt: new Date().toISOString(),
    }));
    updated += 1;
  }

  let removed = 0;
  if (mode === "replace") {
    for (const local of localDocuments) {
      if (incomingById.has(local.id)) continue;
      documentsStore.delete(local.id);
      transaction.objectStore(STORES.contents).delete(local.id);
      transaction.objectStore(STORES.annotations).delete(local.id);
      removed += 1;
    }
  }
  await completed;
  return { mode, updated, skipped: missing.length, removed };
}
