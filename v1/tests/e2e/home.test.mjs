import assert from "node:assert/strict";
import test from "node:test";
import { inBrowserTest, openApplication } from "./helpers.mjs";

test("home creates, features, and opens a publication", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.getByRole("heading", {
      name: "Create, read, design and publish beautiful HTML books.",
    }).waitFor();
    await page.getByRole("button", { name: /HTML Book Creator/ }).click();
    await page.locator("#publication-title").fill("Home Page Feature Journey");
    await page.locator("#publication-content").fill("A book created from the HtmlArts home page.");
    await page.getByRole("button", { name: "Save publication" }).click();

    await page.locator("[data-home-link]").click();
    const featuredBook = page.locator("[data-featured-list] [data-open-document]");
    await featuredBook.waitFor();
    assert.match(await featuredBook.getAttribute("aria-label"), /Home Page Feature Journey/);
    await featuredBook.click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    await page.getByRole("heading", { name: "Home Page Feature Journey" }).waitFor();
  });
});

test("template gallery creates a publication with the selected page style", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.getByRole("button", { name: "Page Templates" }).click();
    await page.getByRole("heading", { name: "Page Templates" }).waitFor();
    assert.equal(await page.locator("[data-template-select]").count(), 6);

    await page.getByRole("button", { name: "Use Botanical template" }).click();
    await page.locator("#publication-title").fill("Botanical Template Journey");
    await page.locator("#publication-content").fill("A page with a botanical reading palette.");
    assert.equal(await page.locator("#publication-template").inputValue(), "Botanical");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Botanical Template Journey",
    }).waitFor();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() => !document.querySelector("[data-reader-view]").hidden);
    const background = await page.locator("[data-reader-frame]").evaluate((frame) =>
      getComputedStyle(frame.contentDocument.body).backgroundColor,
    );
    assert.equal(background, "rgb(245, 245, 233)");
  });
});

test("catalog page filters the live library by publication kind", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.locator("[data-home-create]").click();
    await page.locator("#publication-title").fill("Catalog Filter Journey");
    await page.locator("#publication-content").fill("A book for the catalog.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.getByRole("button", { name: "Your Space", exact: true }).click();

    await page.locator("[data-catalogue-list]").getByRole("heading", {
      name: "Catalog Filter Journey",
    }).waitFor();
    await page.getByRole("button", { name: "Books", exact: true }).click();
    assert.match(await page.locator("[data-catalogue-count]").innerText(), /1 piece · 1 in your library/i);
    assert.equal(await page.locator("[data-catalogue-list] [data-open-document]").count(), 1);
    await page.getByRole("button", { name: "Comics", exact: true }).click();
    await page.getByText("No publications match these filters. Try another category or type.").waitFor();
  });
});

test("About dialog preserves the complete legacy note and closes accessibly", async (t) => {
  await inBrowserTest(t, async (page) => {
    await openApplication(page);
    await page.getByRole("button", { name: "@About" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Welcome to HtmlArts." });
    await dialog.waitFor();
    for (const text of [
      "A note about this place",
      "local-first library for reading, creating and collecting self-contained HTML books",
      "Local by nature",
      "Open format",
      "Reader first",
      "Made to grow",
      "GNU AGPLv3",
      "Open-source software",
    ]) {
      await dialog.getByText(new RegExp(text, "i")).waitFor();
    }

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement.matches("[data-about-open]")), true);
  });
});

test("home layout stays within a narrow mobile viewport", async (t) => {
  await inBrowserTest(t, async (page) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openApplication(page);
    await page.locator(".brand .brand-mark svg").waitFor();
    assert.equal(await page.locator(".brand-name").innerText(), "HtmlArts");
    const headerLayout = await page.evaluate(() => {
      const actions = document.querySelector(".header-actions").getBoundingClientRect();
      const search = document.querySelector(".global-search").getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        actionsLeft: actions.left,
        actionsRight: actions.right,
        searchLeft: search.left,
        searchRight: search.right,
      };
    });
    assert.ok(headerLayout.content <= headerLayout.viewport);
    assert.ok(headerLayout.actionsLeft >= 0);
    assert.ok(headerLayout.actionsRight <= headerLayout.viewport);
    assert.ok(headerLayout.searchLeft >= 0);
    assert.ok(headerLayout.searchRight <= headerLayout.viewport);
    assert.ok(headerLayout.searchRight - headerLayout.searchLeft > 250);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.equal(dimensions.content, dimensions.viewport);
    await page.getByRole("heading", {
      name: "Create, read, design and publish beautiful HTML books.",
    }).waitFor();

    await page.getByRole("button", { name: "Your Space", exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
    );
    await page.getByRole("button", { name: "Page Templates" }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
    );
    await page.getByRole("button", { name: "Use Botanical template" }).click();
    await page.locator("#publication-title").fill("Mobile Folio Journey");
    await page.locator("#publication-content").fill("A mobile publication for layout validation.");
    await page.getByRole("button", { name: "Save publication" }).click();
    await page.locator("[data-catalogue-list] [data-open-document]").click();
    await page.waitForFunction(() =>
      document.querySelector("[data-reader-frame]").contentDocument?.body?.innerText.includes(
        "A mobile publication for layout validation.",
      ),
    );
    await page.locator(".reader-brand .brand-mark svg").waitFor();
    assert.equal(await page.locator(".reader-brand").isVisible(), true);
    const readerLayout = await page.evaluate(() => {
      const toolbar = document.querySelector("[data-reader-pen-panel]").getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        toolbarLeft: toolbar.left,
        toolbarRight: toolbar.right,
      };
    });
    assert.ok(readerLayout.content <= readerLayout.viewport);
    assert.ok(readerLayout.toolbarLeft >= 0);
    assert.ok(readerLayout.toolbarRight <= readerLayout.viewport);

    await page.locator("[data-reader-back]").click();
    await page.getByRole("button", { name: "Design Studio" }).click();
    await page.locator(".studio-brand .brand-mark svg").waitFor();
    assert.equal(await page.locator(".studio-brand").isVisible(), true);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      true,
    );
  });
});
