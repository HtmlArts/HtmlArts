# HtmlArts Unified Product Requirements Specification

**Product:** HtmlArts

**Document type:** Unified product and functional specification

**Version:** Draft 1.0

**Created:** 2026-11-09

**Status:** Draft updated with product-owner decisions; remaining environment details pending

**Source branch reviewed:** `dev` at `659f7b6` (same commit as `origin/dev` when fetched)
**Authority:** The user-selected engineering-review direction: document-first ingestion, safe rendering, storage consistency, and defer plugin ingestion.

> This specification consolidates the current product intent with the selected engineering-review recommendations. It describes desired user-visible behavior and constraints, not a prescribed code structure or an implementation plan. Where earlier local product documents conflict with this direction, the decisions and scope boundaries below take precedence pending review.

## 1. Product Summary

HtmlArts is a local-first library and reading workspace for HTML publications. Users can create and organize publications, import HTML documents, read them in a dedicated interface, and keep annotations in their own browser. The product retains its existing colors, tone, and UI identity while treating imported HTML as untrusted content.

All imported HTML enters the library as a **document**. Its identity and source are distinct from how it is displayed. The reader may present a document as sanitized original content, as recognized structured folios, or through an automatic reading layout. Imported scripts do not run by default.

HtmlArts does not require a remote account or service for its core library and reading workflows. Runtime state is stored in browser IndexedDB, and users can explicitly save a portable snapshot as the single release artifact, `HtmlArtsV1.html`. The initial product scope is a reliable document platform, not an open-ended executable plugin platform.

## 2. Product Goals

1. Make it straightforward to create, import, organize, and read HTML documents locally.
2. Preserve the existing reader experience, including navigation, table of contents, and annotations.
3. Keep document source and reader presentation separate so that importing a document does not misidentify what it is.
4. Prevent imported content from silently executing code or initiating unexpected network activity.
5. Protect library and annotation consistency during saves, imports, and data migrations.
6. Make expected offline behavior and limitations clear to users.
7. Establish testable behavior before adding new platform or plugin capabilities.

## 3. Users and Primary Needs

### Independent reader or researcher

Needs to keep a personal collection of HTML publications available locally, read them comfortably, and retain annotations across visits.

### Technical author or designer

Needs to create or import a publication, preserve its structure and visual content where safe, and continue using available design-studio workflows.

### Privacy-conscious or offline user

Needs core library and reading operations to work without a cloud account and wants external content or active behavior to be controlled rather than silently trusted.

## 4. Scope Baseline

- **Discovery method:** Review of the current application shell and reader, the supplied engineering review and product/architecture documents, the repository README and test scripts, and the user's selection of the engineering-review direction.
- **Items discovered:** User-facing capabilities and risks across library/catalog, document creation and import, reading and annotations, local persistence, and shell-to-reader communication. This is a product scope inventory, not an exhaustive source-file count.
- **Items in scope:** The existing local library and reader experience plus the foundation required for predictable, safe document ingestion and consistent persistence.
- **Scope exclusions:** New plugin execution/ingestion, a new hosted backend, and a broad visual redesign.

### 4.1 In scope

- Local catalog and existing library navigation.
- Creating publications using the product's existing creation flow.
- Importing HTML files through a single document ingestion contract.
- Producing and reopening one portable `HtmlArtsV1.html` release/snapshot; no alternate release package format is required.
- Persisting active runtime state in IndexedDB and allowing the user to explicitly save a portable snapshot containing the local library and annotations.
- Maintaining the established HtmlArts colors, tone, and UI identity.
- Keeping original source distinct from processed/safe reader content.
- Separating document identity from rendering strategy.
- Reading documents, navigating available folios/sections, and using the existing table of contents.
- Creating, saving, and reopening annotations associated with the correct document.
- Reliable local persistence and a non-destructive path for existing library data.
- Validated communication between the application shell and the reader or existing studio frame.
- Clear, recoverable user feedback for invalid input and storage or import failures.

