import { getAnnotations, saveAnnotations } from "../storage/annotation-repository.js";
import { getDocumentContent } from "../storage/document-repository.js";

const PEN_COLORS = new Set(["#33271f", "#795234", "#b35c43", "#637b68", "#40566c"]);

export function createReaderController(
  document,
  database,
  { windowObject = document.defaultView ?? globalThis.window, onEditStudio } = {},
) {
  const view = required(document, "[data-reader-view]");
  const frame = required(document, "[data-reader-frame]");
  const inkCanvas = required(document, "[data-reader-ink]");
  const inkContext = typeof document.defaultView?.CanvasRenderingContext2D === "function"
    ? inkCanvas.getContext("2d", { alpha: true })
    : null;
  const title = required(document, "[data-reader-title]");
  const back = required(document, "[data-reader-back]");
  const contents = required(document, "[data-reader-toc]");
  const position = required(document, "[data-reader-position]");
  const status = required(document, "[data-reader-status]");
  const noteForm = required(document, "[data-note-form]");
  const noteInput = required(document, "#reader-note");
  const noteStatus = required(document, "[data-note-status]");
  const noteList = required(document, "[data-note-list]");
  const previous = required(document, "[data-reader-previous]");
  const next = required(document, "[data-reader-next]");
  const folioPosition = required(document, "[data-pen-folio]");
  const penTools = document.querySelectorAll("[data-pen-tool]");
  const applyHighlightButton = required(document, "[data-apply-highlight]");
  const colorButtons = document.querySelectorAll("[data-pen-color]");
  const undoButton = required(document, "[data-pen-undo]");
  const redoButton = required(document, "[data-pen-redo]");
  const clearButton = required(document, "[data-pen-clear]");
  const downloadButton = required(document, "[data-pen-download]");

  const studioButton = document.querySelector("[data-reader-studio]");
  const bookmarkButton = document.querySelector("[data-reader-bookmark]");
  const focusButton = document.querySelector("[data-reader-focus]");
  const fontSizeButtons = document.querySelectorAll("[data-reader-fontsize]");
  const themeButtons = document.querySelectorAll("[data-reader-theme]");
  const sidebarTabs = document.querySelectorAll("[data-sidebar-tab]");
  const sidebarPanes = document.querySelectorAll("[data-sidebar-pane]");
  const bookmarkList = document.querySelector("[data-bookmark-list]");
  const bookmarkEmpty = document.querySelector("[data-bookmark-empty]");
  const searchForm = document.querySelector("[data-search-form]");
  const searchInput = document.querySelector("[data-reader-search-input]");
  const searchStatus = document.querySelector("[data-reader-search-status]");
  const searchResults = document.querySelector("[data-reader-search-results]");

  let activeDocument = null;
  let activeContentHtml = "";
  let activeAnnotations = [];
  let navigationItems = [];
  let navigationIndex = 0;
  let drawing = null;
  let redoStack = [];
  let penTool = "pen";
  let penColor = "#b35c43";
  let pendingHighlightRange = null;
  let openingSequence = 0;
  let lastFocus = null;

  let currentTheme = "default";
  let currentFontSizePercent = 100;
  const THEME_STYLES = {
    paper: { bg: "#fbf8f1", color: "#33271f", link: "#805b3d", line: "#e6ddd0" },
    warm: { bg: "#f6ecd9", color: "#3a2d21", link: "#986d36", line: "#dfcca8" },
    light: { bg: "#ffffff", color: "#1c1c1c", link: "#2b5a8f", line: "#e0e0e0" },
    dark: { bg: "#201b17", color: "#e8ded2", link: "#c9a07a", line: "#38312b" },
  };

  back.addEventListener("click", close);
  required(document, "[data-reader-contents]").addEventListener("click", () => {
    required(document, "[data-reader-sidebar]").scrollIntoView({ block: "start" });
    contents.querySelector("button")?.focus();
  });
  previous.addEventListener("click", () => navigate(-1));
  next.addEventListener("click", () => navigate(1));
  noteForm.addEventListener("submit", saveNote);
  frame.addEventListener("load", prepareFrame);
  document.addEventListener("keydown", handleKeys);
  inkCanvas.addEventListener("pointerdown", beginInk);
  inkCanvas.addEventListener("pointermove", continueInk);
  inkCanvas.addEventListener("pointerup", finishInk);
  inkCanvas.addEventListener("pointercancel", finishInk);
  for (const button of penTools) {
    button.addEventListener("click", () => selectTool(button.dataset.penTool));
  }
  applyHighlightButton.addEventListener("click", applyHighlight);
  for (const button of colorButtons) {
    button.addEventListener("click", () => {
      penColor = button.dataset.penColor;
      for (const colorButton of colorButtons) {
        const selected = colorButton === button;
        colorButton.classList.toggle("selected", selected);
        colorButton.setAttribute("aria-pressed", String(selected));
      }
      selectTool("pen", false);
    });
  }
  undoButton.addEventListener("click", undoInk);
  redoButton.addEventListener("click", redoInk);
  clearButton.addEventListener("click", clearInk);
  downloadButton.addEventListener("click", downloadAnnotatedFolio);
  windowObject.addEventListener("resize", resizeInkCanvas);
  updatePenControls();

  if (studioButton) {
    studioButton.addEventListener("click", () => {
      if (!activeDocument) return;
      const docId = activeDocument.id;
      close();
      onEditStudio?.(docId);
    });
  }

  if (bookmarkButton) {
    bookmarkButton.addEventListener("click", toggleBookmark);
  }

  if (focusButton) {
    focusButton.addEventListener("click", () => {
      const isFocus = view.classList.toggle("focus-mode");
      focusButton.classList.toggle("active", isFocus);
      focusButton.setAttribute("aria-pressed", String(isFocus));
      focusButton.textContent = isFocus ? "⛶ Exit Focus" : "⛶ Focus";
    });
  }

  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      currentTheme = button.dataset.readerTheme;
      for (const b of themeButtons) {
        b.classList.toggle("active", b.dataset.readerTheme === currentTheme);
      }
      applyThemeAndFont();
    });
  }

  for (const button of fontSizeButtons) {
    button.addEventListener("click", () => {
      if (button.dataset.readerFontsize === "up") {
        currentFontSizePercent = Math.min(160, currentFontSizePercent + 15);
      } else {
        currentFontSizePercent = Math.max(75, currentFontSizePercent - 15);
      }
      applyThemeAndFont();
    });
  }

  for (const tab of sidebarTabs) {
    tab.addEventListener("click", () => {
      const target = tab.dataset.sidebarTab;
      for (const t of sidebarTabs) {
        const selected = t === tab;
        t.classList.toggle("active", selected);
        t.setAttribute("aria-selected", String(selected));
      }
      for (const pane of sidebarPanes) {
        pane.hidden = pane.dataset.sidebarPane !== target;
        pane.classList.toggle("active", pane.dataset.sidebarPane === target);
      }
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = searchInput?.value || "";
      performSearch(query);
    });
  }

  async function open(documentRecord) {
    const sequence = ++openingSequence;
    lastFocus = document.activeElement;
    status.textContent = "Opening publication…";
    view.hidden = false;
    document.querySelector("[data-catalog-view]").hidden = true;
    windowObject.scrollTo(0, 0);
    title.textContent = documentRecord.title;
    contents.replaceChildren();
    noteList.replaceChildren();
    noteStatus.textContent = "";
    activeAnnotations = [];
    activeContentHtml = "";
    redoStack = [];
    navigationItems = [];
    navigationIndex = 0;
    activeDocument = documentRecord;
    deactivatePen();
    back.focus({ preventScroll: true });

    try {
      const [content, annotationSet] = await Promise.all([
        getDocumentContent(database, documentRecord.id),
        getAnnotations(database, documentRecord.id),
      ]);
      if (sequence !== openingSequence || activeDocument?.id !== documentRecord.id) return;
      if (!content?.safeHtml) {
        throw new Error("This publication has no safe reading content and cannot be opened.");
      }

      activeAnnotations = annotationSet.strokes;
      renderNotes();
      renderBookmarks();
      updateBookmarkButton();
      if (searchInput) searchInput.value = "";
      if (searchStatus) searchStatus.textContent = "";
      if (searchResults) searchResults.replaceChildren();
      activeContentHtml = content.safeHtml;
      status.textContent = "Loading safe publication content…";
      frame.srcdoc = content.safeHtml;
    } catch (error) {
      if (sequence !== openingSequence) return;
      status.textContent = `The publication could not be opened: ${error.message}`;
      console.error("HtmlArts could not open the selected publication.", error);
    }
  }

  function close() {
    openingSequence += 1;
    activeDocument = null;
    activeContentHtml = "";
    activeAnnotations = [];
    redoStack = [];
    drawing = null;
    inkCanvas.classList.remove("enabled");
    pendingHighlightRange = null;
    applyHighlightButton.disabled = true;
    navigationItems = [];
    frame.srcdoc = "";
    view.hidden = true;
    document.querySelector("[data-catalog-view]").hidden = false;
    status.textContent = "";
    lastFocus?.focus?.();
  }

  function prepareFrame() {
    if (!activeDocument) return;
    let frameDocument;
    try {
      frameDocument = frame.contentDocument;
    } catch (error) {
      status.textContent = "The publication could not be safely accessed by the reader.";
      console.error("HtmlArts reader frame is inaccessible.", error);
      return;
    }
    if (!frameDocument?.body) {
      status.textContent = "The publication content is unavailable.";
      return;
    }

    const stage = findStructuredStage(frameDocument);
    if (activeDocument.renderingStrategy === "STRUCTURED_FOLIOS" && stage) {
      const folios = Array.from(stage.children).filter((element) =>
        element.matches("article.page[data-name]"),
      );
      if (folios.length >= 2 && folios.length === stage.children.length) {
        navigationItems = folios.map((element, index) => {
          element.style.setProperty("display", "none", "important");
          return {
            element,
            label: element.getAttribute("data-name") || headingText(element) || `Folio ${index + 1}`,
            kind: "folio",
          };
        });
      }
    }

    if (!navigationItems.length) {
      const headings = Array.from(frameDocument.body.querySelectorAll("h1, h2, h3"));
      navigationItems = headings.map((element, index) => {
        if (!element.id || headings.some((candidate) => candidate !== element && candidate.id === element.id)) {
          element.id = uniqueSectionId(frameDocument, index);
        }
        return { element, label: headingText(element) || `Section ${index + 1}`, kind: "section" };
      });
    }
    if (!navigationItems.length) {
      navigationItems = [{ element: frameDocument.body, label: activeDocument.title, kind: "section" }];
    }

    contents.replaceChildren();
    for (const [index, item] of navigationItems.entries()) {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => jumpTo(index));
      listItem.append(button);
      contents.append(listItem);
    }

    installExternalLinkConfirmation(frameDocument);
    frameDocument.addEventListener("selectionchange", updatePendingHighlight);
    applyThemeAndFont();
    renderBookmarks();
    updateBookmarkButton();

    const savedState = activeAnnotations.find(
      (item) => item?.type === "readingState" && typeof item.page === "number",
    );
    const initialIndex = savedState && savedState.page >= 0 && savedState.page < navigationItems.length
      ? savedState.page
      : 0;
    navigationIndex = initialIndex;
    jumpTo(initialIndex);
    resizeInkCanvas();
    status.textContent = "";
  }

  function installExternalLinkConfirmation(frameDocument) {
    frameDocument.addEventListener("click", (event) => {
      const anchor = event.target.closest?.("a[data-htmlarts-external-href]");
      if (!anchor) return;
      event.preventDefault();
      const destination = normalizeExternalLink(anchor.getAttribute("data-htmlarts-external-href"));
      if (!destination) {
        status.textContent = "This external link is not supported.";
        return;
      }
      if (!windowObject.confirm(`Open this external link?\n\n${destination}`)) return;
      const opened = windowObject.open(destination, "_blank", "noopener,noreferrer");
      if (!opened && !destination.startsWith("mailto:") && !destination.startsWith("tel:")) {
        status.textContent = "The browser blocked the new tab. Allow pop-ups to open this link.";
      }
    });
  }

  function applyThemeAndFont() {
    let frameDocument;
    try {
      frameDocument = frame.contentDocument;
    } catch {
      return;
    }
    if (!frameDocument?.head) return;
    let style = frameDocument.getElementById("htmlarts-reader-pref-style");
    if (!style) {
      style = frameDocument.createElement("style");
      style.id = "htmlarts-reader-pref-style";
      frameDocument.head.append(style);
    }
    if (currentTheme === "default") {
      if (currentFontSizePercent === 100) {
        style.textContent = "";
        return;
      }
      style.textContent = `
        html, body {
          font-size: ${currentFontSizePercent}% !important;
        }
      `;
      return;
    }
    const theme = THEME_STYLES[currentTheme] || THEME_STYLES.paper;
    style.textContent = `
      html, body {
        background: ${theme.bg} !important;
        color: ${theme.color} !important;
        font-size: ${currentFontSizePercent}% !important;
      }
      a { color: ${theme.link} !important; }
      hr { border-color: ${theme.line} !important; }
    `;
  }

  async function toggleBookmark() {
    if (!activeDocument) return;
    const page = navigationIndex;
    const existingIndex = activeAnnotations.findIndex(
      (item) => item?.type === "bookmark" && item.page === page,
    );
    let nextAnnotations;
    if (existingIndex >= 0) {
      nextAnnotations = activeAnnotations.filter((_, i) => i !== existingIndex);
      status.textContent = "Bookmark removed.";
    } else {
      const item = navigationItems[navigationIndex];
      const label = item?.label || `Page ${navigationIndex + 1}`;
      const bookmark = {
        type: "bookmark",
        id: createNoteId(),
        page,
        label,
        createdAt: new Date().toISOString(),
      };
      nextAnnotations = [...activeAnnotations, bookmark];
      status.textContent = `Bookmarked: ${label}`;
    }
    try {
      const saved = await saveAnnotations(database, activeDocument.id, nextAnnotations);
      activeAnnotations = saved.strokes;
      renderBookmarks();
      updateBookmarkButton();
    } catch (error) {
      status.textContent = `Could not update bookmark: ${error.message}`;
    }
  }

  function updateBookmarkButton() {
    if (!bookmarkButton) return;
    const isBookmarked = activeAnnotations.some(
      (item) => item?.type === "bookmark" && item.page === navigationIndex,
    );
    bookmarkButton.classList.toggle("active", isBookmarked);
    bookmarkButton.textContent = isBookmarked ? "🔖 Bookmarked" : "🔖 Bookmark";
  }

  function renderBookmarks() {
    if (!bookmarkList) return;
    bookmarkList.replaceChildren();
    const bookmarks = activeAnnotations.filter((item) => item?.type === "bookmark");
    if (bookmarkEmpty) {
      bookmarkEmpty.hidden = bookmarks.length > 0;
    }
    for (const bm of bookmarks) {
      const li = document.createElement("li");
      li.className = "bookmark-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bookmark-jump";
      btn.textContent = bm.label || `Page ${bm.page + 1}`;
      btn.addEventListener("click", () => {
        jumpTo(bm.page);
      });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "bookmark-remove";
      removeBtn.setAttribute("aria-label", "Remove bookmark");
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", async () => {
        const nextAnnotations = activeAnnotations.filter((item) => item?.id !== bm.id);
        try {
          const saved = await saveAnnotations(database, activeDocument.id, nextAnnotations);
          activeAnnotations = saved.strokes;
          renderBookmarks();
          updateBookmarkButton();
        } catch (error) {
          status.textContent = `Could not remove bookmark: ${error.message}`;
        }
      });
      li.append(btn, removeBtn);
      bookmarkList.append(li);
    }
  }

  function performSearch(query) {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const q = query.trim().toLowerCase();
    if (!q) {
      if (searchStatus) searchStatus.textContent = "Enter words to search in publication.";
      return;
    }
    let frameDocument;
    try {
      frameDocument = frame.contentDocument;
    } catch {
      return;
    }
    if (!frameDocument?.body) return;

    const matches = [];
    navigationItems.forEach((item, pageIndex) => {
      const text = item.element ? (item.element.innerText || item.element.textContent || "") : "";
      let pos = 0;
      while ((pos = text.toLowerCase().indexOf(q, pos)) !== -1) {
        const start = Math.max(0, pos - 36);
        const end = Math.min(text.length, pos + q.length + 36);
        const snippet = (start > 0 ? "…" : "") +
          text.slice(start, end).trim() +
          (end < text.length ? "…" : "");
        matches.push({ pageIndex, label: item.label, snippet });
        pos += q.length;
        if (matches.length >= 40) break;
      }
    });

    if (searchStatus) {
      searchStatus.textContent = matches.length === 0
        ? `No occurrences found for "${query}".`
        : `Found ${matches.length} ${matches.length === 1 ? "match" : "matches"}:`;
    }

    for (const match of matches) {
      const li = document.createElement("li");
      li.className = "search-item";
      const titleEl = document.createElement("strong");
      titleEl.textContent = match.label;
      const snippetEl = document.createElement("p");
      snippetEl.textContent = match.snippet;
      li.append(titleEl, snippetEl);
      li.addEventListener("click", () => {
        jumpTo(match.pageIndex);
      });
      searchResults.append(li);
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!activeDocument) return;
    const text = noteInput.value.trim();
    if (!text) {
      noteStatus.textContent = "Enter a note before saving.";
      return;
    }

    const note = {
      type: "note",
      id: createNoteId(),
      page: navigationIndex,
      text,
      createdAt: new Date().toISOString(),
    };
    const nextAnnotations = [...activeAnnotations, note];
    const submit = noteForm.querySelector("button[type='submit']");
    submit.disabled = true;
    noteStatus.textContent = "Saving note…";
    try {
      const saved = await saveAnnotations(database, activeDocument.id, nextAnnotations);
      activeAnnotations = saved.strokes;
      noteInput.value = "";
      renderNotes();
      noteStatus.textContent = "Your note was saved.";
    } catch (error) {
      noteStatus.textContent = `Your note could not be saved: ${error.message}`;
      console.error("HtmlArts annotation persistence failed.", error);
    } finally {
      submit.disabled = false;
    }
  }

  function renderNotes() {
    noteList.replaceChildren();
    const notes = activeAnnotations.filter(
      (annotation) => annotation?.type === "note" && typeof annotation.text === "string",
    );
    for (const note of notes) {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = note.text;
      item.append(text);
      if (note.createdAt) {
        const time = document.createElement("time");
        const date = new Date(note.createdAt);
        if (!Number.isNaN(date.getTime())) {
          time.dateTime = date.toISOString();
          time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
          item.append(time);
        }
      }
      noteList.append(item);
    }
  }

  function jumpTo(index) {
    if (index < 0 || index >= navigationItems.length) return;
    redoStack = redoStack.filter((stroke) => stroke.page === index);
    activateNavigationItem(index);
    navigationIndex = index;
    const item = navigationItems[index];
    if (item.kind === "folio") {
      for (const [folioIndex, folio] of navigationItems.entries()) {
        folio.element.style.setProperty(
          "display",
          folioIndex === index ? "block" : "none",
          "important",
        );
      }
    } else {
      item.element.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    updateNavigationControls();
    updateBookmarkButton();
    redrawInk();
    applyHighlightsForPage();
    persistReadingPosition(index);
  }

  function persistReadingPosition(index) {
    if (!activeDocument) return;
    const filtered = activeAnnotations.filter((item) => item?.type !== "readingState");
    const next = [...filtered, { type: "readingState", page: index, updatedAt: new Date().toISOString() }];
    activeAnnotations = next;
    saveAnnotations(database, activeDocument.id, next).catch(() => {});
  }

  function activateNavigationItem(index) {
    navigationIndex = index;
    for (const [itemIndex, listItem] of Array.from(contents.children).entries()) {
      const button = listItem.querySelector("button");
      if (itemIndex === index) button?.setAttribute("aria-current", "location");
      else button?.removeAttribute("aria-current");
    }
  }

  function navigate(delta) {
    jumpTo(Math.max(0, Math.min(navigationItems.length - 1, navigationIndex + delta)));
  }

  function updateNavigationControls() {
    position.textContent = navigationItems.length
      ? `${navigationIndex + 1} / ${navigationItems.length}`
      : "";
    previous.disabled = navigationIndex <= 0;
    next.disabled = navigationIndex >= navigationItems.length - 1;
    folioPosition.textContent = navigationItems.length
      ? `${navigationIndex + 1} / ${navigationItems.length}`
      : "0 / 0";
  }

  function selectTool(tool, toggle = true) {
    if (tool === "highlight") {
      penTool = tool;
      inkCanvas.classList.remove("enabled");
      for (const button of penTools) {
        const selected = button.dataset.penTool === tool;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      pendingHighlightRange = null;
      applyHighlightButton.disabled = true;
      status.textContent = "Select a passage in the book, then choose Add highlight.";
      return;
    }
    if (toggle && inkCanvas.classList.contains("enabled") && penTool === tool) {
      deactivatePen();
      return;
    }
    penTool = tool;
    inkCanvas.classList.add("enabled");
    for (const button of penTools) {
      const selected = button.dataset.penTool === tool;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    status.textContent = tool === "eraser"
      ? "Eraser active · erase marks on this folio"
      : "Pen active · draw over this folio";
    applyHighlightButton.disabled = true;
    pendingHighlightRange = null;
    updatePenControls();
  }

  function deactivatePen() {
    inkCanvas.classList.remove("enabled");
    for (const button of penTools) {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    }
    pendingHighlightRange = null;
    applyHighlightButton.disabled = true;
    status.textContent = "Pen tools off · publication links are available";
  }

  function updatePendingHighlight() {
    if (penTool !== "highlight") return;
    const selection = frame.contentWindow?.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      applyHighlightButton.disabled = !pendingHighlightRange;
      return;
    }
    pendingHighlightRange = selection.getRangeAt(0).cloneRange();
    applyHighlightButton.disabled = false;
  }

  async function applyHighlight() {
    status.textContent = "Applying highlight…";
    if (!activeDocument || !pendingHighlightRange) {
      status.textContent = "Select a passage in the book before adding a highlight.";
      return;
    }
    const range = pendingHighlightRange;
    const text = range.toString();
    const frameDocument = frame.contentDocument;
    const root = navigationItems[navigationIndex]?.kind === "folio"
      ? navigationItems[navigationIndex].element
      : frameDocument?.body;
    const offsets = getRangeOffsets(root, range);
    if (!text.trim() || !root || !offsets) {
      status.textContent = "The selected passage could not be located in the current folio.";
      return;
    }
    const context = getTextContent(root);
    const highlight = {
      type: "highlight",
      id: createNoteId(),
      page: navigationIndex,
      text,
      before: context.slice(Math.max(0, offsets.start - 48), offsets.start),
      after: context.slice(offsets.end, offsets.end + 48),
      createdAt: new Date().toISOString(),
    };
    const existing = activeAnnotations.some((item) =>
      item?.type === "highlight" &&
      item.page === navigationIndex &&
      item.text === highlight.text &&
      item.before === highlight.before &&
      item.after === highlight.after,
    );
    if (existing) {
      status.textContent = "That passage is already highlighted.";
      return;
    }
    const priorAnnotations = activeAnnotations;
    activeAnnotations = [...activeAnnotations, highlight];
    try {
      applyHighlightsForPage();
      await saveAnnotations(database, activeDocument.id, activeAnnotations);
      status.textContent = "Passage highlighted and saved.";
      frame.contentWindow.getSelection()?.removeAllRanges();
      pendingHighlightRange = null;
      applyHighlightButton.disabled = true;
    } catch (error) {
      activeAnnotations = priorAnnotations;
      removeHighlightMarks(highlight.id, frameDocument);
      applyHighlightsForPage();
      status.textContent = `The highlight could not be saved: ${error.message}`;
      console.error("HtmlArts highlight persistence failed.", error);
    }
  }

  function applyHighlightsForPage() {
    const frameDocument = frame.contentDocument;
    if (!frameDocument?.body) return;
    for (const highlight of activeAnnotations) {
      if (highlight?.type !== "highlight" || highlight.page !== navigationIndex) continue;
      if (Array.from(frameDocument.querySelectorAll("[data-htmlarts-highlight]"))
        .some((element) => element.getAttribute("data-htmlarts-highlight") === highlight.id)) continue;
      const root = navigationItems[navigationIndex]?.kind === "folio"
        ? navigationItems[navigationIndex].element
        : frameDocument.body;
      const range = findHighlightRange(root, highlight);
      if (range) wrapHighlightRange(range, highlight.id, frameDocument);
    }
  }

  function beginInk(event) {
    if (!activeDocument || !inkCanvas.classList.contains("enabled")) return;
    event.preventDefault();
    inkCanvas.setPointerCapture(event.pointerId);
    drawing = {
      type: "ink",
      page: navigationIndex,
      tool: penTool,
      color: penColor,
      width: penTool === "eraser" ? 0.03 : 0.006,
      points: [normalizedPoint(event)],
      createdAt: new Date().toISOString(),
    };
    drawStroke(drawing);
  }

  function continueInk(event) {
    if (!drawing) return;
    event.preventDefault();
    const events = typeof event.getCoalescedEvents === "function"
      ? event.getCoalescedEvents()
      : [event];
    for (const pointEvent of events) drawing.points.push(normalizedPoint(pointEvent));
    redrawInk();
  }

  async function finishInk() {
    if (!drawing) return;
    const stroke = drawing;
    drawing = null;
    if (!activeDocument) return;
    const priorAnnotations = activeAnnotations;
    activeAnnotations = [...activeAnnotations, stroke];
    redoStack = [];
    redrawInk();
    try {
      await persistInk();
      status.textContent = "Ink saved locally for this folio.";
    } catch (error) {
      activeAnnotations = priorAnnotations;
      redrawInk();
      status.textContent = `The ink could not be saved: ${error.message}`;
      console.error("HtmlArts ink persistence failed.", error);
    }
    updatePenControls();
  }

  async function undoInk() {
    const index = findCurrentInkIndex();
    if (index < 0) return;
    const priorAnnotations = activeAnnotations;
    const [stroke] = activeAnnotations.splice(index, 1);
    redoStack.push(stroke);
    redrawInk();
    try {
      await persistInk();
      status.textContent = "Last stroke undone.";
    } catch (error) {
      activeAnnotations = priorAnnotations;
      redoStack.pop();
      redrawInk();
      status.textContent = `The stroke could not be undone: ${error.message}`;
      console.error("HtmlArts ink undo failed.", error);
    }
    updatePenControls();
  }

  async function redoInk() {
    const stroke = redoStack.pop();
    if (!stroke) return;
    const priorAnnotations = activeAnnotations;
    activeAnnotations = [...activeAnnotations, stroke];
    redrawInk();
    try {
      await persistInk();
      status.textContent = "Stroke restored.";
    } catch (error) {
      activeAnnotations = priorAnnotations;
      redoStack.push(stroke);
      redrawInk();
      status.textContent = `The stroke could not be restored: ${error.message}`;
      console.error("HtmlArts ink redo failed.", error);
    }
    updatePenControls();
  }

  async function clearInk() {
    const currentInk = activeAnnotations.filter(isCurrentInk);
    if (!currentInk.length) return;
    if (!windowObject.confirm("Clear all pen marks on this folio?")) return;
    const priorAnnotations = activeAnnotations;
    activeAnnotations = activeAnnotations.filter((annotation) => !isCurrentInk(annotation));
    redoStack = [];
    redrawInk();
    try {
      await persistInk();
      status.textContent = "Pen marks cleared from this folio.";
    } catch (error) {
      activeAnnotations = priorAnnotations;
      redrawInk();
      status.textContent = `Pen marks could not be cleared: ${error.message}`;
      console.error("HtmlArts ink clear failed.", error);
    }
    updatePenControls();
  }

  async function persistInk() {
    if (!activeDocument) throw new Error("Open a publication before saving pen marks.");
    const saved = await saveAnnotations(database, activeDocument.id, activeAnnotations);
    activeAnnotations = saved.strokes;
  }

  function findCurrentInkIndex() {
    for (let index = activeAnnotations.length - 1; index >= 0; index -= 1) {
      if (isCurrentInk(activeAnnotations[index])) return index;
    }
    return -1;
  }

  function isCurrentInk(annotation) {
    return (
      (annotation?.type === "ink" || Array.isArray(annotation?.points)) &&
      annotation.page === navigationIndex
    );
  }

  function updatePenControls() {
    undoButton.disabled = findCurrentInkIndex() < 0;
    redoButton.disabled = redoStack.length === 0;
    clearButton.disabled = !activeAnnotations.some(isCurrentInk);
    downloadButton.disabled = !activeAnnotations.some(isCurrentInk);
  }

  function normalizedPoint(event) {
    const bounds = inkCanvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  function resizeInkCanvas() {
    if (!inkContext) return;
    const bounds = inkCanvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const ratio = Math.min(windowObject.devicePixelRatio || 1, 2);
    inkCanvas.width = Math.round(width * ratio);
    inkCanvas.height = Math.round(height * ratio);
    inkCanvas.style.width = `${width}px`;
    inkCanvas.style.height = `${height}px`;
    inkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    redrawInk();
  }

  function redrawInk() {
    if (!inkContext || !inkCanvas.width || !inkCanvas.height) return;
    const width = inkCanvas.clientWidth;
    const height = inkCanvas.clientHeight;
    inkContext.clearRect(0, 0, width, height);
    for (const stroke of activeAnnotations) {
      if (isCurrentInk(stroke)) drawStroke(stroke);
    }
    if (drawing?.page === navigationIndex) drawStroke(drawing);
    updatePenControls();
  }

  function drawStroke(stroke) {
    if (!inkContext || !Array.isArray(stroke.points) || !stroke.points.length) return;
    const width = inkCanvas.clientWidth;
    const height = inkCanvas.clientHeight;
    const scale = Math.min(width, height);
    inkContext.save();
    inkContext.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    inkContext.strokeStyle = PEN_COLORS.has(stroke.color) ? stroke.color : penColor;
    const storedWidth = Number(stroke.width);
    inkContext.lineWidth = Math.max(1, storedWidth > 0.1 ? storedWidth : storedWidth * scale || 3);
    inkContext.lineCap = "round";
    inkContext.lineJoin = "round";
    inkContext.beginPath();
    const first = pointCoordinates(stroke.points[0]);
    inkContext.moveTo(first.x * width, first.y * height);
    for (const point of stroke.points.slice(1)) {
      const coordinates = pointCoordinates(point);
      inkContext.lineTo(coordinates.x * width, coordinates.y * height);
    }
    if (stroke.points.length === 1) inkContext.lineTo(first.x * width + 0.1, first.y * height + 0.1);
    inkContext.stroke();
    inkContext.restore();
  }

  function downloadAnnotatedFolio() {
    if (!activeContentHtml || !activeDocument) {
      status.textContent = "Open a publication before downloading an annotated folio.";
      return;
    }
    let image;
    try {
      image = inkCanvas.toDataURL("image/png");
    } catch (error) {
      status.textContent = `The annotated folio could not be prepared: ${error.message}`;
      console.error("HtmlArts annotation export failed.", error);
      return;
    }
    const overlay = `<img alt="Hand-drawn annotations for folio ${navigationIndex + 1}" src="${image}" style="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647">`;
    const closingBody = /<\/body\s*>/i;
    const html = closingBody.test(activeContentHtml)
      ? activeContentHtml.replace(closingBody, `${overlay}</body>`)
      : `${activeContentHtml}${overlay}`;
    const blob = new windowObject.Blob([html], { type: "text/html;charset=utf-8" });
    const url = windowObject.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename(activeDocument.title)}-folio-${navigationIndex + 1}.html`;
    link.click();
    windowObject.setTimeout(() => windowObject.URL.revokeObjectURL(url), 1000);
    status.textContent = "Annotated folio download is ready.";
  }

  function handleKeys(event) {
    if (view.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft" && !isTextEntry(event.target)) navigate(-1);
    if (event.key === "ArrowRight" && !isTextEntry(event.target)) navigate(1);
  }

  return { open, close };
}

function findStructuredStage(frameDocument) {
  const stage = frameDocument.body.querySelector(".stage");
  const parent = stage?.parentElement;
  if (
    parent === frameDocument.body ||
    (parent?.localName === "main" && parent.parentElement === frameDocument.body)
  ) {
    return stage;
  }
  return null;
}

function getRangeOffsets(root, range) {
  if (!root || !range || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }
  try {
    const before = root.ownerDocument.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const through = root.ownerDocument.createRange();
    through.selectNodeContents(root);
    through.setEnd(range.endContainer, range.endOffset);
    return { start: before.toString().length, end: through.toString().length };
  } catch {
    return null;
  }
}

function getTextContent(root) {
  return root?.textContent ?? "";
}

function findHighlightRange(root, highlight) {
  const text = getTextContent(root);
  if (!highlight.text) return null;
  const candidates = [];
  let offset = text.indexOf(highlight.text);
  while (offset !== -1) {
    const before = text.slice(Math.max(0, offset - (highlight.before?.length ?? 0)), offset);
    const after = text.slice(offset + highlight.text.length, offset + highlight.text.length + (highlight.after?.length ?? 0));
    const beforeScore = matchingSuffixLength(before, highlight.before ?? "");
    const afterScore = matchingPrefixLength(after, highlight.after ?? "");
    candidates.push({
      start: offset,
      end: offset + highlight.text.length,
      score: beforeScore + afterScore,
    });
    offset = text.indexOf(highlight.text, offset + 1);
  }
  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (!best) return null;
  return rangeFromOffsets(root, best.start, best.end);
}

function rangeFromOffsets(root, start, end) {
  const nodes = textNodes(root);
  const startPoint = pointAtOffset(nodes, start);
  const endPoint = pointAtOffset(nodes, end);
  if (!startPoint || !endPoint) return null;
  const range = root.ownerDocument.createRange();
  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  return range;
}

function wrapHighlightRange(range, id, frameDocument) {
  const root = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  const offsets = getRangeOffsets(root, range);
  if (!offsets) return;
  const nodes = textNodes(root);
  const segments = [];
  let position = 0;
  for (const node of nodes) {
    const nodeStart = position;
    const nodeEnd = nodeStart + node.length;
    if (nodeEnd > offsets.start && nodeStart < offsets.end) {
      segments.push({
        node,
        start: Math.max(0, offsets.start - nodeStart),
        end: Math.min(node.length, offsets.end - nodeStart),
      });
    }
    position = nodeEnd;
  }
  for (const segment of segments.reverse()) {
    const { node, start, end } = segment;
    if (!node.isConnected || start >= end) continue;
    const parent = node.parentNode;
    if (!parent || parent.closest?.("[data-htmlarts-highlight]")) continue;
    if (end < node.length) node.splitText(end);
    const selected = start ? node.splitText(start) : node;
    const mark = frameDocument.createElement("mark");
    mark.setAttribute("data-htmlarts-highlight", id);
    mark.style.backgroundColor = "#f3d58f";
    mark.style.borderRadius = "0.12em";
    mark.style.color = "inherit";
    parent.replaceChild(mark, selected);
    mark.append(selected);
  }
}

function removeHighlightMarks(id, frameDocument) {
  for (const mark of Array.from(frameDocument.querySelectorAll("[data-htmlarts-highlight]"))) {
    if (mark.getAttribute("data-htmlarts-highlight") !== id) continue;
    mark.replaceWith(...mark.childNodes);
  }
}

function textNodes(root) {
  const document = root.ownerDocument;
  const walker = document.createTreeWalker(root, document.defaultView.NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function pointAtOffset(nodes, offset) {
  let position = 0;
  for (const node of nodes) {
    const end = position + node.length;
    if (offset <= end) return { node, offset: offset - position };
    position = end;
  }
  return null;
}

function matchingSuffixLength(text, context) {
  let length = 0;
  while (length < text.length && length < context.length &&
    text[text.length - length - 1] === context[context.length - length - 1]) length += 1;
  return length;
}

function matchingPrefixLength(text, context) {
  let length = 0;
  while (length < text.length && length < context.length && text[length] === context[length]) length += 1;
  return length;
}

function headingText(element) {
  return (element.getAttribute("data-name") || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function uniqueSectionId(document, index) {
  let suffix = index + 1;
  let id = `htmlarts-section-${suffix}`;
  while (document.getElementById(id)) {
    suffix += 1;
    id = `htmlarts-section-${suffix}`;
  }
  return id;
}

function normalizeExternalLink(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return "";
    if (url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

function createNoteId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pointCoordinates(point) {
  const x = Array.isArray(point) ? point[0] : point?.x;
  const y = Array.isArray(point) ? point[1] : point?.y;
  return { x: clamp(x), y: clamp(y) };
}

function clamp(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function safeFilename(value) {
  const normalized = value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
  return normalized || "HtmlArts";
}

function isTextEntry(element) {
  return element?.matches?.("input, textarea, select, [contenteditable='true']");
}

function required(document, selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Reader interface is missing "${selector}".`);
  return element;
}
