import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("Your Space creates notes, edits metadata, exchanges details, and removes items safely", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-nav-page='catalogue']").click();
    await page.getByRole("heading", { name: "Your Space" }).waitFor();
    await page.locator("[data-space-create]").click();
    await page.locator("#publication-title").fill("Field Notes");
    await page.locator("#publication-genre").selectOption("Note");
    await page.locator("#publication-category").fill("Research");
    await page.locator("#publication-content").fill("A personal note that should remain after editing its details.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", { name: "Field Notes" }).waitFor();

    const firstItem = page.locator("[data-catalogue-list] [data-open-document]");
    const firstId = await firstItem.getAttribute("data-open-document");
    await page.getByRole("button", { name: "Edit details for Field Notes" }).click();
    const editor = page.locator("[data-document-edit-dialog]");
    await editor.locator("[name='title']").fill("Field Notes · Revised");
    await editor.locator("[name='author']").fill("A local reader");
    await editor.locator("[name='description']").fill("Notes for the current study.");
    await editor.getByRole("button", { name: "Save details" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Field Notes · Revised",
    }).waitFor();

    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument?.body?.innerText.includes(
        "A personal note that should remain after editing its details.",
      ),
    );
    await page.locator("[data-reader-back]").click();

    const metadataDownloadPromise = page.waitForEvent("download");
    await page.locator("[data-export-metadata]").click();
    const metadataDownload = await metadataDownloadPromise;
    assert.equal(metadataDownload.suggestedFilename(), "HtmlArts-library-metadata.json");
    const metadata = JSON.parse(await readFile(await metadataDownload.path(), "utf8"));
    assert.equal(metadata.schema, "htmlarts-library-metadata");
    assert.equal(metadata.documents[0].id, firstId);

    await page.locator("[data-space-create]").click();
    await page.locator("#publication-title").fill("Reading List");
    await page.locator("#publication-genre").selectOption("Note");
    await page.locator("#publication-content").fill("A second note in Your Space.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", { name: "Reading List" }).waitFor();

    await importMetadata(page, {
      schema: "htmlarts-library-metadata",
      version: 1,
      documents: [
        { id: firstId, title: "Merged Field Notes", genre: "Note", category: "Research" },
        { id: "unknown-source-item", title: "No local content" },
      ],
    });
    await page.locator("[data-metadata-import-dialog] [name='mode']").selectOption("merge");
    await page.locator("[data-metadata-import-dialog]").getByRole("button", { name: "Continue" }).click();
    await page.waitForFunction(() =>
      /Merged metadata for 1 item.*1 item.*not present locally/.test(
        document.querySelector("[data-app-status]").textContent,
      ),
    );
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Merged Field Notes",
    }).waitFor();
    await page.locator("[data-catalogue-list]").getByRole("heading", { name: "Reading List" }).waitFor();

    await importMetadata(page, {
      schema: "htmlarts-library-metadata",
      version: 1,
      documents: [{ id: firstId, title: "Kept Note", genre: "Note" }],
    });
    await page.locator("[data-metadata-import-dialog] [name='mode']").selectOption("replace");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("[data-metadata-import-dialog]").getByRole("button", { name: "Continue" }).click();
    await page.waitForFunction(() =>
      /Replaced metadata for 1 item.*removed 1 item/.test(
        document.querySelector("[data-app-status]").textContent,
      ),
    );
    await page.locator("[data-catalogue-list]").getByRole("heading", { name: "Kept Note" }).waitFor();
    assert.equal(await page.locator("[data-catalogue-list] [data-open-document]").count(), 1);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remove Kept Note" }).click();
    await page.getByText("Your Space is ready for its first book or note.").waitFor();
  });
});

async function importMetadata(page, manifest) {
  await page.locator("[data-metadata-input]").setInputFiles({
    name: "library-details.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(manifest)),
  });
  await page.locator("[data-metadata-import-dialog]").waitFor({ state: "visible" });
}