### 4.2 Out of scope for this specification

- Loading arbitrary third-party HTML as an application plugin or granting it application privileges.
- Executing scripts embedded in imported publications by default.
- Cloud accounts, cloud synchronization, server-side storage, or a required network connection.
- A new marketplace, community template store, MCP service, or external agent gateway.
- A wholesale replacement of the current visual identity or reader interaction model.
- Additional release package formats besides `HtmlArtsV1.html`.
- Native APK/Desktop packaging changes, beyond preserving current behavior where directly affected by this scope.
- Claims of production readiness or fixed performance guarantees without reproducible tests on a defined reference environment.

## 5. Product and Architecture Decisions for This Draft

1. **Document-first identity:** Every imported HTML file is registered as a document. CSS, class names, or markup patterns may inform a rendering choice, but must not change its identity or imply that it is trusted executable software.
2. **Source/presentation separation:** Preserve the imported source as source material and maintain a distinct safe representation for reading. A rendering strategy is presentation metadata, not a document type.
3. **Safe by default:** Imported scripts, inline event handlers, unsafe URL schemes, forms, and other active behavior are not trusted or executed by default. Inert text, styles, and supported visual elements may be preserved subject to sanitization.
4. **No plugin ingestion in this phase:** Existing design-studio experiences may remain as product features, but arbitrary HTML modules do not become privileged extensions.
5. **Local-first core:** A user must be able to use the core local catalog and reader without a cloud account. Network-dependent resources must not be silently required for core reading.
6. **Migration before removal:** Any consolidation of legacy persistence must preserve existing documents, metadata, and annotations. Legacy data must not be deleted until migration and integrity checks succeed.
7. **Security boundaries are explicit:** Sandboxing, sender checks, message validation, and payload validation are required together; an opaque iframe origin must not be treated as proof of trust.
8. **Performance claims require evidence:** Existing aspirational latency statements are not acceptance criteria until measured against a representative corpus and documented reference environment.
9. **One release artifact:** Modular source is allowed for maintainability, but the release deliverable is one self-contained `HtmlArtsV1.html`; no second runtime package format is required.
10. **Two persistence lifecycles:** IndexedDB is the active runtime store. An explicit user-triggered file snapshot provides portable local persistence; the product must not imply that a browser silently overwrote a file when it only produced a download.
11. **Visual continuity:** Rebuild the architecture without changing the existing product's colors, tone, or overall UI identity, except for focused usability or accessibility corrections.

## 6. User Scenarios and Acceptance Tests

### User Story 1 — Import and read an HTML document (Priority: P1)

As a reader, I want to import an HTML file and read it in HtmlArts so that I can keep a personal publication library.

**Why this priority:** Import and reading are the core value of the product.

**Independent test:** Start with an empty library, import a valid local HTML publication, locate it in the catalog, and open it in the reader.

**Acceptance scenarios:**

1. **Given** a supported HTML file, **when** the user imports it, **then** HtmlArts adds one document with a usable title and visible success feedback.
2. **Given** an imported document with recognizable structured folios, **when** the user opens it, **then** its content is presented as folios without changing its document identity.
3. **Given** an ordinary article with headings and styles, **when** it is imported, **then** it remains a document and is not classified as an executable book or plugin merely because it contains CSS or matching class names.
4. **Given** a malformed, empty, unsupported, or unreadable file, **when** import is attempted, **then** the user receives a clear error and no partial catalog entry is reported as successfully imported.

### User Story 2 — Read safely and predictably (Priority: P1)

As a reader, I want imported publications displayed without their embedded code taking control, so that I can read unfamiliar files with confidence.

**Why this priority:** Safe treatment of untrusted HTML is a prerequisite for opening arbitrary local documents.

**Independent test:** Import a test document containing scripts, event handlers, unsafe links, and benign text/formatting; open it and verify allowed content remains readable while disallowed behavior does not execute.

**Acceptance scenarios:**

