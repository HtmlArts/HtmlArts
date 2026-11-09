import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import test from "node:test";
import { openDatabase, LEGACY_DATABASE_NAME, STORES, requestResult, transactionResult } from "../src/storage/database.js";
import {
  saveDocument,
  getDocument,
  getDocumentContent,
  countDocuments,
  updateDocumentMetadata,
  updateDocumentContent,
  deleteDocument,
} from "../src/storage/document-repository.js";
import { getAnnotations, saveAnnotations } from "../src/storage/annotation-repository.js";
import { migrateLegacyDatabase } from "../src/storage/legacy-migration.js";
import { createDocument, createDocumentContent, createSnapshot } from "../src/storage/model.js";
import {
  hydrateFromSnapshotIfEmpty,
  readDatabaseSnapshot,
  serializeSnapshotIntoHtml,
} from "../src/storage/library-snapshot.js";
import {
  createMetadataManifest,
  importMetadataManifest,
  validateMetadataManifest,
} from "../src/storage/library-metadata.js";

test("document and annotation repositories preserve document associations", async () => {
  const indexedDB = new IDBFactory();
  const database = await openDatabase(indexedDB);
  try {
    const input = {
      id: "doc-1",
      title: "A local book",
      createdAt: "2026-11-09T00:00:00.000Z",
      updatedAt: "2026-11-09T00:00:00.000Z",
    };
    const content = {
      originalHtml: "<h1>Original</h1>",
      safeHtml: "<h1>Safe</h1>",
      legacyRenderedHtml: "<p>Legacy fallback</p>",
    };
    await saveDocument(database, input, content);
    await saveAnnotations(database, "doc-1", [{ page: 1, points: [[0.2, 0.3]] }]);

    assert.equal((await getDocument(database, "doc-1")).type, "DOCUMENT");
    const updated = await updateDocumentMetadata(database, "doc-1", { title: "Renamed local book" });
    assert.equal(updated.title, "Renamed local book");
    assert.equal((await getDocumentContent(database, "doc-1")).originalHtml, content.originalHtml);
    assert.equal((await getDocumentContent(database, "doc-1")).safeHtml, content.safeHtml);
    assert.equal((await getAnnotations(database, "doc-1")).strokes.length, 1);
    await updateDocumentContent(database, "doc-1", {
      originalHtml: "<article>Revised source</article>",
      safeHtml: "<article>Revised safe content</article>",
    }, { title: "Revised publication", sizeBytes: 44 });
    assert.equal((await getDocument(database, "doc-1")).title, "Revised publication");
    assert.equal((await getDocument(database, "doc-1")).createdAt, input.createdAt);
    assert.equal(
      (await getDocumentContent(database, "doc-1")).legacyRenderedHtml,
      content.legacyRenderedHtml,
    );
    assert.equal((await getAnnotations(database, "doc-1")).strokes.length, 1);
    assert.equal(await countDocuments(database), 1);
    await assert.rejects(() => saveAnnotations(database, "missing", []), /unknown document/);
    await assert.rejects(
      () => updateDocumentMetadata(database, "missing", { title: "Missing" }),
      /unknown document/,
    );
    await assert.rejects(
      () => updateDocumentContent(database, "missing", { originalHtml: "<p>Not saved</p>" }),
      /unknown document/,
    );
    await deleteDocument(database, "doc-1");
    assert.equal(await countDocuments(database), 0);
    assert.equal(await getDocumentContent(database, "doc-1"), undefined);
    assert.deepEqual((await getAnnotations(database, "doc-1")).strokes, []);
  } finally {
    database.close();
  }
});

