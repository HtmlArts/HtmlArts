import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium, firefox, webkit } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appUrl = pathToFileURL(path.join(root, "HtmlArtsV1.html")).href;
const browserEngines = { chromium, firefox, webkit };

export async function inBrowserTest(testContext, run) {
  const engineName = process.env.PLAYWRIGHT_BROWSER || "chromium";
  const browserType = browserEngines[engineName];
  if (!browserType) {
    throw new Error(`Unsupported PLAYWRIGHT_BROWSER "${engineName}". Use chromium, firefox, or webkit.`);
  }
  const launchOptions = engineName === "chromium" && process.env.CHROME_EXECUTABLE
    ? { executablePath: process.env.CHROME_EXECUTABLE, headless: true }
    : engineName === "chromium"
      ? { channel: "chrome", headless: true }
      : { headless: true };
  const browser = await browserType.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await run(page, context);
  } catch (error) {
    const screenshotDirectory = path.join(tmpdir(), "htmlarts-e2e-failures");
    await mkdir(screenshotDirectory, { recursive: true });
    const name = testContext.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    await page.screenshot({ path: path.join(screenshotDirectory, `${name}.png`), fullPage: true });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function openApplication(page, { offline = false } = {}) {
  if (offline) {
    await page.route("https://**/*", (route) => route.abort());
    await page.route("http://**/*", (route) => route.abort());
  }
  await page.goto(appUrl, { waitUntil: "load" });
  await page.waitForFunction(() =>
    document.querySelector("[data-app-status]")?.textContent.includes("ready"),
  );
}

export async function importHtml(page, name, html) {
  await page.evaluate(
    ({ fileName, source }) => {
      const input = document.querySelector("[data-import-input]");
      const transfer = new DataTransfer();
      transfer.items.add(new File([source], fileName, { type: "text/html" }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { fileName: name, source: html },
  );
  await page.waitForFunction(() =>
    /Imported|could not import/i.test(document.querySelector("[data-app-status]")?.textContent ?? ""),
  );
}