1. **Given** an imported document containing executable scripts or inline event handlers, **when** it is rendered, **then** those behaviors do not run by default.
2. **Given** an imported document containing a dangerous URL scheme or an active form, **when** it is rendered, **then** the unsafe behavior is removed or rendered inert.
3. **Given** a document with supported benign text, styles, and visual content, **when** it is rendered, **then** sanitization preserves the supported reading content to the extent safe.
4. **Given** content that cannot be safely preserved, **when** the document is opened, **then** HtmlArts handles it without executing it and communicates any material limitation to the user.

### User Story 3 — Return to and manage the local catalog (Priority: P1)

As a reader, I want to return from a publication to my catalog and find my documents, so that the reader remains part of a coherent library workflow.

**Why this priority:** The reader must connect reliably to the local library rather than strand the user in a separate view.

**Independent test:** Open a document from the catalog, use the reader's return control, and confirm the catalog remains usable and reflects the same document.

**Acceptance scenarios:**

1. **Given** a document is open in the reader, **when** the user chooses the return-to-catalog control, **then** the reader closes and the user returns to the catalog.
2. **Given** a saved document, **when** the user revisits the catalog, **then** its title and available catalog metadata remain visible.
3. **Given** the user creates a publication through the existing creation flow, **when** saving succeeds, **then** it is available in the catalog and can be opened.

### User Story 4 — Annotate and resume reading (Priority: P1)

As a reader, I want my annotations associated with the correct publication and retained locally, so that my reading work is not lost between sessions.

**Why this priority:** Annotations are a key part of the existing reading experience and must survive storage or architecture changes.

**Independent test:** Annotate a document, close and reopen it, and verify the annotation is still attached to that document.

**Acceptance scenarios:**

1. **Given** a user adds an annotation while reading, **when** persistence succeeds, **then** it is associated with that document and the interface confirms the save.
2. **Given** a document with saved annotations, **when** the user reopens it, **then** its annotations are restored and annotations from another document are not shown.
3. **Given** annotation persistence fails, **when** the user is still in the reader, **then** the failure is surfaced rather than shown as a successful save.

### User Story 5 — Keep existing local data during upgrades (Priority: P1)

As an existing user, I want my library and annotations to survive application data changes, so that foundational improvements do not erase my work.

**Why this priority:** Data loss would undermine trust in a local-first library.

**Independent test:** Seed the previous supported data shape, run the upgrade path, and compare document, metadata, and annotation counts/content before and after.

**Acceptance scenarios:**

1. **Given** existing library records in a supported legacy shape, **when** an upgrade runs, **then** records are copied into the canonical representation and integrity is verified before legacy data is eligible for cleanup.
2. **Given** a migration fails or is interrupted, **when** the application is reopened, **then** it reports/retries the migration safely and does not present incomplete data as a successful migration.
3. **Given** migrated records, **when** users open documents and annotations, **then** their content and relationships remain intact.

### User Story 6 — Use core library functions offline (Priority: P2)

As a privacy-conscious or offline user, I want locally available documents to remain usable without a remote service, so that my library is not cloud-dependent.

**Why this priority:** Local-first operation differentiates the product, while offline polish can follow the security and data-integrity foundation.

**Independent test:** With the application and imported content available locally, disable network access and test catalog, reader, navigation, and annotations.

**Acceptance scenarios:**

1. **Given** the application and document are available locally, **when** the network is unavailable, **then** catalog, reading, navigation, and local annotation workflows remain usable.
2. **Given** a publication refers to external resources, **when** the user is offline or external loading is disabled, **then** the core reader remains usable and missing resources do not break the application shell.

### User Story 7 — Save and reopen a portable library snapshot (Priority: P1)

As a library owner, I want to save my local library and annotations into the standalone HtmlArts file and reopen that file later, so that I have a portable copy independent of browser storage.

**Why this priority:** IndexedDB supports active sessions, while a portable file is the user's durable, transferable copy.

**Independent Test:** Create or import a document, add an annotation, trigger the file snapshot, reopen the resulting `HtmlArtsV1.html` in a clean browser profile, and verify that the document and annotation are available.

