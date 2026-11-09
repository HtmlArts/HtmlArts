import { APP_CONFIG } from "./configuration.js";
import {
  isExpectedFrameMessage,
  STUDIO_EXPORT_TYPE,
  validateStudioExportMessage,
} from "./frame-communication.js";
import { importHtmlFile } from "../ingestion/document-importer.js";
import { sanitizeHtml } from "../ingestion/html-sanitizer.js";
import { renderCatalogue, renderFeaturedCatalogue } from "../library/catalogue.js";
import { getPageTheme, renderTemplateGallery } from "../library/page-templates.js";
import { createReaderController } from "../reader/reader-engine.js";
import { openDatabase } from "../storage/database.js";
import {
  countDocuments,
  deleteDocument,
  getDocument,
  insertDocument,
  listDocuments,
  getDocumentContent,
  updateDocumentMetadata,
  updateDocumentContent,
} from "../storage/document-repository.js";
import {
  downloadLibrarySnapshot,
  hydrateFromSnapshotIfEmpty,
  readSnapshotFromDocument,
} from "../storage/library-snapshot.js";
import { migrateLegacyDatabase } from "../storage/legacy-migration.js";
import {
  createMetadataManifest,
  importMetadataManifest,
  validateMetadataManifest,
} from "../storage/library-metadata.js";
import { createDocument } from "../storage/model.js";

