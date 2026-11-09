import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";
import test from "node:test";
import { importHtmlFile } from "../src/ingestion/document-importer.js";
import { MAX_HTML_IMPORT_BYTES, validateHtmlFile } from "../src/ingestion/html-parser.js";
import { sanitizeHtml } from "../src/ingestion/html-sanitizer.js";
import { selectRenderingStrategy } from "../src/ingestion/rendering-strategy.js";
import { openDatabase } from "../src/storage/database.js";
import { countDocuments, getDocument, getDocumentContent } from "../src/storage/document-repository.js";

test("sanitizes executable behavior, outbound navigation, remote assets, and unsafe CSS", () => {
  const browser = createBrowser();
  try {
    const result = sanitizeHtml(
      `<!doctype html><html><head>
        <title>Safe title</title>
        <style>
          @import url("https://tracker.example/style.css");
          article { color: #33271f; background-image: url("https://tracker.example/image.png"); }
          p { font-size: 1.2rem; }
        </style>
      </head><body onload="run()">
        <script>window.compromised = true</script>
        <h1 onclick="run()">Read this</h1>
        <a href="https://outside.example/chapter" target="_blank" data-htmlarts-external-href="javascript:run()">External chapter</a>
        <a href="#section">Local section</a>
        <a href="javascript:run()">Unsafe link</a>
        <img src="https://tracker.example/cover.png" alt="Cover">
        <img src="data:image/png;base64,AAAA" alt="Embedded art">
        <template><img src="https://tracker.example/deferred.png" alt="Deferred"></template>
        <form action="https://outside.example"><input value="private"></form>
        <iframe src="https://outside.example"></iframe>
        <svg><script>alert(1)</script><circle r="10"></circle></svg>
        <article id="section"><p style="color: #805b3d; background: url(https://tracker.example/x)">Body</p></article>
      </body></html>`,
      { document: browser.window.document, windowObject: browser.window },
    );
    const safeDocument = parseInertHtml(result.html, browser.window.document);

    assert.equal(safeDocument.querySelector("script, form, input, iframe, svg, link, base, template"), null);
    assert.equal(safeDocument.querySelector("meta:not([charset])"), null);
    assert.doesNotMatch(result.html, /\bonload=/i);
    assert.equal(safeDocument.querySelector("h1").hasAttribute("onclick"), false);
    assert.equal(safeDocument.querySelector("a[href^='javascript:']"), null);
    assert.equal(
      safeDocument.querySelector("a[data-htmlarts-external-href]")?.getAttribute("data-htmlarts-external-href"),
      "https://outside.example/chapter",
    );
    assert.equal(safeDocument.querySelector("a[target]"), null);
    assert.equal(safeDocument.querySelector("[data-htmlarts-external-href='javascript:run()']"), null);
    assert.equal(safeDocument.querySelector("a[href='#section']")?.textContent, "Local section");
    assert.equal(safeDocument.querySelector("img[src^='https://']"), null);
    assert.equal(safeDocument.querySelector("img[src^='data:image/png']")?.alt, "Embedded art");
    assert.match(safeDocument.body.textContent, /Cover/);
    assert.match(safeDocument.head.textContent, /font-size:\s*1\.2rem/i);
    assert.doesNotMatch(result.html, /@import|tracker\.example|background:\s*url/i);
    assert.ok(result.restrictions.some((restriction) => /CSS resource/i.test(restriction)));
    assert.ok(result.restrictions.length > 0);
  } finally {
    browser.window.close();
  }
});

test("preserves safe formatting and recognizes only the supported structured-folio shape", () => {
  const browser = createBrowser();
  try {
    const structured = sanitizeHtml(
      `<html><head><title>My publication</title><style>.page{color:#33271f}</style></head>
        <body><main><div class="stage"><article class="page" id="cover" data-name="Cover"><h1>Cover</h1></article>
        <article class="page" id="page-1" data-name="Chapter"><p><strong>Chapter text</strong></p></article></div>
        </main><script>run()</script></body></html>`,
      { document: browser.window.document, windowObject: browser.window },
    );
    const ordinary = sanitizeHtml(
      `<html><head><title>Styled article</title><style>.page{color:#33271f}</style></head>
        <body><main class="page"><h1>Article</h1><p>Content</p></main></body></html>`,
      { document: browser.window.document, windowObject: browser.window },
    );

    assert.match(structured.html, /<strong>Chapter text<\/strong>/);
    assert.match(structured.html, /\.page/);
    assert.deepEqual(selectRenderingStrategy(structured.html, browser.window.document), {
      strategy: "STRUCTURED_FOLIOS",
      folioCount: 2,
    });
    assert.deepEqual(selectRenderingStrategy(ordinary.html, browser.window.document), {
      strategy: "SAFE_ORIGINAL",
      folioCount: 0,
    });
  } finally {
    browser.window.close();
  }
});