test("legacy v2 migration copies records and leaves legacy stores intact", async () => {
  const indexedDB = new IDBFactory();
  await seedLegacyDatabase(indexedDB, {
    metadata: {
      id: "legacy-1",
      title: "Migrated book",
      category: "Research",
      createdAt: 1794182400000,
      updatedAt: 1794182400000,
      sizeBytes: 27,
    },
    content: {
      id: "legacy-1",
      html: "<article>Rendered</article>",
      rawHtml: "<article>Source</article>",
    },
    book: {
      id: "legacy-1",
      title: "Legacy book",
      html: "<article>Fallback</article>",
      rawHtml: "<article>Fallback source</article>",
    },
    annotation: {
      bookId: "legacy-1",
      strokes: [{ page: 2, points: [[0.1, 0.4]] }],
      updatedAt: 1794182400000,
    },
  });

  const database = await openDatabase(indexedDB);
  try {
    const result = await migrateLegacyDatabase(database, indexedDB);
    assert.deepEqual(result, {
      status: "migrated",
      documentCount: 1,
      retainedLegacyRecordCount: 0,
    });
    assert.equal((await getDocument(database, "legacy-1")).title, "Migrated book");
    assert.equal(
      (await getDocumentContent(database, "legacy-1")).originalHtml,
      "<article>Source</article>",
    );
    assert.equal((await getDocumentContent(database, "legacy-1")).safeHtml, "");
    assert.equal(
      (await getDocumentContent(database, "legacy-1")).legacyRenderedHtml,
      "<article>Rendered</article>",
    );
    assert.equal((await getAnnotations(database, "legacy-1")).strokes.length, 1);
    assert.deepEqual(await migrateLegacyDatabase(database, indexedDB), {
      status: "already-migrated",
      documentCount: 1,
      retainedLegacyRecordCount: 0,
    });

    const legacy = await openExistingDatabase(indexedDB);
    try {
      const read = legacy.transaction(["books_meta", "books_content", "books", "annotations"], "readonly");
      const legacyDocs = await requestResult(read.objectStore("books_meta").getAll());
      const legacyAnnotations = await requestResult(read.objectStore("annotations").getAll());
      await transactionResult(read);
      assert.equal(legacyDocs.length, 1);
      assert.equal(legacyAnnotations.length, 1);
    } finally {
      legacy.close();
    }
  } finally {
    database.close();
  }
});

test("legacy folio workspace record is retained without blocking document migration", async () => {
  const indexedDB = new IDBFactory();
  const folioWorkspace = {
    bookId: "__folio_notes_state__",
    folios: [{ title: "My notes", content: "Remember this" }],
    activeFolioIndex: 0,
    updatedAt: 1794182400000,
  };
  await seedLegacyDatabase(indexedDB, {
    metadata: { id: "legacy-with-folios", title: "Migrated book" },
    annotation: {
      bookId: "legacy-with-folios",
      strokes: [{ page: 1 }],
    },
    annotations: [folioWorkspace],
  });

  const database = await openDatabase(indexedDB);
  try {
    assert.deepEqual(await migrateLegacyDatabase(database, indexedDB), {
      status: "migrated",
      documentCount: 1,
      retainedLegacyRecordCount: 1,
    });
    assert.equal((await getAnnotations(database, "legacy-with-folios")).strokes.length, 1);
    assert.deepEqual(await migrateLegacyDatabase(database, indexedDB), {
      status: "already-migrated",
      documentCount: 1,
      retainedLegacyRecordCount: 1,
    });

    const legacy = await openExistingDatabase(indexedDB);
    try {
      const transaction = legacy.transaction("annotations", "readonly");
      const records = await requestResult(transaction.objectStore("annotations").getAll());
      await transactionResult(transaction);
      assert.deepEqual(records.find((record) => record.bookId === "__folio_notes_state__"), folioWorkspace);
    } finally {
      legacy.close();
    }
  } finally {
    database.close();
  }
});