export async function mountApplication(document) {
  const status = required(document, "[data-app-status]");
  const snapshotActions = Array.from(document.querySelectorAll("[data-app-action]"));
  const createActions = Array.from(document.querySelectorAll("[data-home-create]"));
  const importAction = required(document, "[data-import-action]");
  const importInput = required(document, "[data-import-input]");
  const createPanel = required(document, "[data-create-panel]");
  const createForm = required(document, "[data-create-form]");
  const cancelCreate = required(document, "[data-cancel-create]");
  const catalogueList = required(document, "[data-catalogue-list]");
  const catalogueEmpty = required(document, "[data-catalogue-empty]");
  const catalogueSearch = required(document, "[data-catalogue-search]");
  const featuredList = required(document, "[data-featured-list]");
  const featuredEmpty = required(document, "[data-featured-empty]");
  const templateGrid = required(document, "[data-template-grid]");
  const catalogueCount = required(document, "[data-catalogue-count]");
  const pageTemplateInput = required(document, "[name='template']");
  const documentEditDialog = required(document, "[data-document-edit-dialog]");
  const documentEditForm = required(document, "[data-document-edit-form]");
  const metadataInput = required(document, "[data-metadata-input]");
  const metadataImportDialog = required(document, "[data-metadata-import-dialog]");
  const metadataImportForm = required(document, "[data-metadata-import-form]");
  const pageViews = document.querySelectorAll("[data-page-view]");
  const pageNavigation = document.querySelectorAll("[data-nav-page]");
  const typeFilters = document.querySelectorAll("[data-type-filter]");
  const categoryFilters = document.querySelectorAll("[data-category-filter]");
  const studioAction = required(document, "[data-home-studio]");
  const studioActions = document.querySelectorAll("[data-home-studio], [data-vault-studio]");
  const studioView = required(document, "[data-studio-view]");
  const studioFrame = required(document, "[data-studio-frame]");
  const studioBack = required(document, "[data-studio-back]");
  const studioStatus = required(document, "[data-studio-status]");
  const studioSource = required(document, "#htmlarts-studio-source");

  document.title = APP_CONFIG.name;
  status.textContent = "Opening your local library…";
  let database;

  try {
    database = await openDatabase();
    const migration = await migrateLegacyDatabase(database);
    let documentCount = await countDocuments(database);
    let hydrationStatus = "empty";
    let snapshotWarning = "";
    try {
      const snapshot = await readSnapshotFromDocument(document);
      const hydration = await hydrateFromSnapshotIfEmpty(database, snapshot);
      hydrationStatus = hydration.status;
      documentCount = await countDocuments(database);
    } catch (error) {
      if (documentCount === 0) throw error;
      snapshotWarning = ` The embedded file snapshot could not be read: ${error.message}`;
      console.error("HtmlArts embedded snapshot could not be read; keeping the runtime library.", error);
    }
    status.textContent = `${startupMessage(migration, hydrationStatus, documentCount)}${snapshotWarning}`;
  } catch (error) {
    status.textContent = `Your local library could not be opened: ${error.message}`;
    for (const snapshotAction of snapshotActions) snapshotAction.disabled = true;
    importAction.disabled = true;
    for (const createAction of createActions) createAction.disabled = true;
    for (const action of studioActions) action.disabled = true;
    throw error;
  }

  const reader = createReaderController(document, database);
  const catalogView = required(document, "[data-catalog-view]");
  required(document, "[data-page-view='catalogue']");
  renderTemplateGallery(document, templateGrid);
  let selectedType = "all";
  let selectedCategory = "all";
  const aboutModal = required(document, "[data-about-modal]");
  const aboutClose = required(document, "[data-about-close]");
  const aboutOpeners = document.querySelectorAll("[data-about-open]");
  const vaultTrigger = required(document, "[data-vault-trigger]");
  const vaultMenu = required(document, "[data-vault-menu]");
  let aboutOpener;
  const openAbout = (event) => {
    aboutOpener = event.currentTarget;
    closeVaultMenu();
    aboutModal.hidden = false;
    aboutClose.focus();
  };
  const closeAbout = () => {
    aboutModal.hidden = true;
    aboutOpener?.focus();
  };
  for (const opener of aboutOpeners) opener.addEventListener("click", openAbout);
  aboutClose.addEventListener("click", closeAbout);
  aboutModal.addEventListener("click", (event) => {
    if (event.target === aboutModal) closeAbout();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !aboutModal.hidden) closeAbout();
    if (event.key === "Escape" && vaultMenu.classList.contains("open")) {
      vaultMenu.classList.remove("open");
      vaultTrigger.setAttribute("aria-expanded", "false");
      vaultTrigger.focus();
    }
    if (event.key === "Tab" && !aboutModal.hidden) {
      const focusable = aboutModal.querySelectorAll("button, a, input, textarea, select, [tabindex]:not([tabindex='-1'])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  const closeVaultMenu = () => {
    vaultMenu.classList.remove("open");
    vaultTrigger.setAttribute("aria-expanded", "false");
  };
  vaultTrigger.addEventListener("click", () => {
    const isOpen = vaultMenu.classList.toggle("open");
    vaultTrigger.setAttribute("aria-expanded", String(isOpen));
  });
  for (const element of document.querySelectorAll("[data-vault-open]")) {
    element.addEventListener("click", () => {
      vaultMenu.classList.add("open");
      vaultTrigger.setAttribute("aria-expanded", "true");
      vaultTrigger.focus();
    });
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".vault-wrap") && !event.target.closest("[data-vault-open]")) {
      closeVaultMenu();
    }
  });
  for (const element of document.querySelectorAll("[data-vault-create]")) {
    element.addEventListener("click", () => {
      closeVaultMenu();
      createActions[0]?.click();
    });
  }
  for (const element of createActions) {
    element.addEventListener("click", () => openCreate());
  }
  for (const element of document.querySelectorAll("[data-refresh-action]")) {
    element.addEventListener("click", async () => {
      const error = await refreshCatalogue();
      status.textContent = error
        ? `Your local library could not be refreshed: ${errorMessage(error)}`
        : "Your library is refreshed. Changes are saved automatically on this device.";
    });
  }
  const closeStudio = () => {
    studioFrame.srcdoc = "";
    studioView.hidden = true;
    catalogView.hidden = false;
    studioEditingId = null;
    showPage("catalogue");
    studioAction.focus();
  };
  let studioEditingId = null;
  const openStudio = async (documentId) => {
    const source = studioSource.content.textContent;
    if (!source.trim()) {
      status.textContent = "The embedded Design Studio is unavailable in this HtmlArts file.";
      return;
    }
    let editMessage = null;
    if (documentId) {
      try {
        const [item, content] = await Promise.all([
          getDocument(database, documentId),
          getDocumentContent(database, documentId),
        ]);
        if (!item || !content) throw new Error("The publication content is unavailable in Your Space.");
        const html = content.originalHtml || content.safeHtml;
        if (!html) throw new Error("This publication has no editable HTML content.");
        studioEditingId = item.id;
        editMessage = {
          type: "HTMLARTS_EDIT_PUBLICATION",
          payload: {
            documentId: item.id,
            title: item.title,
            category: item.category,
            html,
            previewHtml: content.safeHtml || html,
          },
        };
      } catch (error) {
        status.textContent = `The publication could not be opened in Design Studio: ${errorMessage(error)}`;
        console.error("HtmlArts could not load publication content for Studio editing.", error);
        return;
      }
    } else {
      studioEditingId = null;
    }
    catalogView.hidden = true;
    studioView.hidden = false;
    studioStatus.textContent = "";
    if (editMessage) {
      studioFrame.addEventListener("load", () => {
        if (studioEditingId === editMessage.payload.documentId) {
          studioFrame.contentWindow.postMessage(editMessage, "*");
        }
      }, { once: true });
    }
    studioFrame.srcdoc = source;
    studioBack.focus();
  };
  for (const element of studioActions) {
    element.addEventListener("click", () => {
      closeVaultMenu();
      void openStudio();
    });
  }
  studioBack.addEventListener("click", closeStudio);

  document.defaultView.addEventListener("message", async (event) => {
    if (!isExpectedFrameMessage(event, studioFrame.contentWindow)) {
      console.warn("HtmlArts ignored a message from an unexpected frame or origin.");
      return;
    }
    if (event.data?.type !== STUDIO_EXPORT_TYPE) return;
    studioStatus.textContent = "Validating and saving the studio export…";
    try {
      const exported = validateStudioExportMessage(event.data);
      const sanitized = sanitizeHtml(exported.html, {
        document,
        windowObject: document.defaultView,
      });
      const timestamp = new Date().toISOString();
      let publication;
      if (exported.documentId) {
        if (exported.documentId !== studioEditingId) {
          throw new Error("The Studio edit does not match the publication currently being edited.");
        }
        ({ document: publication } = await updateDocumentContent(
          database,
          exported.documentId,
          { originalHtml: exported.html, safeHtml: sanitized.html },
          {
            title: exported.title,
            category: exported.category,
            sizeBytes: exported.sizeBytes,
          },
        ));
      } else {
        publication = createDocument({
          id: createDocumentId(document.defaultView),
          title: exported.title,
          kind: "created",
          category: exported.category,
          genre: exported.genre,
          template: exported.template,
          renderingStrategy: "SAFE_ORIGINAL",
          sourceFormat: "text/html",
          sizeBytes: exported.sizeBytes,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await insertDocument(database, publication, {
          originalHtml: exported.html,
          safeHtml: sanitized.html,
        });
      }
      const catalogueError = await refreshCatalogue();
      const verb = exported.documentId ? "Updated" : "Saved";
      status.textContent = `${verb} "${publication.title}" ${exported.documentId ? "in" : "from Design Studio to"} your local library.${catalogueError ? ` The catalog could not be refreshed: ${errorMessage(catalogueError)}` : ""}`;
      studioStatus.textContent = "";
      studioView.hidden = true;
      catalogView.hidden = false;
      studioEditingId = null;
      showPage("catalogue");
      studioFrame.srcdoc = "";
      studioAction.focus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The studio export could not be saved.";
      status.textContent = `The studio export could not be saved: ${message}`;
      studioStatus.textContent = `The studio export could not be saved: ${message}`;
      console.error("HtmlArts rejected or could not save a Design Studio export.", error);
    }
  });

  const refreshCatalogue = async () => {
    try {
      await renderCatalogue(
        database,
        document,
        catalogueList,
        catalogueEmpty,
        catalogueSearch.value,
        { type: selectedType, category: selectedCategory, countElement: catalogueCount },
      );
      await renderFeaturedCatalogue(database, document, featuredList, featuredEmpty);
    } catch (error) {
      status.textContent = `Your library could not be displayed: ${error.message}`;
      console.error("HtmlArts catalog refresh failed.", error);
      return error;
    }
    return null;
  };
  const showPage = (page, { refresh = true } = {}) => {
    for (const section of pageViews) section.hidden = section.dataset.pageView !== page;
    for (const button of pageNavigation) {
      const selected = button.dataset.navPage === page;
      button.classList.toggle("active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    closeVaultMenu();
    document.defaultView.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "catalogue" && refresh) refreshCatalogue();
  };
  const openCreate = (templateName = "Editorial") => {
    pageTemplateInput.value = templateName;
    createPanel.hidden = false;
    createPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    required(document, "#publication-title").focus();
  };
  required(document, "[data-space-create]").addEventListener("click", () => {
    showPage("catalogue", { refresh: false });
    openCreate();
  });
  const closeDocumentEditor = () => documentEditDialog.close();
  for (const button of document.querySelectorAll("[data-document-edit-cancel]")) {
    button.addEventListener("click", closeDocumentEditor);
  }
  const openDocumentEditor = async (documentId) => {
    try {
      const item = await getDocument(database, documentId);
      if (!item) throw new Error("This item is no longer in Your Space. Refresh and try again.");
      const form = documentEditForm;
      form.elements.namedItem("id").value = item.id;
      form.elements.namedItem("title").value = item.title;
      form.elements.namedItem("author").value = item.author;
      form.elements.namedItem("category").value = item.category;
      form.elements.namedItem("genre").value = item.genre;
      form.elements.namedItem("description").value = item.description;
      documentEditDialog.showModal();
      form.elements.namedItem("title").focus();
    } catch (error) {
      status.textContent = `The item details could not be opened: ${errorMessage(error)}`;
      console.error("HtmlArts could not load item details for editing.", error);
    }
  };
  documentEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(documentEditForm);
    try {
      await updateDocumentMetadata(database, String(values.get("id")), {
        title: String(values.get("title") ?? ""),
        author: String(values.get("author") ?? ""),
        category: String(values.get("category") ?? ""),
        genre: String(values.get("genre") ?? "Book"),
        description: String(values.get("description") ?? ""),
      });
      closeDocumentEditor();
      const error = await refreshCatalogue();
      status.textContent = error
        ? `Details were saved, but Your Space could not refresh: ${errorMessage(error)}`
        : "Item details saved in Your Space.";
    } catch (error) {
      status.textContent = `Item details could not be saved: ${errorMessage(error)}`;
      console.error("HtmlArts could not update item details.", error);
    }
  });
  catalogueList.addEventListener("click", async (event) => {
    const editContentButton = event.target.closest("[data-edit-content]");
    if (editContentButton) {
      await openStudio(editContentButton.dataset.editContent);
      return;
    }
    const editButton = event.target.closest("[data-edit-document]");
    if (editButton) {
      await openDocumentEditor(editButton.dataset.editDocument);
      return;
    }
    const removeButton = event.target.closest("[data-remove-document]");
    if (!removeButton) return;
    const item = await getDocument(database, removeButton.dataset.removeDocument).catch((error) => {
      status.textContent = `The item could not be loaded for removal: ${errorMessage(error)}`;
      console.error("HtmlArts could not load the item for removal.", error);
      return null;
    });
    if (!item || !document.defaultView.confirm(
      `Remove "${item.title}" and its saved notes and annotations from Your Space? This cannot be undone.`,
    )) return;
    try {
      await deleteDocument(database, item.id);
      const error = await refreshCatalogue();
      status.textContent = error
        ? `Removed "${item.title}", but Your Space could not refresh: ${errorMessage(error)}`
        : `Removed "${item.title}" and its saved notes from Your Space.`;
    } catch (error) {
      status.textContent = `The item could not be removed: ${errorMessage(error)}`;
      console.error("HtmlArts could not remove a library item.", error);
    }
  });
  for (const button of pageNavigation) {
    button.addEventListener("click", () => showPage(button.dataset.navPage));
  }
  for (const button of document.querySelectorAll("[data-home-templates]")) {
    button.addEventListener("click", () => showPage("templates"));
  }
  for (const button of document.querySelectorAll("[data-home-link]")) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showPage("home");
    });
  }
  for (const button of document.querySelectorAll("[data-home-library], [data-browse-catalog]")) {
    button.addEventListener("click", () => showPage("catalogue"));
  }
  for (const button of document.querySelectorAll("[data-home-top]")) {
    button.addEventListener("click", () => showPage("home"));
  }
  for (const button of typeFilters) {
    button.addEventListener("click", () => {
      selectedType = button.dataset.typeFilter;
      for (const filter of typeFilters) {
        const selected = filter === button;
        filter.classList.toggle("active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      }
      refreshCatalogue();
    });
  }
  for (const button of categoryFilters) {
    button.addEventListener("click", () => {
      selectedCategory = selectedCategory === button.dataset.categoryFilter
        ? "all"
        : button.dataset.categoryFilter;
      for (const filter of categoryFilters) {
        const selected = filter.dataset.categoryFilter === selectedCategory;
        filter.classList.toggle("active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      }
      showPage("catalogue");
    });
  }
  required(document, "[data-template-create]").addEventListener("click", () => openCreate());
  templateGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template-select]");
    if (button) openCreate(button.dataset.templateSelect);
  });
  await refreshCatalogue();

  for (const button of document.querySelectorAll("[data-export-metadata]")) {
    button.addEventListener("click", async () => {
      try {
        const manifest = createMetadataManifest(await listDocuments(database));
        const blob = new Blob([JSON.stringify(manifest, null, 2)], {
          type: "application/json;charset=utf-8",
        });
        downloadBlob(document, blob, "HtmlArts-library-metadata.json");
        status.textContent = "Library details were exported. Publication content and annotations are included in the library file, not this metadata file.";
      } catch (error) {
        status.textContent = `Library details could not be exported: ${errorMessage(error)}`;
        console.error("HtmlArts metadata export failed.", error);
      }
    });
  }
  let pendingMetadataManifest = null;
  for (const button of document.querySelectorAll("[data-import-metadata]")) {
    button.addEventListener("click", () => metadataInput.click());
  }
  metadataInput.addEventListener("change", async () => {
    const file = metadataInput.files?.[0];
    if (!file) return;
    try {
      pendingMetadataManifest = validateMetadataManifest(JSON.parse(await file.text()));
      metadataImportDialog.showModal();
    } catch (error) {
      pendingMetadataManifest = null;
      status.textContent = `The metadata file could not be read: ${errorMessage(error)}`;
      console.error("HtmlArts metadata import file was invalid.", error);
    }
  });
  const closeMetadataDialog = () => {
    metadataImportDialog.close();
    pendingMetadataManifest = null;
    metadataInput.value = "";
  };
  for (const button of document.querySelectorAll("[data-metadata-import-cancel]")) {
    button.addEventListener("click", closeMetadataDialog);
  }
  metadataImportForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingMetadataManifest) return;
    const mode = String(new FormData(metadataImportForm).get("mode") ?? "merge");
    if (mode === "replace" && !document.defaultView.confirm(
      "Replace Your Space details? Local items not listed in this file, including their content and annotations, will be removed. This cannot be undone.",
    )) return;
    try {
      const result = await importMetadataManifest(database, pendingMetadataManifest, mode);
      closeMetadataDialog();
      await refreshCatalogue();
      status.textContent = mode === "merge"
        ? `Merged metadata for ${result.updated} item(s); ${result.skipped} item(s) were not present locally and were left unchanged.`
        : `Replaced metadata for ${result.updated} item(s) and removed ${result.removed} item(s) not in the file.`;
      showPage("catalogue", { refresh: false });
    } catch (error) {
      status.textContent = `Metadata could not be imported: ${errorMessage(error)}`;
      console.error("HtmlArts metadata import failed.", error);
    }
  });

  catalogueSearch.addEventListener("input", () => {
    refreshCatalogue();
    if (catalogueSearch.value.trim()) showPage("catalogue", { refresh: false });
  });
  const openPublication = async (event) => {
    const button = event.target.closest("[data-open-document]");
    if (!button) return;
    try {
      const documents = await listDocuments(database);
      const selected = documents.find((item) => item.id === button.dataset.openDocument);
      if (!selected) {
        status.textContent = "That publication is no longer in your local library. Refresh the catalog and try again.";
        return;
      }
      await reader.open(selected);
    } catch (error) {
      status.textContent = `The publication could not be opened: ${error.message}`;
      console.error("HtmlArts could not load the selected publication.", error);
    }
  };
  catalogueList.addEventListener("click", openPublication);
  featuredList.addEventListener("click", openPublication);

  importAction.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const files = Array.from(importInput.files ?? []);
    if (!files.length) return;
    const outcomes = [];
    for (const file of files) {
      try {
        const result = await importHtmlFile(database, file, {
          documentObject: document,
          windowObject: document.defaultView,
        });
        outcomes.push(result.message);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The file could not be imported.";
        outcomes.push(`${file.name}: ${message}`);
        console.error(`HtmlArts could not import "${file.name}".`, error);
      }
    }
    const catalogueError = await refreshCatalogue();
    showPage("catalogue", { refresh: false });
    status.textContent = `${outcomes.join(" ")}${catalogueError ? ` The catalog could not be refreshed: ${errorMessage(catalogueError)}` : ""}`;
    importInput.value = "";
  });

  cancelCreate.addEventListener("click", () => {
    createPanel.hidden = true;
    createForm.reset();
  });
  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = createForm.querySelector("button[type='submit']");
    submit.disabled = true;
    status.textContent = "Saving your publication…";
    try {
      const formData = new FormData(createForm);
      const publicationTitle = String(formData.get("title") ?? "").trim();
      const templateName = String(formData.get("template") ?? "Editorial");
      const genre = String(formData.get("genre") ?? "Book");
      const category = String(formData.get("category") ?? "Personal").trim() || "Personal";
      const bodyText = String(formData.get("content") ?? "").trim();
      if (!publicationTitle || !bodyText) throw new Error("Enter a title and some publication text.");
      const originalHtml = createPublicationHtml(publicationTitle, bodyText, templateName);
      const sanitized = sanitizeHtml(originalHtml, {
        document,
        windowObject: document.defaultView,
      });
      const timestamp = new Date().toISOString();
      const publication = createDocument({
        id: createDocumentId(document.defaultView),
        title: publicationTitle,
        kind: "created",
        category,
        genre,
        template: templateName,
        renderingStrategy: "SAFE_ORIGINAL",
        sourceFormat: "text/html",
        sizeBytes: new TextEncoder().encode(originalHtml).byteLength,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await insertDocument(database, publication, {
        originalHtml,
        safeHtml: sanitized.html,
      });
      createForm.reset();
      createPanel.hidden = true;
      catalogueSearch.value = "";
      const catalogueError = await refreshCatalogue();
      showPage("catalogue", { refresh: false });
      status.textContent = `Created "${publication.title}" and saved it to your local library.${catalogueError ? ` The catalog could not be refreshed: ${errorMessage(catalogueError)}` : ""}`;
    } catch (error) {
      status.textContent = `Your publication could not be saved: ${error.message}`;
      console.error("HtmlArts publication creation failed.", error);
    } finally {
      submit.disabled = false;
    }
  });

  const exportSnapshot = async (event) => {
    const clickedAction = event.currentTarget;
    clickedAction.disabled = true;
    status.textContent = "Preparing your portable HtmlArts file…";
    try {
      await downloadLibrarySnapshot(database, document, APP_CONFIG.releaseFileName);
      status.textContent = "Your HtmlArtsV1.html snapshot is ready to save.";
    } catch (error) {
      status.textContent = `The portable file could not be created: ${error.message}`;
      console.error("HtmlArts snapshot export failed.", error);
    } finally {
      clickedAction.disabled = false;
    }
  };
  for (const snapshotAction of snapshotActions) snapshotAction.addEventListener("click", exportSnapshot);
}

