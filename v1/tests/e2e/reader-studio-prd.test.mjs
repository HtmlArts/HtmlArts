import assert from "node:assert/strict";
import test from "node:test";
import { importHtml, inBrowserTest, openApplication } from "./helpers.mjs";

test("reader implements PRD capabilities: bookmarking, search, themes, typography, focus mode, and studio edit", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await importHtml(
      page,
      "prd-folios.html",
      '<!doctype html><html><body><main><div class="stage"><article class="page" id="folio-start" data-name="Chapter One"><h1>Opening folio</h1><p>The dawn of an architecture.</p></article><article class="page" id="folio-finish" data-name="Chapter Two"><h1>Closing folio</h1><p>Searchable kaleidoscope patterns emerge.</p></article></div></main></body></html>',
    );
    await page.locator("[data-catalogue-list] [data-open-document]").first().waitFor();

    // 1. Open Reader
    await page.locator("[data-catalogue-list] [data-open-document]").first().click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);

    // 2. Navigation & Reading position (R-02 / R-03 / R-04)
    await page.waitForFunction(() => document.querySelector("[data-reader-position]").textContent === "1 / 2");
    assert.equal(await page.locator("[data-reader-position]").innerText(), "1 / 2");
    await page.locator("[data-reader-next]").click();
    await page.waitForFunction(() => document.querySelector("[data-reader-position]").textContent === "2 / 2");
    assert.equal(await page.locator("[data-reader-position]").innerText(), "2 / 2");

    // 3. Bookmarking (R-09 / R-15)
    await page.locator("[data-reader-bookmark]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-bookmark-list] .bookmark-item").length === 1,
    );
    assert.match(
      await page.locator("[data-bookmark-list]").innerText(),
      /Chapter Two/,
    );

    // 4. In-book Search (R-13 / R-14)
    await page.locator("[data-reader-search-input]").fill("kaleidoscope");
    await page.locator("[data-search-form] button[type='submit']").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-reader-search-results] .search-item").length === 1,
    );
    assert.match(
      await page.locator("[data-reader-search-results]").innerText(),
      /kaleidoscope/,
    );

    // 5. Typography adjustment (R-05)
    await page.locator("[data-reader-fontsize='up']").click();
    const frameBodyFontSize = await page.locator("[data-reader-frame]").evaluate((frame) => {
      return frame.contentDocument.getElementById("htmlarts-reader-pref-style")?.textContent;
    });
    assert.match(frameBodyFontSize, /font-size:\s*115%/);

    // 6. Switchable themes (R-06)
    await page.locator("[data-reader-theme='warm']").click();
    const warmBackground = await page.locator("[data-reader-frame]").evaluate((frame) => {
      return getComputedStyle(frame.contentDocument.body).backgroundColor;
    });
    assert.equal(warmBackground, "rgb(246, 236, 217)");

    // 7. Focus Mode (R-16)
    await page.locator("[data-reader-focus]").click();
    assert.equal(
      await page.evaluate(() => document.querySelector(".reader-shell").classList.contains("focus-mode")),
      true,
    );
    await page.locator("[data-reader-focus]").click();
    assert.equal(
      await page.evaluate(() => document.querySelector(".reader-shell").classList.contains("focus-mode")),
      false,
    );

    // 8. Reader-to-Studio bidirectional navigation (✎ Edit in Studio)
    await page.locator("[data-reader-studio]").click();
    await page.waitForFunction(() => !document.querySelector("[data-studio-view]").hidden);
    assert.equal(
      await page.evaluate(() => document.querySelector("[data-reader-view]").hidden),
      true,
    );
  });
});

test("studio implements PRD capabilities: content blocks, auto-save indicator, and preview in reader", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-studio]").first().click();
    await page.waitForFunction(() => !document.querySelector("[data-studio-view]").hidden);

    const studio = page.frameLocator("[data-studio-frame]");
    await studio.locator("#docTitle").waitFor();

    // 1. Auto-save status indicator (S-10)
    assert.equal(await studio.locator("#autoSaveIndicator").isVisible(), true);
    assert.match(await studio.locator("#autoSaveIndicator").innerText(), /Saved/);

    // 2. Structured Content Blocks insertion (S-03 / S-04)
    await studio.locator("#btnBlockCallout").click();
    await studio.locator("#sourceHtml").waitFor();
    const updatedSource = await studio.locator("#sourceHtml").inputValue();
    assert.match(updatedSource, /Key Takeaway/);

    // 3. Studio "👁 Preview in Reader" (S-11)
    await studio.locator("#btnPreviewInReader").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    assert.equal(
      await page.evaluate(() => document.querySelector("[data-studio-view]").hidden),
      true,
    );
    const readerTitle = await page.locator("[data-reader-title]").innerText();
    assert.ok(readerTitle.length > 0);
  });
});