**Acceptance Scenarios:**

1. **Given** the user has locally persisted documents and annotations, **when** they explicitly save a file snapshot, **then** the product produces one `HtmlArtsV1.html` containing the snapshot data.
2. **Given** a valid snapshot file is opened in a browser with empty or unrelated IndexedDB state, **when** startup hydration completes, **then** the snapshot's documents and annotations are available without a remote service.
3. **Given** snapshot generation or download fails, **when** the operation completes, **then** the product reports failure and does not claim the file was saved.

### User Story 8 — Use the existing design-studio workflow (Priority: P3)

As a technical author, I want the existing studio workflow to continue producing a publication for my library, so that ingestion hardening does not remove a current authoring capability.

**Why this priority:** It preserves an existing workflow but is secondary to safe import, reading, and data integrity.

**Independent test:** Use the existing studio flow to create/export one publication, confirm it is saved, and open it from the catalog.

**Acceptance scenarios:**

1. **Given** an authorized studio frame sends a valid export message, **when** the shell accepts it, **then** one document is saved and appears in the catalog.
2. **Given** a message from an unexpected frame or with an invalid payload, **when** the shell receives it, **then** it does not save a document or perform the requested privileged action.

## 7. Functional Requirements

### Library and document lifecycle

- **REQ-001:** The product MUST let a user create a publication through the existing supported creation workflow and save it to the local library.
- **REQ-002:** The product MUST let a user import supported local HTML files through one document-ingestion workflow.
- **REQ-003:** Each successful import MUST create one document identity independent of its layout, CSS, class names, or rendering strategy.
- **REQ-004:** The product MUST retain the imported original source separately from the safe representation used for reading.
- **REQ-005:** The product MUST extract or derive a usable title for catalog display and provide a safe fallback when source metadata is absent or invalid.
- **REQ-006:** The product MUST provide a clear, user-visible outcome for each import attempt. Unsupported, unreadable, malformed, or failed imports MUST NOT be reported as successful.
- **REQ-007:** A failed or interrupted import MUST NOT leave a document that appears complete and usable when its required content was not persisted.
- **REQ-008:** The product MUST preserve the existing catalog access and document-opening workflow.

### Rendering and reader

- **REQ-009:** The product MUST represent rendering strategy separately from document identity.
- **REQ-010:** The product MUST provide a safe original-content presentation. When structured-folio or automatic-pagination presentation is available, choosing it MUST NOT alter the document's identity or original source.
- **REQ-011:** Imported executable content MUST NOT run by default. This includes scripts and inline event-handler behavior.
- **REQ-012:** The safe reader representation MUST reject or neutralize dangerous URL schemes, unsafe embedded navigation, and active form behavior.
- **REQ-013:** The reader MUST preserve supported benign text, formatting, and visual elements where they can be handled safely.
- **REQ-014:** The reader MUST retain existing book navigation, table-of-contents access, and return-to-catalog behavior.
- **REQ-015:** The reader MUST provide clear user feedback when content cannot be displayed, is unavailable, or has been materially restricted for safety.

### Annotations and local persistence

- **REQ-016:** The product MUST save annotations locally and associate each annotation set with the correct document.
- **REQ-017:** The product MUST restore a document's saved annotations when that document is reopened.
- **REQ-018:** The product MUST report persistence failures honestly and MUST NOT present an unsuccessful annotation save as successful.
- **REQ-019:** The product MUST maintain a canonical persistence contract for document metadata, document content, and annotations; redundant legacy writes MUST NOT remain as an unexamined parallel source of truth.
- **REQ-020:** Any data migration MUST preserve supported documents, metadata, and annotations; verify migrated content/relationships; and avoid deleting legacy data before successful verification.
- **REQ-021:** Migration and persistence failures MUST be observable to the user or in an appropriate diagnostic channel and MUST NOT silently discard user data.

### Shell/reader/studio communication

