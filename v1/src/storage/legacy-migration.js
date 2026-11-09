import { createAnnotationSet, createDocument, createDocumentContent } from "./model.js";
import {
  LEGACY_DATABASE_NAME,
  requestResult,
  STORES,
  transactionResult,
} from "./database.js";
import { listDocuments } from "./document-repository.js";

const MIGRATION_ID = "legacy-htmlarts-db-v2";

export async function migrateLegacyDatabase(targetDatabase, indexedDBApi = globalThis.indexedDB) {
  const previousState = await readMigrationState(targetDatabase);
  if (previousState?.status === "complete") {
    return { status: "already-migrated", documentCount: previousState.documentCount };
  }

  const legacyDatabase = await openLegacyDatabase(indexedDBApi);
  if (!legacyDatabase) {
    if (previousState?.status === "copied") {
      throw new Error("The legacy source is unavailable before migration verification; copied data is retained.");
    }
    await markMigration(targetDatabase, { id: MIGRATION_ID, status: "complete", documentCount: 0 });
    return { status: "no-legacy-database", documentCount: 0 };
  }

  try {
    const records = await readLegacyRecords(legacyDatabase);
    if (previousState?.status === "copied") {
      await verifyCopiedRecords(targetDatabase, records);
      await markMigration(targetDatabase, {
        id: MIGRATION_ID,
        status: "complete",
        documentCount: records.documents.length,
        completedAt: new Date().toISOString(),
      });
      return { status: "migrated", documentCount: records.documents.length };
    }

    if (records.documents.length === 0 && records.annotations.length === 0) {
      await markMigration(targetDatabase, { id: MIGRATION_ID, status: "complete", documentCount: 0 });
      return { status: "empty-legacy-database", documentCount: 0 };
    }

    await copyRecords(targetDatabase, records);
    await verifyCopiedRecords(targetDatabase, records);
    await markMigration(targetDatabase, {
      id: MIGRATION_ID,
      status: "complete",
      documentCount: records.documents.length,
      completedAt: new Date().toISOString(),
    });
    return { status: "migrated", documentCount: records.documents.length };
  } finally {
    legacyDatabase.close();
  }
}

async function openLegacyDatabase(indexedDBApi) {
  if (!indexedDBApi) {
    throw new Error("IndexedDB is unavailable; legacy data cannot be checked.");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBApi.open(LEGACY_DATABASE_NAME);
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) request.transaction.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      if (request.error?.name === "AbortError") {
        resolve(null);
      } else {
        reject(request.error ?? new Error("Could not inspect legacy HtmlArts storage."));
      }
    };
    request.onblocked = () => reject(new Error("Legacy HtmlArts storage is blocked by another tab."));
  });
}

async function readLegacyRecords(database) {
  const names = new Set(Array.from(database.objectStoreNames));
  const sourceNames = ["books_meta", "books_content", "books", "annotations"].filter((name) =>
    names.has(name),
  );
  if (sourceNames.length === 0) return { documents: [], contents: [], annotations: [] };

  const transaction = database.transaction(sourceNames, "readonly");
  const completed = transactionResult(transaction);
  const pending = [];
  for (const name of sourceNames) {
    pending.push([name, requestResult(transaction.objectStore(name).getAll())]);
  }
  const values = new Map(await Promise.all(pending.map(async ([name, promise]) => [name, await promise])));
  await completed;

  const documentsById = new Map();
  const contentsById = new Map();
  const legacyBooks = values.get("books") ?? [];
  for (const book of legacyBooks) {
    if (typeof book?.id !== "string" || !book.id) continue;
    documentsById.set(book.id, legacyDocument(book));
    contentsById.set(
      book.id,
      createDocumentContent(book.id, {
        originalHtml: typeof book.rawHtml === "string" ? book.rawHtml : book.html,
        legacyRenderedHtml: book.html,
        updatedAt: timestamp(book.updatedAt),
      }),
    );
  }

  for (const metadata of values.get("books_meta") ?? []) {
    if (typeof metadata?.id !== "string" || !metadata.id) continue;
    const existing = documentsById.get(metadata.id) ?? {};
    documentsById.set(metadata.id, legacyDocument({ ...existing, ...metadata }));
  }

  for (const content of values.get("books_content") ?? []) {
    if (typeof content?.id !== "string" || !content.id) continue;
    contentsById.set(
      content.id,
      createDocumentContent(content.id, {
        originalHtml: typeof content.rawHtml === "string" ? content.rawHtml : content.html,
        legacyRenderedHtml: content.html,
      }),
    );
  }

  const documents = [...documentsById.values()];
  const documentIds = new Set(documents.map((document) => document.id));
  const annotations = [];
  for (const record of values.get("annotations") ?? []) {
    if (typeof record?.bookId !== "string" || !documentIds.has(record.bookId)) {
      throw new Error("Legacy migration found annotations without a matching document; source data was preserved.");
    }
    annotations.push(
      createAnnotationSet(
        record.bookId,
        Array.isArray(record.strokes) ? record.strokes : [],
        timestamp(record.updatedAt),
      ),
    );
  }

  return {
    documents,
    contents: [...contentsById.values()].filter((content) => documentIds.has(content.documentId)),
    annotations,
  };
}