test("legacy migration rejects orphan annotations without dropping source data", async () => {
  const indexedDB = new IDBFactory();
  await seedLegacyDatabase(indexedDB, {
    annotation: { bookId: "orphan", strokes: [{ page: 0 }] },
  });
  const database = await openDatabase(indexedDB);
  try {
    await assert.rejects(
      () => migrateLegacyDatabase(database, indexedDB),
      /annotations without a matching document/,
    );
    assert.equal(await countDocuments(database), 0);
    const legacy = await openExistingDatabase(indexedDB);
    try {
      const transaction = legacy.transaction("annotations", "readonly");
      const records = await requestResult(transaction.objectStore("annotations").getAll());
      await transactionResult(transaction);
      assert.equal(records.length, 1);
    } finally {
      legacy.close();
    }
  } finally {
    database.close();
  }
});

test("legacy migration refuses to overwrite an existing v1 document", async () => {
  const indexedDB = new IDBFactory();
  await seedLegacyDatabase(indexedDB, {
    metadata: { id: "shared-id", title: "Legacy value" },
  });
  const database = await openDatabase(indexedDB);
  try {
    await saveDocument(database, { id: "shared-id", title: "Current v1 value" }, {});
    await assert.rejects(
      () => migrateLegacyDatabase(database, indexedDB),
      /id already used by the v1 library; existing data was preserved/,
    );
    assert.equal((await getDocument(database, "shared-id")).title, "Current v1 value");
    const source = await openExistingDatabase(indexedDB);
    try {
      const transaction = source.transaction("books_meta", "readonly");
      const records = await requestResult(transaction.objectStore("books_meta").getAll());
      await transactionResult(transaction);
      assert.equal(records[0].title, "Legacy value");
    } finally {
      source.close();
    }
  } finally {
    database.close();
  }
});

test("portable snapshot serialization escapes markup and restores only into an empty library", async () => {
  const indexedDB = new IDBFactory();
  const database = await openDatabase(indexedDB);
  const snapshot = createSnapshot({
    documents: [createDocument({ id: "portable-1", title: "Portable" })],
    contents: [
      createDocumentContent("portable-1", {
        originalHtml: "</script><script>window.compromised=true</script>",
        safeHtml: "<p>Saved</p>",
      }),
    ],
    annotations: [{ documentId: "portable-1", strokes: [{ page: 1 }] }],
  });
  const html = '<!doctype html><script id="htmlarts-snapshot" type="application/json">{}</script>';
  try {
    const serialized = serializeSnapshotIntoHtml(html, snapshot);
    assert.doesNotMatch(serialized, /<\/script><script>window\.compromised/);
    assert.match(serialized, /\\u003c\/script>/);
    const snapshotText = serialized.match(/<script id="htmlarts-snapshot" type="application\/json">([\s\S]*?)<\/script>/)[1];
    const parsed = JSON.parse(snapshotText);
    assert.equal(parsed.contents[0].originalHtml, "</script><script>window.compromised=true</script>");

    assert.deepEqual(await hydrateFromSnapshotIfEmpty(database, parsed), {
      status: "hydrated",
      importedCount: 1,
    });
    const restored = await readDatabaseSnapshot(database);
    assert.equal(restored.documents[0].id, "portable-1");
    assert.equal(restored.annotations[0].strokes[0].page, 1);

    const staleSnapshot = createSnapshot({
      documents: [{ id: "stale", title: "Stale file" }],
      contents: [],
      annotations: [],
    });
    assert.deepEqual(await hydrateFromSnapshotIfEmpty(database, staleSnapshot), {
      status: "existing-runtime-library",
      importedCount: 0,
    });
    assert.equal(await countDocuments(database), 1);
  } finally {
    database.close();
  }
});

test("snapshot validation rejects content and annotations without a document", () => {
  assert.throws(
    () =>
      serializeSnapshotIntoHtml(
        '<script id="htmlarts-snapshot" type="application/json">{}</script>',
        {
          schema: "htmlarts-library-snapshot",
          version: 1,
          documents: [],
          contents: [{ documentId: "missing", originalHtml: "" }],
          annotations: [],
        },
      ),
    /missing document/,
  );
});