- **REQ-022:** The application shell MUST validate the sending frame against the frame expected for the requested operation before accepting a message that changes library state.
- **REQ-023:** The application shell MUST validate message type, required fields, field types, document identifiers, and payload bounds before processing a message.
- **REQ-024:** The application shell MUST reject unexpected or malformed messages without persisting data or reporting success.
- **REQ-025:** The reader MUST accept load/navigation commands only through the defined shell-reader communication contract.
- **REQ-026:** The message trust model MUST account for sandboxed frames with opaque origins; an origin value alone MUST NOT be considered sufficient sender authentication.

### Offline and privacy behavior

- **REQ-027:** Core catalog, locally available document reading, navigation, and annotation workflows MUST NOT require a remote account or backend.
- **REQ-028:** The product MUST NOT silently load external resources as a prerequisite for reading local content.
- **REQ-029:** If external resources or links are supported, the product MUST apply the documented safe policy and make their external/network behavior clear to the user.
- **REQ-030:** The release MUST be distributed as one self-contained `HtmlArtsV1.html` artifact; modular development source is permitted, and no alternate release package format is required.
- **REQ-031:** The product MUST use IndexedDB for active runtime persistence and provide an explicit user-triggered portable file snapshot that includes the local library and annotations and can be reopened without a remote service. It MUST clearly distinguish a generated/downloaded snapshot from automatic overwrite of an existing local file.
- **REQ-032:** The rebuilt catalog and reader MUST preserve the existing HtmlArts color palette, tone, and overall UI identity, except for focused changes required to meet approved usability, security, or accessibility requirements.

## 8. Non-Functional Requirements

- **NFR-001 — Security:** Imported files and frame messages MUST be treated as untrusted input and validated at the point where they cross a trust boundary.
- **NFR-002 — Privacy:** Library contents and annotations MUST remain local unless the user explicitly initiates an operation that sends data elsewhere.
- **NFR-003 — Data integrity:** Persistence and migration MUST preserve source/content, metadata, and annotation associations or surface a recoverable failure.
- **NFR-004 — Reliability:** A malformed document or rejected message MUST NOT prevent unrelated catalog or reader workflows from operating.
- **NFR-005 — Accessibility:** The reader and catalog MUST retain keyboard-operable primary navigation and accessible labels for interactive controls; viewport restrictions MUST not unnecessarily prevent user zoom.
- **NFR-006 — Offline resilience:** Missing network access or external assets MUST NOT crash the core local library and reader experience.
- **NFR-007 — Performance evidence:** Performance targets MUST be measured with a documented representative dataset, document-size profile, browser, and device class. Unverified latency statements are not release acceptance evidence.
- **NFR-008 — Maintainability:** The application shell, ingestion, persistence, rendering, and frame communication MUST have testable behavioral boundaries, whether or not the distribution remains a standalone HTML artifact.
- **NFR-009 — Compatibility:** Changes MUST preserve established user-visible creation, catalog, reader, and annotation behavior except where this specification explicitly changes unsafe behavior.
- **NFR-010 — Error handling:** Errors MUST be explicit and actionable; the product MUST NOT use silent fallbacks that imply a failed operation succeeded.

## 9. Key Entities

- **Document:** A library item with a stable identity, user-facing metadata, timestamps, and a relationship to source content and annotations.
- **Original source:** The imported or authored HTML retained as source material; it is not assumed safe to execute.
- **Safe reading representation:** The content prepared for display after unsafe behavior is removed or neutralized.
- **Rendering strategy:** A presentation choice such as safe original content, structured folios, or automatic pagination. It is not a document type.
- **Annotation set:** Reader-created strokes or notes associated with one document and restored when that document is opened.
- **Studio export:** A document payload produced by the existing authoring workflow; it is accepted only from an expected sender and after validation.
- **Migration record/state:** The progress and verification outcome needed to upgrade supported existing library data without premature deletion.

## 10. Edge Cases and Required Outcomes

