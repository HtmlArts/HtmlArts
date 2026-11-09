import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { JSDOM } from "jsdom";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "HtmlArtsV1.html"), "utf8");

test("release is one self-contained HtmlArtsV1.html document", () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<title>HtmlArts<\/title>/);
  assert.match(html, /<style>[\s\S]*<\/style>/);
  assert.match(html, /<script>[\s\S]*<\/script>/);
  assert.doesNotMatch(html, /<script[^>]+\bsrc\s*=/i);
  assert.doesNotMatch(html, /<link[^>]+\bhref\s*=/i);
  assert.doesNotMatch(html, /__HTMLARTS_INLINE_/);
  assert.equal((html.match(/<\/script>/gi) ?? []).length, 2);
});

test("release embeds the studio without remote font dependencies", () => {
  const browser = new JSDOM(html);
  const studio = browser.window.document.querySelector("#htmlarts-studio-source").content.textContent;
  assert.match(studio, /PageServer — Field Guide & Spec Sheet Studio/);
  assert.match(studio, /PAGESERVER_EXPORT_BOOK/);
  assert.match(studio, /<\\\/script>/);
  assert.doesNotMatch(studio, /fonts\.googleapis\.com/);
  assert.doesNotMatch(studio, /sent to your HtmlArts library shelf!/);
  assert.equal(
    browser.window.document.querySelector("#htmlarts-studio-source").content.querySelector("script"),
    null,
  );
  browser.window.close();
});

test("shell retains the product palette and home-page snapshot actions", () => {
  assert.match(html, /#fbf8f1/i);
  assert.match(html, /#33271f/i);
  assert.match(html, /Export App/);
  assert.match(html, /Download HtmlArtsV1\.html/);
  assert.match(html, /Design Studio/);
  assert.match(html, /HtmlArtsV1\.html/);
  assert.match(html, /data-about-modal/);
  assert.match(html, /A note about this place/);
});