test("metadata merge updates matching catalog details without touching content or annotations", async () => {
  const indexedDB = new IDBFactory();
  const database = await openDatabase(indexedDB);
  try {
    await saveDocument(database, {
      id: "metadata-1",
      title: "Original title",
      category: "Research",
    }, {
      originalHtml: "<h1>Original source</h1>",
      safeHtml: "<h1>Safe source</h1>",
    });
    await saveAnnotations(database, "metadata-1", [{ type: "note", text: "Keep my note." }]);

    const manifest = createMetadataManifest([
      { id: "metadata-1", title: "Updated title", category: "Study", genre: "Note" },
      { id: "unknown-1", title: "Not imported without its content" },
    ]);
    const result = await importMetadataManifest(database, manifest, "merge");

    assert.deepEqual(result, { mode: "merge", updated: 1, skipped: 1, removed: 0 });
    assert.equal((await getDocument(database, "metadata-1")).title, "Updated title");
    assert.equal((await getDocumentContent(database, "metadata-1")).originalHtml, "<h1>Original source</h1>");
    assert.deepEqual((await getAnnotations(database, "metadata-1")).strokes, [
      { type: "note", text: "Keep my note." },
    ]);
    assert.equal(await getDocument(database, "unknown-1"), undefined);
  } finally {
    database.close();
  }
});

test("metadata replace deletes only after every incoming id has matching local content", async () => {
  const indexedDB = new IDBFactory();
  const database = await openDatabase(indexedDB);
  try {
    for (const id of ["keep-1", "remove-1"]) {
      await saveDocument(database, { id, title: id }, {
        originalHtml: `<h1>${id}</h1>`,
        safeHtml: `<h1>${id}</h1>`,
      });
      await saveAnnotations(database, id, [{ type: "note", text: `note-${id}` }]);
    }

    const incompleteManifest = createMetadataManifest([
      { id: "keep-1", title: "Updated keep" },
      { id: "missing-body", title: "No local content" },
    ]);
    await assert.rejects(
      () => importMetadataManifest(database, incompleteManifest, "replace"),
      /no matching local content/,
    );
    assert.equal(await countDocuments(database), 2);

    const validManifest = createMetadataManifest([{ id: "keep-1", title: "Updated keep" }]);
    const result = await importMetadataManifest(database, validManifest, "replace");
    assert.deepEqual(result, { mode: "replace", updated: 1, skipped: 0, removed: 1 });
    assert.equal(await countDocuments(database), 1);
    assert.equal((await getDocument(database, "keep-1")).title, "Updated keep");
    assert.equal(await getDocumentContent(database, "remove-1"), undefined);
    assert.deepEqual((await getAnnotations(database, "keep-1")).strokes, [
      { type: "note", text: "note-keep-1" },
    ]);
  } finally {
    database.close();
  }
});

test("metadata validation rejects unsupported schemas and duplicate ids", () => {
  assert.throws(() => validateMetadataManifest({ schema: "wrong", version: 1, documents: [] }), /not a supported/);
  assert.throws(() => createMetadataManifest([
    { id: "duplicate", title: "First" },
    { id: "duplicate", title: "Second" },
  ]), /duplicate document ids/);
});

async function seedLegacyDatabase(indexedDB, records) {
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore("books_meta", { keyPath: "id" });
      database.createObjectStore("books_content", { keyPath: "id" });
      database.createObjectStore("books", { keyPath: "id" });
      database.createObjectStore("annotations", { keyPath: "bookId" });
    };
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        ["books_meta", "books_content", "books", "annotations"],
        "readwrite",
      );
      if (records.metadata) transaction.objectStore("books_meta").put(records.metadata);
      if (records.content) transaction.objectStore("books_content").put(records.content);
      if (records.book) transaction.objectStore("books").put(records.book);
      const annotations = [
        ...(records.annotation ? [records.annotation] : []),
        ...(records.annotations ?? []),
      ];
      for (const annotation of annotations) {
        transaction.objectStore("annotations").put(annotation);
      }
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    };
    request.onerror = () => reject(request.error);
  });
}

function openExistingDatabase(indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