function legacyDocument(record) {
  const createdAt = timestamp(record.createdAt);
  const updatedAt = timestamp(record.updatedAt);
  return createDocument({
    ...record,
    id: record.id,
    title: typeof record.title === "string" && record.title.trim() ? record.title : "Untitled document",
    type: "DOCUMENT",
    sourceFormat: "text/html",
    renderingStrategy: "SAFE_ORIGINAL",
    createdAt,
    updatedAt,
    sizeBytes:
      Number.isFinite(record.sizeBytes)
        ? record.sizeBytes
        : typeof record.html === "string"
          ? record.html.length
          : 0,
  });
}

function timestamp(value) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return new Date().toISOString();
}

async function copyRecords(database, records) {
  const transaction = database.transaction(
    [STORES.documents, STORES.contents, STORES.annotations, STORES.migration],
    "readwrite",
  );
  const completed = transactionResult(transaction);
  const documents = transaction.objectStore(STORES.documents);
  const contents = transaction.objectStore(STORES.contents);
  const annotations = transaction.objectStore(STORES.annotations);
  let constraintError;
  for (const document of records.documents) {
    captureConstraintError(documents.add(document), (error) => (constraintError = error));
  }
  for (const content of records.contents) {
    captureConstraintError(contents.add(content), (error) => (constraintError = error));
  }
  for (const annotation of records.annotations) {
    captureConstraintError(annotations.add(annotation), (error) => (constraintError = error));
  }
  transaction.objectStore(STORES.migration).put({
    id: MIGRATION_ID,
    status: "copied",
    documentCount: records.documents.length,
  });
  try {
    await completed;
  } catch (error) {
    if (constraintError?.name === "ConstraintError" || error?.name === "ConstraintError") {
      throw new Error(
        "Legacy migration found an id already used by the v1 library; existing data was preserved.",
        { cause: constraintError ?? error },
      );
    }
    throw error;
  }
}

function captureConstraintError(request, onConstraintError) {
  request.onerror = () => {
    if (request.error?.name === "ConstraintError") onConstraintError(request.error);
  };
}

async function verifyCopiedRecords(database, records) {
  const documents = await listDocuments(database);
  const byId = new Map(documents.map((document) => [document.id, document]));
  for (const expected of records.documents) {
    const actual = byId.get(expected.id);
    if (!actual || actual.title !== expected.title) {
      throw new Error(`Legacy migration verification failed for document "${expected.id}".`);
    }
  }

  for (const expected of records.contents) {
    const transaction = database.transaction(STORES.contents, "readonly");
    const completed = transactionResult(transaction);
    const actual = await requestResult(transaction.objectStore(STORES.contents).get(expected.documentId));
    await completed;
    if (
      !actual ||
      actual.originalHtml !== expected.originalHtml ||
      actual.safeHtml !== expected.safeHtml ||
      actual.legacyRenderedHtml !== expected.legacyRenderedHtml
    ) {
      throw new Error(`Legacy migration verification failed for content "${expected.documentId}".`);
    }
  }

  for (const expected of records.annotations) {
    const transaction = database.transaction(STORES.annotations, "readonly");
    const completed = transactionResult(transaction);
    const actual = await requestResult(
      transaction.objectStore(STORES.annotations).get(expected.documentId),
    );
    await completed;
    if (!actual || JSON.stringify(actual.strokes) !== JSON.stringify(expected.strokes)) {
      throw new Error(`Legacy migration verification failed for annotations "${expected.documentId}".`);
    }
  }
}

async function readMigrationState(database) {
  const transaction = database.transaction(STORES.migration, "readonly");
  return requestResult(transaction.objectStore(STORES.migration).get(MIGRATION_ID));
}

async function markMigration(database, state) {
  const transaction = database.transaction(STORES.migration, "readwrite");
  const completed = transactionResult(transaction);
  transaction.objectStore(STORES.migration).put(state);
  await completed;
}
