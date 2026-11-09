# Your Space and Integrated Studio

## Product intent

This note translates the product requirements in [`../PRDSpecifiction.md`](../PRDSpecifiction.md) into the v1 experience for the local library and its authoring/reading tools. The requirements describe one user-owned mini library, usable online or offline, with its books, notes, annotations, and the HtmlArts tools in one portable HTML file.

The relevant requirements are:

- **03 — Reading experience:** a comfortable, navigable place for books and notes.
- **04 — Integrated Studio:** write and edit material, highlight and annotate reading, and create personal notes without leaving the library.
- **05 — Mini Library management:** browse, organize, add, rename, remove, and manage the collection.
- **06–10 — Import, save, sharing, metadata exchange, and offline access:** grow a library without losing it, exchange updates deliberately, and keep core functions available offline.

## Your Space

Your Space is the user's personal collection, not a discovery marketplace. It is the home for every publication and note currently stored in the local library.

### User actions

1. Browse all saved items, search by title/author/category, and filter by item type.
2. Add material by importing HTML, creating a book, or writing a personal note.
3. Open an item in the reader, or edit its catalog details (title, author, category, type, and description).
4. Remove an item only after a clear confirmation. Removal deletes its content and associated annotations together.
5. Export the complete library as a standalone `HtmlArtsV1.html` snapshot. The snapshot retains content and annotations; it is the portable/shareable library.
6. Export/import a metadata manifest separately. Merge updates metadata for matching item IDs and preserves local content and annotations. Unknown IDs are reported rather than turned into empty documents. Replace is allowed only when every incoming ID exists locally; it updates matching metadata and removes local items absent from the manifest after explicit confirmation.

### Acceptance checks

- Search, type filters, and category filters update the visible item list and count.
- Create/import results appear in Your Space and can be opened.
- Updating catalog details does not alter source HTML or annotations.
- Removing an item requires confirmation and removes its content and annotations transactionally.
- A portable snapshot remains the complete transfer/share operation; metadata manifests never pretend to contain publication bodies.
- Merge never deletes a local item. Replace explains its impact and is blocked if the manifest references content not present in the local library.

## Integrated Studio and Reader

The Design Studio remains the visual authoring surface for creating publications. Its output crosses the established sandbox, message validation, size bound, and sanitization boundary before becoming a library item.

Within the same HtmlArts workspace:

- The Studio is used to compose and export a new publication; accepted exports are saved to Your Space.
- Existing publications can be opened in the Studio's HTML source editor, previewed in an isolated frame, and saved over the same library item.
- The Reader is used to read, navigate, select and highlight passages, draw with the pen, and save personal notes against the open publication.
- Notes created from Your Space are standalone library items and can be reopened like books.
- Catalog details remain independently editable in Your Space.
- Studio chrome uses HtmlArts' warm paper, ink, and brown-accent palette. Page artwork and author-selected accent palettes inside a publication remain under the author's control.
- Both views return to the user's library without losing already persisted work.

### Acceptance checks

- A valid Studio export is saved once, appears in Your Space, and opens in the safe Reader.
- Editing content keeps the document ID, creation date, other catalog metadata, and saved annotations. Title and category values from Studio are applied to the item; exported HTML is sanitized before storage.
- Studio source previews disable scripts and external network requests; the Reader opens only the sanitized saved HTML.
- An invalid or foreign-frame export does not change the library.
- Highlight, pen ink, and notes are stored with the selected publication and restored when it is reopened.
- Studio controls and chrome use the HtmlArts palette without forcibly recoloring authored page previews.
- Studio, Reader, and Your Space remain usable at narrow viewport widths and with keyboard navigation.

## Deliberate boundaries

- This local-first v1 does not implement online accounts, remote collection discovery, or AI generation; those services are explicitly outside the downloaded-library experience.
- The collection is currently a flat set of documents with category/type filters, not a nested folder/collection hierarchy.
- Studio content edits replace the current publication; version history and undoing a saved replacement are not provided in v1.
- Metadata manifests synchronize catalog details only. Moving missing publication bodies requires importing source HTML or opening a complete library snapshot.
- Sharing uses the portable standalone library file; no server-backed or automatic cloud sharing is implied.