1. **HTML with CSS but no book structure:** Import as a document; do not infer trusted book/plugin status from styles.
2. **Structured publication with unfamiliar class names:** Do not reject or reclassify the source; fall back to a safe available rendering strategy.
3. **Malformed or empty HTML:** Show a useful import/open error; do not create a success-shaped empty record.
4. **Script, event handler, or dangerous URL in source:** Keep the original source as data; ensure the reader representation does not execute the behavior.
5. **SVG or embedded media:** Preserve only elements/attributes/resources supported by the safe rendering policy; unsafe content must be inert.
6. **Very large input or message:** Enforce documented limits or reject safely with an actionable explanation; never truncate into a success-shaped document.
7. **Storage quota or transaction failure:** Report failure; preserve the prior saved version and avoid claiming the new version was saved.
8. **Duplicate import:** Treat it as a separate user import unless a reviewed deduplication behavior is specified; do not silently overwrite an existing document.
9. **Deleted or unavailable document content:** Do not open unrelated content under the same reader session; report that the document cannot be loaded.
10. **Unexpected frame message:** Ignore/reject it without state mutation, and record appropriate diagnostic evidence where available.
11. **Interrupted migration:** On restart, safely detect and resume or roll back the supported migration without deleting the only verified copy.
12. **Offline external resource:** Keep the shell and local reading workflow usable and make the unavailable resource non-fatal.

## 11. Success Criteria

- **SC-001:** In a representative import test set containing ordinary articles, styled documents, and structured publications, every supported file is represented as a document and no file is classified as a plugin solely from markup or CSS.
- **SC-002:** In security fixtures containing scripts, inline handlers, unsafe schemes, and active forms, zero prohibited actions execute during default reading.
- **SC-003:** In supported legacy-data migration tests, 100% of seeded documents, required metadata, and annotations remain readable and associated correctly after migration; failed migrations do not delete the only verified copy.
- **SC-004:** In reader regression tests, users can open a catalog item, navigate its available content, access the table of contents, and return to the catalog without losing existing reader functionality.
- **SC-005:** In annotation persistence tests, 100% of successfully saved annotations are restored to the same document after closing and reopening it; failed saves are surfaced.
- **SC-006:** In message-validation tests, 100% of unexpected senders, malformed payloads, and over-limit messages are rejected without library mutation.
- **SC-007:** With network access disabled after local app/content availability, users can complete catalog browsing, local document reading, navigation, and annotation workflows.
- **SC-008:** A documented performance benchmark covers at least 500 catalog documents and a representative range of HTML document sizes; results include measured catalog interaction and reader-open timings, with no release claim based solely on a source-code log statement.
- **SC-009:** In usability acceptance, a first-time reviewer can import a supported document, find it in the catalog, open it, and return to the catalog using visible controls without implementation knowledge.
- **SC-010:** The release process produces exactly one distributable runtime artifact named `HtmlArtsV1.html`; it opens and supports the approved core workflows without requiring a second runtime file or network service.
- **SC-011:** In a clean browser profile, a user can explicitly save and reopen a file snapshot containing all seeded documents and annotations; the reopened snapshot preserves content and associations.
- **SC-012:** In side-by-side review against the current product, the rebuilt catalog and reader retain the established colors, tone, and recognizable UI identity; any intentional deviations are listed and approved.

## 12. Assumptions

1. The target user continues to value the current book-like reader, catalog, and local annotations.
2. Supported inputs for this phase are local HTML files; expanding to PDF, DOCX, or arbitrary web-page capture requires separate requirements.
3. The original source may need to be retained for fidelity and future reprocessing, but retention does not authorize execution.
4. Rendering may remove or alter active behavior and unsafe content; safe readability takes precedence over exact execution parity.
5. Existing locally stored data is important and must be preserved through any storage change.
6. Existing studio output remains a supported authoring path, but it does not establish a general plugin contract.
7. Performance acceptance uses a test corpus and reference environment agreed during implementation planning; this specification intentionally does not promise a fixed latency across all devices.

