export const STUDIO_EXPORT_TYPE = "PAGESERVER_EXPORT_BOOK";
export const MAX_STUDIO_HTML_BYTES = 5 * 1024 * 1024;
const MAX_STUDIO_TEXT_FIELD_LENGTH = 160;

export function isExpectedFrameMessage(event, expectedFrameWindow, expectedOrigin = "null") {
  return Boolean(expectedFrameWindow) &&
    event.source === expectedFrameWindow &&
    event.origin === expectedOrigin;
}

export function validateStudioExportMessage(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.type !== STUDIO_EXPORT_TYPE) {
    throw new TypeError("The studio message type is not supported.");
  }
  const payload = data.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("The studio export payload is missing or malformed.");
  }
  if (typeof payload.title !== "string" || !payload.title.trim()) {
    throw new TypeError("The studio export requires a non-empty title.");
  }
  if (typeof payload.html !== "string" || !payload.html.trim()) {
    throw new TypeError("The studio export requires HTML content.");
  }
  const title = boundedText(payload.title, "title");
  const category = optionalBoundedText(payload.category, "category", "Architecture Guide");
  const genre = optionalBoundedText(payload.genre, "genre", "Spec");
  const template = optionalBoundedText(payload.template, "template", "Swiss Grid");
  const documentId = payload.documentId === undefined
    ? undefined
    : boundedText(payload.documentId, "document id");
  const sizeBytes = new TextEncoder().encode(payload.html).byteLength;
  if (sizeBytes > MAX_STUDIO_HTML_BYTES) {
    throw new RangeError("The studio export exceeds the 5 MiB limit. Export a smaller publication.");
  }
  return {
    title,
    category,
    genre,
    template,
    html: payload.html,
    sizeBytes,
    ...(documentId ? { documentId } : {}),
  };
}

function boundedText(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(`The studio export ${field} must be text.`);
  }
  const text = value.trim();
  if (!text || text.length > MAX_STUDIO_TEXT_FIELD_LENGTH) {
    throw new RangeError(`The studio export ${field} must be 1–${MAX_STUDIO_TEXT_FIELD_LENGTH} characters.`);
  }
  return text;
}

function optionalBoundedText(value, field, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new TypeError(`The studio export ${field} must be text.`);
  }
  return value.trim() ? boundedText(value, field) : fallback;
}
