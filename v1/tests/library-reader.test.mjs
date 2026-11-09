import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";
import test from "node:test";
import { filterCatalogueDocuments, renderCatalogue } from "../src/library/catalogue.js";
import { PAGE_TEMPLATES, renderTemplateGallery } from "../src/library/page-templates.js";
import { createReaderController } from "../src/reader/reader-engine.js";
import { openDatabase } from "../src/storage/database.js";
import { getAnnotations, saveAnnotations } from "../src/storage/annotation-repository.js";
import { insertDocument } from "../src/storage/document-repository.js";

test("catalogue filters local metadata and renders untrusted titles as text", async () => {
  const browser = new JSDOM(
    '<!doctype html><ul data-list></ul><p data-empty></p>',
  );
  const database = await openDatabase(new IDBFactory());
  try {
    await insertDocument(
      database,
      {
        id: "doc-1",
        title: "<img src=x onerror=alert(1)> Research Notes",
        author: "A. Reader",
        description: "Local collection",
        category: "Research",
        createdAt: "2026-11-09T00:00:00.000Z",
        updatedAt: "2026-11-09T00:00:00.000Z",
      },
      { originalHtml: "<p>Original</p>", safeHtml: "<p>Safe</p>" },
    );
    const list = browser.window.document.querySelector("[data-list]");
    const empty = browser.window.document.querySelector("[data-empty]");

    await renderCatalogue(database, browser.window.document, list, empty);
    assert.equal(list.querySelectorAll("[data-open-document]").length, 1);
    assert.equal(list.querySelector("img"), null);
    assert.match(list.textContent, /<img src=x onerror=alert\(1\)> Research Notes/);

    await renderCatalogue(database, browser.window.document, list, empty, "no matching publication");
    assert.equal(list.children.length, 0);
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, "No publications match your search.");
    assert.equal(filterCatalogueDocuments([], "").length, 0);
  } finally {
    database.close();
    browser.window.close();
  }
});

test("catalogue filters by publication kind and category", () => {
  const documents = [
    { title: "Field guide", genre: "Book", category: "Science" },
    { title: "Panels", genre: "Comics", category: "Art" },
    { title: "Observations", genre: "Notes", category: "Science" },
    { title: "Monthly", genre: "Magazine", category: "Art" },
  ];
  assert.deepEqual(filterCatalogueDocuments(documents, "", { type: "comic" }), [documents[1]]);
  assert.deepEqual(
    filterCatalogueDocuments(documents, "observation", { type: "note", category: "Science" }),
    [documents[2]],
  );
  assert.deepEqual(filterCatalogueDocuments(documents, "", { category: "missing" }), []);
});

test("template gallery renders all safe, selectable visual styles", () => {
  const browser = new JSDOM("<!doctype html><ul data-templates></ul>");
  try {
    const list = browser.window.document.querySelector("[data-templates]");
    renderTemplateGallery(browser.window.document, list);
    assert.equal(PAGE_TEMPLATES.length, 6);
    assert.equal(list.querySelectorAll("[data-template-select]").length, 6);
    assert.equal(list.querySelectorAll("svg").length, 6);
    assert.equal(list.querySelector("[data-template-select='Botanical']")?.getAttribute("aria-label"),
      "Use Botanical template");
  } finally {
    browser.window.close();
  }
});

test("annotation notes remain associated with their document", async () => {
  const database = await openDatabase(new IDBFactory());
  try {
    await insertDocument(
      database,
      { id: "reader-1", title: "First publication" },
      { safeHtml: "<h1>First</h1>" },
    );
    await insertDocument(
      database,
      { id: "reader-2", title: "Second publication" },
      { safeHtml: "<h1>Second</h1>" },
    );
    await saveAnnotations(database, "reader-1", [
      { type: "note", id: "note-1", page: 0, text: "Remember this", createdAt: "2026-11-09T00:00:00.000Z" },
    ]);

    assert.equal((await getAnnotations(database, "reader-1")).strokes[0].text, "Remember this");
    assert.deepEqual((await getAnnotations(database, "reader-2")).strokes, []);
  } finally {
    database.close();
  }
});

test("reader safely returns an explicit error when a persisted document has no safe content", async () => {
  const browser = new JSDOM(readerMarkup(), { url: "https://htmlarts.test/" });
  const database = await openDatabase(new IDBFactory());
  try {
    await insertDocument(database, { id: "broken-reader", title: "Missing content" }, {});
    const reader = createReaderController(browser.window.document, database);
    await reader.open({ id: "broken-reader", title: "Missing content" });
    assert.equal(browser.window.document.querySelector("[data-reader-status]").textContent,
      "The publication could not be opened: This publication has no safe reading content and cannot be opened.");
    assert.equal(browser.window.document.querySelector("[data-reader-view]").hidden, false);
  } finally {
    database.close();
    browser.window.close();
  }
});

function readerMarkup() {
  return `<!doctype html><body>
    <main data-catalog-view></main>
    <section data-reader-view hidden>
      <button data-reader-back></button><button data-reader-contents></button>
      <button data-reader-previous></button><button data-reader-next></button>
      <aside data-reader-sidebar></aside><h2 data-reader-title></h2>
      <ol data-reader-toc></ol><span data-reader-position></span>
      <form data-note-form><textarea id="reader-note"></textarea><button type="submit"></button></form>
      <p data-note-status></p><ol data-note-list></ol>
      <div><iframe data-reader-frame></iframe><canvas data-reader-ink></canvas></div>
      <output data-pen-folio></output><button data-pen-tool="pen"></button>
      <button data-pen-tool="eraser"></button><button data-pen-tool="highlight"></button>
      <button data-apply-highlight></button><button data-pen-color="#b35c43"></button>
      <button data-pen-undo></button><button data-pen-redo></button>
      <button data-pen-clear></button><button data-pen-download></button>
      <p data-reader-status></p>
    </section>
  </body>`;
}