function createPublicationHtml(title, bodyText, templateName = "Editorial") {
  const theme = getPageTheme(templateName);
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{margin:0;padding:clamp(2rem,8vw,6rem);background:${theme.background};color:${theme.ink};font-family:${theme.font};line-height:1.75}main{max-width:48rem;margin:auto}h1{color:${theme.accent};font-size:clamp(2.2rem,6vw,4rem);line-height:1.1}p{font-size:1.1rem}</style></head><body><main><article><h1>${escapeHtml(title)}</h1>${paragraphs}</article></main></body></html>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function createDocumentId(windowObject) {
  if (typeof windowObject?.crypto?.randomUUID === "function") {
    return windowObject.crypto.randomUUID();
  }
  throw new Error("A secure document identity could not be generated in this browser.");
}

function downloadBlob(document, blob, filename) {
  const url = document.defaultView.URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    document.defaultView.setTimeout(() => document.defaultView.URL.revokeObjectURL(url), 1000);
  }
}

function required(document, selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`HtmlArts application shell is missing "${selector}".`);
  return element;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : "The catalog could not be refreshed.";
}

function startupMessage(migration, hydrationStatus, documentCount) {
  let message;
  if (hydrationStatus === "hydrated" && documentCount > 0) {
    message = `Restored ${documentCount} document(s) from this HtmlArts file.`;
  } else if (migration.status === "migrated") {
    message = `Migrated ${documentCount} document(s) from your existing HtmlArts library.`;
  } else if (hydrationStatus === "existing-runtime-library") {
    message = `Your local library is ready · ${documentCount} document(s). Newer browser data was kept.`;
  } else {
    message = `Your local reading workspace is ready · ${documentCount} document(s).`;
  }

  if (migration.retainedLegacyRecordCount > 0) {
    const count = migration.retainedLegacyRecordCount;
    const recordLabel = count === 1 ? "record" : "records";
    message += ` ${count} legacy annotation/workspace ${recordLabel} without a matching document were left in the previous HtmlArts database.`;
  }
  return message;
}
