import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appUrl = pathToFileURL(path.join(root, "HtmlArtsV1.html")).href;
const launchOptions = process.env.CHROME_EXECUTABLE
  ? { executablePath: process.env.CHROME_EXECUTABLE, headless: true }
  : { channel: "chrome", headless: true };
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext();

try {
  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: "load" });
  await page.waitForFunction(() =>
    document.querySelector("[data-app-status]")?.textContent.includes("ready"),
  );
  await page.evaluate(async () => {
    const request = indexedDB.open("htmlarts-v1-local-library");
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(["documents", "document_content"], "readwrite");
    const documents = transaction.objectStore("documents");
    const contents = transaction.objectStore("document_content");
    const profiles = new Map([
      [0, 1024],
      [1, 50 * 1024],
      [2, 250 * 1024],
    ]);

    for (let index = 0; index < 500; index += 1) {
      const id = `benchmark-${String(index).padStart(3, "0")}`;
      const title = `Benchmark publication ${String(index).padStart(3, "0")}`;
      const targetBytes = profiles.get(index) ?? 320;
      const prefix = `<!doctype html><html><body><main><h1>${title}</h1><p>`;
      const suffix = "</p></main></body></html>";
      const html = `${prefix}${"x".repeat(Math.max(0, targetBytes - prefix.length - suffix.length))}${suffix}`;
      const timestamp = new Date().toISOString();
      documents.put({
        id,
        title,
        type: "DOCUMENT",
        category: "Benchmark",
        genre: "Book",
        kind: "created",
        template: "Editorial",
        color: "#805b3d",
        renderingStrategy: "SAFE_ORIGINAL",
        sourceFormat: "text/html",
        description: "",
        author: "",
        language: "",
        sourceFilename: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        sizeBytes: html.length,
        visitCount: 0,
      });
      contents.put({
        documentId: id,
        originalHtml: html,
        safeHtml: html,
        legacyRenderedHtml: "",
        updatedAt: timestamp,
      });
    }

    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  const catalogueReloadSamples = [];
  for (let sample = 0; sample < 3; sample += 1) {
    const reloadStart = Date.now();
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() =>
      document.querySelectorAll("[data-catalogue-list] li").length === 500,
    );
    catalogueReloadSamples.push(Date.now() - reloadStart);
  }

  const searchSamples = [];
  for (let sample = 0; sample < 5; sample += 1) {
    searchSamples.push(await page.evaluate(
      (query) =>
        new Promise((resolve, reject) => {
          const search = document.querySelector("[data-catalogue-search]");
          const list = document.querySelector("[data-catalogue-list]");
          const startedAt = performance.now();
          const observer = new MutationObserver(() => {
            if (
              list.children.length === 1 &&
              list.querySelector("[data-open-document]")?.dataset.openDocument === "benchmark-499"
            ) {
              observer.disconnect();
              clearTimeout(timeout);
              resolve(performance.now() - startedAt);
            }
          });
          const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error("Catalog search did not render one matching entry."));
          }, 5000);
          observer.observe(list, { childList: true });
          search.value = query;
          search.dispatchEvent(new Event("input", { bubbles: true }));
        }),
      "Benchmark publication 499",
    ));
    await page.locator("[data-catalogue-search]").fill("");
    await page.waitForFunction(() =>
      document.querySelectorAll("[data-catalogue-list] li").length === 500,
    );
  }

  const readerOpen = [];
  for (const [index, targetBytes] of [[0, 1024], [1, 50 * 1024], [2, 250 * 1024]]) {
    const samples = [];
    for (let sample = 0; sample < 5; sample += 1) {
      const id = `benchmark-${String(index).padStart(3, "0")}`;
      await page.evaluate(() => {
        window.__htmlartsReaderOpenMs = null;
        window.__htmlartsReaderOpenStartedAt = performance.now();
        document.querySelector("[data-reader-frame]").addEventListener(
          "load",
          () => {
            window.__htmlartsReaderOpenMs =
              performance.now() - window.__htmlartsReaderOpenStartedAt;
          },
          { once: true },
        );
      });
      await page.locator(`[data-open-document="${id}"]`).click();
      await page.waitForFunction(() => window.__htmlartsReaderOpenMs !== null);
      samples.push(await page.evaluate(() => window.__htmlartsReaderOpenMs));
      await page.locator("[data-reader-back]").click();
    }
    readerOpen.push({ contentBytes: targetBytes, samplesMs: samples, medianMs: median(samples) });
  }

  console.log(JSON.stringify({
    browser: await browser.version(),
    generatedAt: new Date().toISOString(),
    catalogueDocuments: 500,
    catalogueReloadSamplesMs: catalogueReloadSamples,
    catalogueReloadMedianMs: median(catalogueReloadSamples),
    singleResultSearchSamplesMs: searchSamples.map((sample) => Number(sample.toFixed(2))),
    singleResultSearchMedianMs: median(searchSamples),
    readerOpen,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}

function median(values) {
  const ordered = [...values].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  return Number(
    (ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2).toFixed(2),
  );
}
