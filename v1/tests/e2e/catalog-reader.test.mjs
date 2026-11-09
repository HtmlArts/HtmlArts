import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("create a publication, save a note, and restore it after reopening", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-create]").click();
    await page.locator("#publication-title").fill("E2E Reader Journey");
    await page.locator("#publication-content").fill("A first paragraph.\n\nA second paragraph.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "E2E Reader Journey",
    }).waitFor();

    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    assert.equal(
      await page.evaluate(() => document.activeElement.matches("[data-reader-back]")),
      true,
    );
    await page.locator("#reader-note").fill("Persist this browser note");
    await page.locator("[data-note-form] button[type='submit']").click();
    await page.getByText("Your note was saved.").waitFor();
    await page.locator("[data-reader-back]").click();
    assert.equal(
      await page.evaluate(() => document.activeElement.matches("[data-open-document]")),
      true,
    );
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.getByText("Persist this browser note").waitFor();

    assert.equal(await page.locator("[data-note-list]").innerText().then((text) =>
      text.includes("Persist this browser note")), true);
  });
});

test("surface an annotation persistence failure when local storage is removed", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-create]").click();
    await page.locator("#publication-title").fill("E2E Failure Journey");
    await page.locator("#publication-content").fill("Storage failure test.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase("htmlarts-v1-local-library");
          request.onsuccess = resolve;
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error("The test database could not be removed."));
        }),
    );
    await page.locator("#reader-note").fill("This note cannot be stored");
    await page.locator("[data-note-form] button[type='submit']").click();
    await page.getByText(/Your note could not be saved/).waitFor();
    assert.equal(await page.locator("[data-note-list]").innerText(), "");
  });
});
