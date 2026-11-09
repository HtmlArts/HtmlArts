import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("edit an existing publication in Studio, overwrite its content, and keep annotations", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-create]").click();
    await page.locator("#publication-title").fill("Studio Edit Journey");
    await page.locator("#publication-content").fill("The original words in this publication.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Studio Edit Journey",
    }).waitFor();

    const publicationId = await page.locator("[data-catalogue-list] [data-open-document]")
      .getAttribute("data-open-document");
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.locator("#reader-note").fill("Keep this annotation after editing.");
    await page.locator("[data-note-form] button[type='submit']").click();
    await page.getByText("Your note was saved.").waitFor();
    await page.locator("[data-reader-back]").click();

    await page.getByRole("button", { name: "Edit content for Studio Edit Journey" }).click();
    const studio = page.frameLocator("[data-studio-frame]");
    await studio.locator("#sourceHtml").waitFor();
    assert.match(await studio.locator("#sourceHtml").inputValue(), /The original words in this publication\./);
    await studio.locator("#docTitle").fill("Studio Edit Journey · Revised");
    await studio.locator("#docCategory").fill("Research");
    await studio.locator("#sourceHtml").fill(
      '<!doctype html><html><head><title>New body</title></head><body><main><h1>Updated in Studio</h1><p>The revised publication body.</p><script>window.compromised = true</script></main></body></html>',
    );
    await studio.locator("#btnPreviewSource").click();
    assert.equal(await studio.locator("#livePreviewFrame").getAttribute("sandbox"), "");
    await studio.locator("#btnSendToLibrary").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-app-status]").textContent.includes(
        'Updated "Studio Edit Journey · Revised" in your local library.',
      ),
    );

    const updatedCard = page.locator("[data-catalogue-list] [data-open-document]");
    assert.equal(await updatedCard.getAttribute("data-open-document"), publicationId);
    assert.match(await page.locator("[data-catalogue-list]").textContent(), /Studio Edit Journey · Revised/);
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument?.body?.innerText.includes(
        "The revised publication body.",
      ),
    );
    const reader = page.locator("[data-reader-frame]");
    const finalState = await reader.evaluate((frame) => ({
      heading: frame.contentDocument.querySelector("h1")?.textContent,
      scripts: frame.contentDocument.scripts.length,
    }));
    assert.equal(finalState.heading, "Updated in Studio");
    assert.equal(finalState.scripts, 0);
    assert.match(await page.locator("[data-note-list]").textContent(), /Keep this annotation after editing\./);
  });
});