## 13. Product-Owner Decisions and Remaining Open Details

### Decisions recorded

1. The release target is one self-contained `HtmlArtsV1.html`; no other release format is required. Modular source files may exist in the repository to build it.
2. The current product's colors, tone, and UI identity should be retained.
3. Runtime persistence uses IndexedDB; explicit portable file persistence is also required.
4. The engineering-review direction is approved: document-first ingestion, source/rendering separation, safe-by-default imported content, preservation of existing reader/annotation/creation/studio workflows, and migration/data-preservation requirements.
5. Standalone/quine-style portability remains in scope as the user-triggered snapshot path; it is not permission to execute imported scripts.
6. User-facing success criteria and benchmark expectations are accepted.
7. The existing PageServer Design Studio is embedded in the single-file v1 artifact rather than shipped as a separate companion file or deferred. Studio exports are accepted only from the expected sandboxed frame, validated, size-bounded, and sanitized before persistence.
8. Phase 5 validation uses the available Chromium environment first; Firefox and Safari remain explicit release gates. Performance measurements use the current development host and integrated Chromium, with the environment recorded alongside results.

### Confirmed implementation decisions

The product owner confirmed these policies for Phase 3:

1. **Rendering:** Use structured-folio rendering only for the explicitly supported folio structure; otherwise use sanitized original-content presentation. Do not automatically paginate documents.
2. **External resources and links:** Never load remote images, styles, or other resources automatically. Keep supported outbound links inert until the reader obtains explicit user confirmation before navigating.
3. **Import size:** The product owner selected a 5 MiB maximum for imported HTML after Phase 5 testing on the available Chrome host. Reject larger files before reading; never silently truncate.
4. **Studio packaging:** Embed the existing studio into `HtmlArtsV1.html`; reject studio exports larger than 5 MiB. The imported-file and Studio limits are separate checks.

### Remaining provisional defaults for implementation planning

These are safe starting assumptions, not additional user-confirmed decisions. Validate them in the named phase before release:

1. **Browser support:** Target current stable desktop versions of Chromium-based browsers, Firefox, and Safari for initial acceptance; document the final tested matrix.
2. **Migration:** Initially support the current HtmlArts IndexedDB schema and its known legacy store. Preserve existing stores until migration integrity checks pass; determine exact cleanup policy during Phase 2.
3. **File persistence semantics:** Runtime changes are committed to IndexedDB. A user-triggered snapshot produces/downloads a complete standalone `HtmlArtsV1.html`; opening a snapshot hydrates its data when appropriate. The app must not claim it silently overwrote an existing file. Conflict behavior between an older snapshot and newer IndexedDB data must be explicit before implementing hydration.

These remaining defaults do not change the confirmed Phase 3 policies above.

## 14. Source Basis and Conflict Resolution

This draft reflects:

- The current tracked `dev` implementation: a local application shell, an iframe reader, IndexedDB-backed library/annotation behavior, and frame messaging.
- The repository's current reader verification tests and quine/composition verification tests. These passed during the preceding analysis, but are primarily source-content checks and do not establish browser-level security or performance.
- The supplied untracked engineering review, which recommends document-first ingestion, safe handling of imported HTML, consistent persistence, validated frame communication, and deferring plugin ingestion.
- The local business PRD and composition blueprint, which contain broader aspirations such as quine packaging, micro-modules, MCP, and high-scale performance targets. Those aspirations are not treated as current implementation evidence or requirements in this draft unless explicitly in scope above.
- The user's decision that the engineering-review direction is authoritative for the next implementation phase.
- The product-owner's decisions that v1 produces one `HtmlArtsV1.html` release, retains the existing color/tone/UI identity, and uses IndexedDB for runtime persistence plus explicit portable file snapshots.

No source or behavior has been changed as part of this specification.

## 15. Review Questions

The product direction in section 13 is recorded from the product owner's answers. The provisional defaults are identified separately and should be confirmed or revised at the start of their dependent implementation phases.