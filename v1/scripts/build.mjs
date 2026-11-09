import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const templatePath = path.join(root, "template.html");
const studioPath = path.join(root, "src", "studio", "PageServer.html");
const studioThemePath = path.join(root, "src", "studio", "studio-theme.css");
const outputPath = path.join(root, "HtmlArtsV1.html");

const template = await readFile(templatePath, "utf8");
const studioSource = await readFile(studioPath, "utf8");
const studioTheme = await readFile(studioThemePath, "utf8");
const cssPlaceholder = "/*__HTMLARTS_INLINE_CSS__*/";
const javascriptPlaceholder = "/*__HTMLARTS_INLINE_JS__*/";
const studioPlaceholder = "<!--__HTMLARTS_STUDIO_SOURCE__-->";
if (
  template.split(cssPlaceholder).length !== 2 ||
  template.split(javascriptPlaceholder).length !== 2 ||
  template.split(studioPlaceholder).length !== 2
) {
  throw new Error("The HTML template must contain one CSS, JavaScript, and studio-source placeholder.");
}
const embeddedStudio = studioSource
  .replace("</head>", `<style>${studioTheme.replace(/<\/style/gi, "<\\/style")}</style></head>`)
  .replace(/<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["'][^>]*>\s*/gi, "")
  .replace(/<link\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?[^"']+["']\s+rel=["']stylesheet["'][^>]*>\s*/gi, "")
  .replace(/alert\(`“\$\{title\}” sent to your HtmlArts library shelf!`\);/, "return;");
if (
  !embeddedStudio.includes("PAGESERVER_EXPORT_BOOK") ||
  embeddedStudio.includes("sent to your HtmlArts library shelf!")
) {
  throw new Error("The embedded PageServer must expose the expected studio-export message.");
}
const finalScriptEnd = embeddedStudio.toLowerCase().lastIndexOf("</script");
if (finalScriptEnd < 0) throw new Error("The embedded PageServer must contain its closing script tag.");
const safeStudioSource =
  embeddedStudio.slice(0, finalScriptEnd).replace(/<\/script/gi, "<\\/script") +
  embeddedStudio.slice(finalScriptEnd);

const result = await build({
  entryPoints: [path.join(root, "src/main.js")],
  bundle: true,
  write: false,
  format: "iife",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  outfile: "htmlarts-v1.js",
});

const javascript = result.outputFiles.find((file) => file.path.endsWith(".js"));
const stylesheet = result.outputFiles.find((file) => file.path.endsWith(".css"));
if (!javascript || !stylesheet) {
  throw new Error("The HtmlArts build must produce both bundled JavaScript and CSS.");
}

const inlineCss = stylesheet.text.replace(/<\/style/gi, "<\\/style");
const inlineJavaScript = javascript.text.replace(/<\/script/gi, "<\\/script");
const output = template
  .replace(studioPlaceholder, () => escapeHtmlText(safeStudioSource))
  .replace(cssPlaceholder, () => inlineCss)
  .replace(javascriptPlaceholder, () => inlineJavaScript);

if (output.includes("__HTMLARTS_INLINE_")) {
  throw new Error("The HTML template contains an unresolved inline bundle placeholder.");
}

await writeFile(outputPath, output, "utf8");
console.log(`Built ${path.relative(root, outputPath)} (${Buffer.byteLength(output)} bytes).`);

function escapeHtmlText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