test("imports a local HTML file with distinct source, safe content, metadata, and accurate feedback", async () => {
  const browser = createBrowser();
  const database = await openDatabase(new IDBFactory());
  const source = `<html lang="en"><head><title>  Research &amp; Notes  </title>
    <meta name="author" content="A. Reader"><meta name="description" content="A local paper">
    <style>p{line-height:1.6}</style></head><body><h1>Research</h1>
    <p onclick="steal()">Keep this paragraph.</p><script>steal()</script></body></html>`;
  try {
    const result = await importHtmlFile(
      database,
      makeFile("research.html", source),
      {
        documentObject: browser.window.document,
        windowObject: browser.window,
        createId: () => "imported-1",
      },
    );

    assert.equal(result.status, "imported");
    assert.equal(result.document.id, "imported-1");
    assert.equal(result.document.title, "Research & Notes");
    assert.equal(result.document.author, "A. Reader");
    assert.equal(result.document.description, "A local paper");
    assert.equal(result.document.language, "en");
    assert.equal(result.document.renderingStrategy, "SAFE_ORIGINAL");
    assert.equal(result.content.originalHtml, source);
    assert.doesNotMatch(result.content.safeHtml, /<script|onclick/);
    assert.match(result.message, /blocked for safe reading/i);
    assert.equal(await countDocuments(database), 1);
    assert.equal((await getDocument(database, "imported-1")).title, "Research & Notes");
    assert.equal((await getDocumentContent(database, "imported-1")).originalHtml, source);
  } finally {
    database.close();
    browser.window.close();
  }
});

test("uses a filename title fallback and preserves a valid legacy folio document", async () => {
  const browser = createBrowser();
  const database = await openDatabase(new IDBFactory());
  try {
    const result = await importHtmlFile(
      database,
      makeFile("field-notes.html", "<main><div class='stage'><article class='page' id='a' data-name='A'>One</article><article class='page' id='b' data-name='B'>Two</article></div></main>"),
      {
        documentObject: browser.window.document,
        windowObject: browser.window,
        createId: () => "folio-import",
      },
    );

    assert.equal(result.document.title, "field notes");
    assert.equal(result.document.renderingStrategy, "STRUCTURED_FOLIOS");
    assert.deepEqual(result.rendering, { strategy: "STRUCTURED_FOLIOS", folioCount: 2 });
  } finally {
    database.close();
    browser.window.close();
  }
});

test("rejects unsupported, empty, unreadable, and contentless imports without partial records", async () => {
  const browser = createBrowser();
  const database = await openDatabase(new IDBFactory());
  try {
    await assert.rejects(
      () => importHtmlFile(database, makeFile("notes.txt", "<p>Not an HTML file</p>"), browserOptions(browser)),
      { code: "unsupported-file" },
    );
    await assert.rejects(
      () => importHtmlFile(database, makeFile("empty.html", "   "), browserOptions(browser)),
      { code: "empty-file" },
    );
    await assert.rejects(
      () => importHtmlFile(database, { name: "broken.html", type: "text/html", size: 10, text: async () => { throw new Error("disk error"); } }, browserOptions(browser)),
      { code: "unreadable-file" },
    );
    await assert.rejects(
      () => importHtmlFile(database, makeFile("active-only.html", "<script>run()</script>"), browserOptions(browser)),
      { code: "no-safe-content" },
    );
    assert.equal(await countDocuments(database), 0);
  } finally {
    database.close();
    browser.window.close();
  }
});

test("enforces the 5 MiB HTML import limit before reading or persisting content", async () => {
  const browser = createBrowser();
  const database = await openDatabase(new IDBFactory());
  let readAttempted = false;
  const oversizedFile = {
    name: "oversized.html",
    type: "text/html",
    size: MAX_HTML_IMPORT_BYTES + 1,
    async text() {
      readAttempted = true;
      return "<p>Must not be read</p>";
    },
  };
  try {
    assert.doesNotThrow(() => validateHtmlFile({
      name: "maximum.html",
      type: "text/html",
      size: MAX_HTML_IMPORT_BYTES,
      text() {},
    }));
    await assert.rejects(
      () => importHtmlFile(database, oversizedFile, browserOptions(browser)),
      { code: "file-too-large", message: "HTML files must be no larger than 5 MiB." },
    );
    assert.equal(readAttempted, false);
    assert.equal(await countDocuments(database), 0);
  } finally {
    database.close();
    browser.window.close();
  }
});

test("duplicate generated identity fails without overwriting an existing document", async () => {
  const browser = createBrowser();
  const database = await openDatabase(new IDBFactory());
  const options = { ...browserOptions(browser), createId: () => "same-id" };
  try {
    await importHtmlFile(database, makeFile("first.html", "<h1>First</h1>"), options);
    await assert.rejects(
      () => importHtmlFile(database, makeFile("second.html", "<h1>Second</h1>"), options),
      { code: "duplicate-document" },
    );
    assert.equal(await countDocuments(database), 1);
    assert.equal((await getDocument(database, "same-id")).title, "First");
    assert.equal((await getDocumentContent(database, "same-id")).originalHtml, "<h1>First</h1>");
  } finally {
    database.close();
    browser.window.close();
  }
});

function createBrowser() {
  return new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://htmlarts.test/",
  });
}

function browserOptions(browser) {
  return { documentObject: browser.window.document, windowObject: browser.window };
}

function parseInertHtml(html, document) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return {
    querySelector: (selector) => template.content.querySelector(selector),
    querySelectorAll: (selector) => template.content.querySelectorAll(selector),
    body: template.content,
    head: {
      textContent: Array.from(template.content.querySelectorAll("style"), (style) => style.textContent).join(" "),
    },
  };
}

function makeFile(name, source) {
  return {
    name,
    type: /\.html?$/i.test(name) ? "text/html" : "text/plain",
    size: new TextEncoder().encode(source).length,
    async text() {
      return source;
    },
  };
}
