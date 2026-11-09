import assert from "node:assert/strict";
import test from "node:test";
import { importHtml, inBrowserTest, openApplication } from "./helpers.mjs";

test("import offline, neutralize executable HTML, and require outbound-link confirmation", async (t) => {
  await inBrowserTest(t, async (page) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openApplication(page, { offline: true });
    await importHtml(
      page,
      "offline-security-fixture.html",
      '<!doctype html><html><head><title>Offline Security Fixture</title></head><body><main><h1>Overview</h1><h2>Details</h2><p>Readable offline text.</p><a href="https://example.com/">External destination</a><script>window.compromised = true</script></main></body></html>',
    );
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() =>
      !document.querySelector("[data-reader-view]").hidden &&
      document.querySelectorAll("[data-reader-toc] button").length === 2,
    );
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-position]").textContent === "2 / 2",
    );
    assert.equal(
      await page.locator("[data-reader-toc] button[aria-current='location']").innerText(),
      "Details",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    const frame = page.locator("[data-reader-frame]");
    const safeDocument = await frame.evaluate((element) => ({
      scripts: element.contentDocument.scripts.length,
      externalHref: element.contentDocument.querySelector("a")?.getAttribute("href"),
      text: element.contentDocument.body.innerText,
    }));
    assert.equal(safeDocument.scripts, 0);
    assert.equal(safeDocument.externalHref, null);
    assert.match(safeDocument.text, /Readable offline text/);

    await page.evaluate(() => {
      window.__htmlartsConfirmCount = 0;
      window.confirm = () => {
        window.__htmlartsConfirmCount += 1;
        return false;
      };
    });
    await page.frameLocator("[data-reader-frame]").locator("a[data-htmlarts-external-href]").click();
    assert.equal(await page.evaluate(() => window.__htmlartsConfirmCount), 1);
    assert.equal(await page.locator("[data-reader-toc] button").count(), 2);
  });
});

test("reject an HTML file over 5 MiB before it enters the library", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    const limit = 5 * 1024 * 1024;
    await page.locator("[data-import-input]").setInputFiles({
      name: "maximum.html",
      mimeType: "text/html",
      buffer: Buffer.alloc(limit, 120),
    });
    await page.waitForFunction(() =>
      document.querySelector("[data-app-status]").textContent.includes(
        "and saved it to your local library.",
      ),
    );
    assert.equal(await page.locator("[data-catalogue-list] li").count(), 1);

    await page.locator("[data-import-input]").setInputFiles({
      name: "oversized.html",
      mimeType: "text/html",
      buffer: Buffer.alloc(limit + 1, 120),
    });
    await page.waitForFunction(() =>
      document.querySelector("[data-app-status]").textContent.includes(
        "HTML files must be no larger than 5 MiB.",
      ),
    );
    assert.match(
      await page.locator("[data-app-status]").textContent(),
      /oversized\.html: HTML files must be no larger than 5 MiB\./,
    );
    assert.equal(await page.locator("[data-catalogue-list] li").count(), 1);
  });
});
