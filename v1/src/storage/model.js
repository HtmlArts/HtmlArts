export const SNAPSHOT_SCHEMA = "htmlarts-library-snapshot";
export const SNAPSHOT_VERSION = 1;

export function createDocument(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("A document must be an object.");
  }
  if (typeof input.id !== "string" || input.id.trim() === "") {
    throw new TypeError("A document requires a non-empty id.");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    throw new TypeError("A document requires a non-empty title.");
  }

  const now = new Date().toISOString();
  return {
    id: input.id,
    title,
    type: "DOCUMENT",
    category: nonEmptyString(input.category, "Personal"),
    genre: nonEmptyString(input.genre, "Book"),
    kind: nonEmptyString(input.kind, "created"),
    template: nonEmptyString(input.template, "Editorial"),
    color: nonEmptyString(input.color, "#805b3d"),
    renderingStrategy: nonEmptyString(input.renderingStrategy, "SAFE_ORIGINAL"),
    sourceFormat: nonEmptyString(input.sourceFormat, "text/html"),
    description: optionalString(input.description),
    author: optionalString(input.author),
    language: optionalString(input.language),
    sourceFilename: optionalString(input.sourceFilename),
    createdAt: validTimestamp(input.createdAt, now),
    updatedAt: validTimestamp(input.updatedAt, now),
    sizeBytes: nonNegativeNumber(input.sizeBytes, 0),
    visitCount: nonNegativeNumber(input.visitCount, 0),
  };
}

export function createDocumentContent(documentId, input = {}) {
  if (typeof documentId !== "string" || documentId.trim() === "") {
    throw new TypeError("Document content requires a document id.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Document content must be an object.");
  }

  return {
    documentId,
    originalHtml: typeof input.originalHtml === "string" ? input.originalHtml : "",
    safeHtml: typeof input.safeHtml === "string" ? input.safeHtml : "",
    legacyRenderedHtml:
      typeof input.legacyRenderedHtml === "string" ? input.legacyRenderedHtml : "",
    updatedAt: validTimestamp(input.updatedAt, new Date().toISOString()),
  };
}

export function createAnnotationSet(documentId, strokes, updatedAt = new Date().toISOString()) {
  if (typeof documentId !== "string" || documentId.trim() === "") {
    throw new TypeError("An annotation set requires a document id.");
  }
  if (!Array.isArray(strokes)) {
    throw new TypeError("Annotation strokes must be an array.");
  }

  return { documentId, strokes, updatedAt: validTimestamp(updatedAt, new Date().toISOString()) };
}

export function createSnapshot({ documents, contents, annotations }) {
  if (!Array.isArray(documents) || !Array.isArray(contents) || !Array.isArray(annotations)) {
    throw new TypeError("A snapshot must include documents, contents, and annotations arrays.");
  }

  return {
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    documents: documents.map(createDocument),
    contents: contents.map((content) => createDocumentContent(content.documentId, content)),
    annotations: annotations.map((item) =>
      createAnnotationSet(item.documentId, item.strokes, item.updatedAt),
    ),
  };
}

export function validateSnapshot(snapshot) {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    snapshot.schema !== SNAPSHOT_SCHEMA ||
    snapshot.version !== SNAPSHOT_VERSION
  ) {
    throw new TypeError("The file does not contain a supported HtmlArts library snapshot.");
  }

  const normalized = createSnapshot(snapshot);
  const documentIds = new Set(normalized.documents.map((document) => document.id));
  if (documentIds.size !== normalized.documents.length) {
    throw new TypeError("The snapshot contains duplicate document ids.");
  }

  for (const content of normalized.contents) {
    if (!documentIds.has(content.documentId)) {
      throw new TypeError(`Snapshot content references missing document "${content.documentId}".`);
    }
  }
  if (new Set(normalized.contents.map((content) => content.documentId)).size !== normalized.contents.length) {
    throw new TypeError("The snapshot contains duplicate document content records.");
  }
  for (const annotation of normalized.annotations) {
    if (!documentIds.has(annotation.documentId)) {
      throw new TypeError(`Snapshot annotations reference missing document "${annotation.documentId}".`);
    }
    if (
      new Set(normalized.annotations.map((annotation) => annotation.documentId)).size !==
      normalized.annotations.length
    ) {
      throw new TypeError("The snapshot contains duplicate annotation records.");
    }
  }

  return normalized;
}

function nonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validTimestamp(value, fallback) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function nonNegativeNumber(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
