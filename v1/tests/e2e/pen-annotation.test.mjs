import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("reader pen draws, persists, undoes, redoes, clears, and downloads a folio", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-create]").click();
    await page.locator("#publication-title").fill("Pen Panel Journey");
    await page.locator("#publication-content").fill("A folio to annotate with the HtmlArts pen.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument?.body?.innerText.includes(
        "A folio to annotate with the HtmlArts pen.",
      ),
    );
    await page.waitForFunction(() => document.querySelector("[data-pen-folio]").textContent === "1 / 1");

    await page.locator('[data-pen-tool="highlight"]').click();
    await page.frameLocator("[data-reader-frame]").locator("body").selectText();
    await page.locator("[data-apply-highlight]").click();
    await page.waitForFunction(() => {
      const message = document.querySelector("[data-reader-status]").textContent;
      return message.includes("highlighted") || message.includes("could not be saved");
    });
    assert.equal(await page.locator("[data-reader-status]").textContent(), "Passage highlighted and saved.");
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument
        ?.querySelectorAll("[data-htmlarts-highlight]").length > 0,
    );

    await page.getByRole("button", { name: "Sage green" }).click();
    const canvas = page.locator("[data-reader-ink]");
    const bounds = await canvas.boundingBox();
    assert.ok(bounds && bounds.width > 100 && bounds.height > 100);
    await page.evaluate(() => {
      window.__inkEvents = [];
      const element = document.querySelector("[data-reader-ink]");
      for (const type of ["pointerdown", "pointermove", "pointerup"]) {
        element.addEventListener(type, () => window.__inkEvents.push(type));
      }
      document.addEventListener("pointerdown", (event) => {
        window.__inkEvents.push(`target:${event.target.tagName}`);
      }, true);
    });
    const pointerStartTarget = await page.evaluate(({ x, y }) =>
      document.elementFromPoint(x, y)?.tagName,
    { x: bounds.x + 30, y: bounds.y + 140 });
    await page.mouse.move(bounds.x + 30, bounds.y + 140);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 160, bounds.y + 200, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const pointerDiagnostics = await page.evaluate(() => ({
      events: window.__inkEvents,
      enabled: document.querySelector("[data-reader-ink]").classList.contains("enabled"),
    }));
    assert.equal(pointerStartTarget, "CANVAS", JSON.stringify(pointerDiagnostics));
    assert.ok(pointerDiagnostics.events.includes("pointerdown"), JSON.stringify(pointerDiagnostics));
    assert.ok(pointerDiagnostics.events.includes("pointerup"), JSON.stringify(pointerDiagnostics));
    await page.getByText("Ink saved locally for this folio.").waitFor();
    await page.waitForFunction(() => !document.querySelector("[data-pen-undo]").disabled);

    await page.locator("[data-reader-back]").click();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    await page.waitForFunction(() => !document.querySelector("[data-pen-undo]").disabled);
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument
        ?.querySelectorAll("[data-htmlarts-highlight]").length > 0,
    );

    await page.locator("[data-pen-undo]").click();
    await page.waitForFunction(() => document.querySelector("[data-pen-undo]").disabled);
    await page.waitForFunction(() => !document.querySelector("[data-pen-redo]").disabled);
    await page.locator("[data-pen-redo]").click();
    await page.waitForFunction(() => !document.querySelector("[data-pen-undo]").disabled);

    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-pen-download]").click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /Pen_Panel_Journey-folio-1\.html/);

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("[data-pen-clear]").click();
    await page.waitForFunction(() => document.querySelector("[data-pen-undo]").disabled);
  });
});
