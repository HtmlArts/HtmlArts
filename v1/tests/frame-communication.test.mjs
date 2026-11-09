import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { IDBFactory } from "fake-indexeddb";
import { JSDOM } from "jsdom";
import test from "node:test";
import { mountApplication } from "../src/core/application.js";
import {
  isExpectedFrameMessage,
  MAX_STUDIO_HTML_BYTES,
  STUDIO_EXPORT_TYPE,
  validateStudioExportMessage,
} from "../src/core/frame-communication.js";
import { openDatabase } from "../src/storage/database.js";
import { getDocumentContent, listDocuments } from "../src/storage/document-repository.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("studio exports require the expected opaque-origin frame and bounded typed fields", () => {
  const expectedFrame = {};
  assert.equal(isExpectedFrameMessage({ source: expectedFrame, origin: "null" }, expectedFrame), true);
  assert.equal(isExpectedFrameMessage({ source: {}, origin: "null" }, expectedFrame), false);
  assert.equal(isExpectedFrameMessage({ source: expectedFrame, origin: "https://other.test" }, expectedFrame), false);

  assert.deepEqual(
    validateStudioExportMessage({
      type: STUDIO_EXPORT_TYPE,
      payload: { title: " Guide ", html: "<h1>Welcome</h1>" },
    }),
    {
      title: "Guide",
      category: "Architecture Guide",
      genre: "Spec",
      template: "Swiss Grid",
      html: "<h1>Welcome</h1>",
      sizeBytes: 16,
    },
  );
  assert.throws(() => validateStudioExportMessage({ type: "OTHER" }), /message type/);
  assert.throws(
    () => validateStudioExportMessage({ type: STUDIO_EXPORT_TYPE, payload: { title: 2, html: "<p>x</p>" } }),
    /title/,
  );
  assert.equal(
    validateStudioExportMessage({
      type: STUDIO_EXPORT_TYPE,
      payload: { title: "Updated", html: "<p>Updated</p>", documentId: "doc-1" },
    }).documentId,
    "doc-1",
  );
  assert.throws(
    () => validateStudioExportMessage({
      type: STUDIO_EXPORT_TYPE,
      payload: { title: "Updated", html: "<p>Updated</p>", documentId: {} },
    }),
    /document id/,
  );
  assert.throws(
    () =>
      validateStudioExportMessage({
        type: STUDIO_EXPORT_TYPE,
        payload: { title: "Large", html: "x".repeat(MAX_STUDIO_HTML_BYTES + 1) },
      }),
    /5 MiB limit/,
  );
});

test("application ignores foreign studio senders and sanitizes an accepted export", async () => {
  const previousIndexedDB = globalThis.indexedDB;
  const indexedDB = new IDBFactory();
  globalThis.indexedDB = indexedDB;
  const template = await readFile(path.join(root, "template.html"), "utf8");
  const browser = new JSDOM(template, { url: "https://htmlarts.test/" });
  Object.defineProperty(browser.window.crypto, "randomUUID", {
    configurable: true,
    value: () => "studio-publication-1",
  });
  let database;

  try {
    await mountApplication(browser.window.document);
    const studioFrame = browser.window.document.querySelector("[data-studio-frame]");
    const otherFrame = browser.window.document.createElement("iframe");
    browser.window.document.body.append(otherFrame);
    const message = {
      type: STUDIO_EXPORT_TYPE,
      payload: {
        title: "Studio publication",
        html: "<h1>Safe title</h1><script>window.compromised = true</script>",
      },
    };

    browser.window.dispatchEvent(
      new browser.window.MessageEvent("message", {
        source: otherFrame.contentWindow,
        origin: "null",
        data: message,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    database = await openDatabase(indexedDB);
    assert.deepEqual(await listDocuments(database), []);

    browser.window.dispatchEvent(
      new browser.window.MessageEvent("message", {
        source: studioFrame.contentWindow,
        origin: "null",
        data: { type: STUDIO_EXPORT_TYPE, payload: { title: "Malformed", html: 12 } },
      }),
    );
    await waitForStatus(browser.window.document, /studio export could not be saved/);
    assert.deepEqual(await listDocuments(database), []);

    browser.window.dispatchEvent(
      new browser.window.MessageEvent("message", {
        source: studioFrame.contentWindow,
        origin: "null",
        data: message,
      }),
    );
    await waitForStatus(browser.window.document, /Saved "Studio publication"/);
    const [publication] = await listDocuments(database);
    assert.equal(publication.title, "Studio publication");
    assert.match(
      browser.window.document.querySelector("[data-catalogue-list]").textContent,
      /Studio publication/,
    );
    const content = await getDocumentContent(database, publication.id);
    assert.match(content.originalHtml, /window\.compromised = true/);
    assert.doesNotMatch(content.safeHtml, /<script/i);
    database.close();
  } finally {
    database?.close();
    browser.window.close();
    if (previousIndexedDB === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousIndexedDB;
  }
});

async function waitForStatus(document, expected) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const status = document.querySelector("[data-app-status]").textContent;
    if (expected.test(status)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.match(document.querySelector("[data-app-status]").textContent, expected);
}
