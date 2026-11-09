export class HtmlImportError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "HtmlImportError";
    this.code = code;
  }
}

const HTML_FILE_NAME = /\.html?$/i;
const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);
export const MAX_HTML_IMPORT_BYTES = 5 * 1024 * 1024;

export function validateHtmlFile(file) {
  if (!file || typeof file.text !== "function") {
    throw new HtmlImportError("unreadable-file", "Select a readable local HTML file.");
  }

  const name = typeof file.name === "string" ? file.name.trim() : "";
  const mimeType = typeof file.type === "string" ? file.type.split(";")[0].trim().toLowerCase() : "";
  if (!HTML_FILE_NAME.test(name) && !HTML_MIME_TYPES.has(mimeType)) {
    throw new HtmlImportError("unsupported-file", "Only .html and .htm documents are supported.");
  }

  if (!Number.isSafeInteger(file.size) || file.size < 0) {
    throw new HtmlImportError("unreadable-file", "The selected file's size could not be determined.");
  }
  if (file.size > MAX_HTML_IMPORT_BYTES) {
    throw new HtmlImportError("file-too-large", "HTML files must be no larger than 5 MiB.");
  }
  if (file.size === 0) {
    throw new HtmlImportError("empty-file", "The selected HTML file is empty.");
  }
}

export async function readHtmlFile(file) {
  validateHtmlFile(file);
  try {
    const sourceHtml = await file.text();
    if (typeof sourceHtml !== "string") {
      throw new TypeError("The file reader did not return text.");
    }
    if (!sourceHtml.trim()) {
      throw new HtmlImportError("empty-file", "The selected HTML file contains no content.");
    }
    return sourceHtml;
  } catch (error) {
    if (error instanceof HtmlImportError) throw error;
    throw new HtmlImportError(
      "unreadable-file",
      `Could not read "${file.name || "the selected HTML file"}".`,
      error,
    );
  }
}

export function parseHtmlSource(sourceHtml, documentObject = globalThis.document) {
  if (!documentObject || typeof documentObject.createElement !== "function") {
    throw new HtmlImportError("unsupported-browser", "This browser cannot parse HTML documents.");
  }

  const template = documentObject.createElement("template");
  try {
    template.innerHTML = sourceHtml;
  } catch (error) {
    throw new HtmlImportError("invalid-html", "The selected file could not be parsed as HTML.", error);
  }

  return {
    body: template.content,
    documentElement: {
      getAttribute(name) {
        return name.toLowerCase() === "lang" ? readHtmlLanguage(sourceHtml, documentObject) : null;
      },
    },
    querySelector: (selector) => template.content.querySelector(selector),
    querySelectorAll: (selector) => template.content.querySelectorAll(selector),
    template,
  };
}

function readHtmlLanguage(sourceHtml, documentObject) {
  const openingTag = findOpeningTag(sourceHtml, "html");
  if (!openingTag) return "";

  const template = documentObject.createElement("template");
  template.innerHTML = openingTag.replace(/^<html\b/i, "<div");
  return template.content.firstElementChild?.getAttribute("lang") ?? "";
}

function findOpeningTag(source, tagName) {
  const match = new RegExp(`<${tagName}\\b`, "i").exec(source);
  if (!match) return "";

  let quote = "";
  for (let index = match.index; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return source.slice(match.index, index + 1);
    }
  }
  return "";
}
