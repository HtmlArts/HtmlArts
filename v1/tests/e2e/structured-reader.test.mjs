import assert from "node:assert/strict";
import test from "node:test";
import { importHtml, inBrowserTest, openApplication } from "./helpers.mjs";

test("navigate supported structured folios without flattening their order", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await importHtml(
      page,
      "structured-folios.html",
      '<!doctype html><html><body><main><div class="stage"><article class="page" id="folio-start" data-name="Start"><h1>Opening folio</h1></article><article class="page" id="folio-finish" data-name="Finish"><h1>Closing folio</h1></article></div></main></body></html>',
    );
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() =>
      !document.querySelector("[data-reader-view]").hidden &&
      document.querySelectorAll("[data-reader-toc] button").length === 2,
    );

    const frame = page.locator("[data-reader-frame]");
    const initialFolios = await frame.evaluate((element) => ({
      first: element.contentWindow.getComputedStyle(
        element.contentDocument.getElementById("folio-start"),
      ).display,
      second: element.contentWindow.getComputedStyle(
        element.contentDocument.getElementById("folio-finish"),
      ).display,
    }));
    assert.notEqual(initialFolios.first, "none");
    assert.equal(initialFolios.second, "none");

    await page.locator("[data-reader-next]").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]").textContent === "2 / 2",
    );
    const nextFolios = await frame.evaluate((element) => ({
      first: element.contentWindow.getComputedStyle(
        element.contentDocument.getElementById("folio-start"),
      ).display,
      second: element.contentWindow.getComputedStyle(
        element.contentDocument.getElementById("folio-finish"),
      ).display,
    }));
    assert.equal(nextFolios.first, "none");
    assert.notEqual(nextFolios.second, "none");
  });
});
