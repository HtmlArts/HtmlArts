import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("migrate a legacy publication and annotation without deleting source data", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("htmlarts-local-library", 2);
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
            transaction.objectStore("books_meta").put({
              id: "browser-legacy-book",
              title: "Migrated browser publication",
              category: "Research",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            transaction.objectStore("books_content").put({
              id: "browser-legacy-book",
              html: "<article>Legacy rendered content</article>",
              rawHtml: "<article>Original legacy source</article>",
            });
            transaction.objectStore("annotations").put({
              bookId: "browser-legacy-book",
              strokes: [{ page: 1, points: [[0.2, 0.3]] }],
              updatedAt: Date.now(),
            });
            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
          };
          request.onerror = () => reject(request.error);
        }),
    );
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase("htmlarts-v1-local-library");
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error("The v1 database could not be reset for migration."));
        }),
    );
    await page.reload({ waitUntil: "load" });
    await page.locator("[data-nav-page='catalogue']").click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Migrated browser publication",
    }).waitFor();
    assert.match(
      await page.locator("[data-app-status]").innerText(),
      /Migrated 1 document/,
    );

    const migrated = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("htmlarts-v1-local-library");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction(
              ["document_content", "document_annotations"],
              "readonly",
            );
            const contentRequest = transaction
              .objectStore("document_content")
              .get("browser-legacy-book");
            const annotationRequest = transaction
              .objectStore("document_annotations")
              .get("browser-legacy-book");
            transaction.oncomplete = () => {
              database.close();
              resolve({
                content: contentRequest.result,
                annotations: annotationRequest.result,
              });
            };
            transaction.onerror = () => reject(transaction.error);
          };
        }),
    );
    assert.equal(migrated.content.originalHtml, "<article>Original legacy source</article>");
    assert.equal(migrated.content.safeHtml, "");
    assert.equal(migrated.content.legacyRenderedHtml, "<article>Legacy rendered content</article>");
    assert.equal(migrated.annotations.strokes.length, 1);
    assert.equal(
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const request = indexedDB.open("htmlarts-local-library");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction("books_meta", "readonly");
              const count = transaction.objectStore("books_meta").count();
              transaction.oncomplete = () => {
                database.close();
                resolve(count.result);
              };
              transaction.onerror = () => reject(transaction.error);
            };
          }),
      ),
      1,
    );
  });
});
