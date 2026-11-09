import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("reject a foreign frame export and persist a sanitized Design Studio export", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.evaluate(() => {
      const foreign = document.createElement("iframe");
      document.body.append(foreign);
      window.dispatchEvent(new MessageEvent("message", {
        source: foreign.contentWindow,
        origin: "null",
        data: {
          type: "PAGESERVER_EXPORT_BOOK",
          payload: { title: "Foreign export", html: "<h1>Must not persist</h1>" },
        },
      }));
      foreign.remove();
    });
    await page.waitForTimeout(20);
    assert.equal(await page.locator("[data-catalogue-list] li").count(), 0);

    await page.getByRole("button", { name: "Design Studio", exact: true }).click();
    const studio = page.frameLocator("[data-studio-frame]");
    const studioBody = studio.locator("body");
    const chromeColors = await studioBody.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      primaryButton: getComputedStyle(element.querySelector(".btn.primary")).backgroundColor,
    }));
    assert.equal(chromeColors.background, "rgb(255, 253, 250)");
    assert.equal(chromeColors.primaryButton, "rgb(128, 91, 61)");
    await studio.locator("#btnSendToLibrary").click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "How do two black boxes communicate?",
    }).waitFor();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    const content = await page.locator("[data-reader-frame]").evaluate((frame) => ({
      heading: frame.contentDocument.querySelector("h1")?.textContent,
      scripts: frame.contentDocument.scripts.length,
    }));
    assert.equal(content.heading, "How do two black boxes communicate?");
    assert.equal(content.scripts, 0);
  });
});
