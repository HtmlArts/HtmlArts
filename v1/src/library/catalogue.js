import { listDocuments } from "../storage/document-repository.js";

export async function listCatalogueDocuments(database) {
  const documents = await listDocuments(database);
  return documents.sort((left, right) => {
    const updatedOrder = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    return Number.isNaN(updatedOrder) || updatedOrder === 0
      ? left.title.localeCompare(right.title)
      : updatedOrder;
  });
}

export function filterCatalogueDocuments(documents, query, { type = "all", category = "all" } = {}) {
  const normalizedQuery = typeof query === "string" ? query.trim().toLocaleLowerCase() : "";
  const normalizedCategory = category.trim().toLocaleLowerCase();
  return documents.filter((item) => {
    if (type !== "all" && normalizeType(item.genre) !== type) return false;
    if (normalizedCategory !== "all" && item.category?.toLocaleLowerCase() !== normalizedCategory) {
      return false;
    }
    if (!normalizedQuery) return true;
    return (
      [item.title, item.description, item.author, item.category, item.genre, item.template, item.sourceFilename]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    );
  });
}

export async function renderCatalogue(
  database,
  document,
  listElement,
  emptyElement,
  query = "",
  { type = "all", category = "all", countElement = null } = {},
) {
  const allDocuments = await listCatalogueDocuments(database);
  const documents = filterCatalogueDocuments(allDocuments, query, { type, category });
  listElement.replaceChildren();
  emptyElement.hidden = documents.length > 0;
  emptyElement.textContent =
    allDocuments.length
      ? query.trim() && type === "all" && category === "all"
        ? "No publications match your search."
        : "No publications match these filters. Try another category or type."
      : "Your Space is ready for its first book or note. Import HTML or create something new.";
  if (countElement) {
    countElement.textContent = `${documents.length} ${documents.length === 1 ? "piece" : "pieces"} · ${allDocuments.length} in your library`;
  }

  const fragment = document.createDocumentFragment();
  for (const item of documents) {
    const card = document.createElement("li");
    card.className = "document-card";

    const cover = document.createElement("div");
    cover.className = `document-cover cover-${normalizeCoverKind(item.genre)}`;
    const coverLabel = document.createElement("span");
    coverLabel.className = "cover-category";
    coverLabel.textContent = item.category || "HtmlArts";
    const coverTitle = document.createElement("span");
    coverTitle.className = "cover-title";
    coverTitle.textContent = item.title;
    const coverRule = document.createElement("span");
    coverRule.className = "cover-rule";
    cover.append(coverLabel, coverTitle, coverRule);
    card.append(cover);

    const title = document.createElement("h3");
    title.textContent = item.title;
    card.append(title);

    const metadata = document.createElement("p");
    metadata.className = "document-meta";
    metadata.textContent = [item.author, item.genre, formatDate(item.updatedAt)]
      .filter(Boolean)
      .join(" · ");
    card.append(metadata);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      card.append(description);
    }

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = item.genre?.toLocaleLowerCase() === "note" ? "Open note" : "Read book";
    openButton.setAttribute("data-open-document", item.id);
    openButton.setAttribute("aria-label", `Open ${item.title}`);
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-quiet";
    editButton.textContent = "Edit details";
    editButton.setAttribute("data-edit-document", item.id);
    editButton.setAttribute("aria-label", `Edit details for ${item.title}`);
    const editContentButton = document.createElement("button");
    editContentButton.type = "button";
    editContentButton.className = "button button-quiet";
    editContentButton.textContent = "Edit content";
    editContentButton.setAttribute("data-edit-content", item.id);
    editContentButton.setAttribute("aria-label", `Edit content for ${item.title}`);
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button button-quiet document-remove";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("data-remove-document", item.id);
    removeButton.setAttribute("aria-label", `Remove ${item.title}`);
    const actions = document.createElement("div");
    actions.className = "document-card-actions";
    actions.append(openButton, editButton, editContentButton, removeButton);
    card.append(actions);
    fragment.append(card);
  }
  listElement.append(fragment);
  return documents;
}

export async function renderFeaturedCatalogue(database, document, listElement, emptyElement, limit = 5) {
  const documents = (await listCatalogueDocuments(database)).slice(0, limit);
  listElement.replaceChildren();
  emptyElement.hidden = documents.length > 0;

  const fragment = document.createDocumentFragment();
  for (const item of documents) {
    const card = document.createElement("li");
    card.className = "featured-card";

    const title = document.createElement("h3");
    title.textContent = item.title;
    card.append(title);

    const metadata = document.createElement("p");
    metadata.textContent = [item.author, item.category].filter(Boolean).join(" · ") || "HtmlArts publication";
    card.append(metadata);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "Read book";
    openButton.setAttribute("data-open-document", item.id);
    openButton.setAttribute("aria-label", `Open ${item.title}`);
    card.append(openButton);
    fragment.append(card);
  }
  listElement.append(fragment);
  return documents;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function normalizeType(value) {
  const normalized = typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
  if (normalized.includes("comic")) return "comic";
  if (normalized.includes("magazine")) return "magazine";
  if (normalized.includes("note")) return "note";
  return "book";
}

function normalizeCoverKind(value) {
  const type = normalizeType(value);
  return type === "book" ? "book" : type;
}
