# HtmlArts v1 Rebuild — Phased Implementation Plan

**Date:** 2026-11-09

**Specification:** [PRDSpecifiction.md](./PRDSpecifiction.md)

**Branch:** `rearchitecture/v1`
**Status:** Phase 5 validation executed; explicit release approval and remaining release gates are pending

## Summary

Rebuild HtmlArts as a local-first HTML document library with safe-by-default ingestion, distinct source and rendering representations, persistent annotations, and the established reader workflows. Modular source in `v1/` builds into the standalone `HtmlArtsV1.html` release artifact. After backing up the previous release, the product owner requested removing legacy root application files in the PR to `dev`; the root Pages index now forwards to the v1 artifact.

## Technical Context

**Current implementation:** Static HTML/CSS/JavaScript application shell, iframe reader, IndexedDB persistence, and validated `postMessage` communication.

**Current repository tooling:** The `v1/` workspace uses Node.js, npm, and esbuild to bundle modular JavaScript/CSS and the Studio source into one standalone HTML file.

**Target platform:** Modern browsers; local-first workflows. Exact browser/device support remains a product-owner decision.

**Distribution:** One self-contained `v1/HtmlArtsV1.html` artifact; modular repository source is the editable source of truth.

**Storage:** IndexedDB is the runtime store; an explicit portable file snapshot includes the local library and annotations. Existing browser IndexedDB data must be preserved through any migration.

**UI:** Preserve the existing HtmlArts colors, tone, and overall UI identity.

**Performance:** Benchmark at 500+ documents with representative sizes; no latency promise until measured on an agreed reference environment.
**Constraints:** Treat imports as untrusted and do not enable execution of imported scripts by default; defer arbitrary plugin ingestion. Keep the release branch unchanged until T019 is explicitly signed off.

## Constitution Check

No repository constitution file was found. This plan follows the reviewed PRD constraints: preserve user data, treat imports and frame messages as untrusted, maintain local-first core workflows, and defer plugin execution. Re-check if a constitution is added.

## Applied Guidelines

No language/framework-specific migration guideline applies yet. Phase 1 selected Node.js and esbuild with inline JS/CSS assembly to meet the single-file and local-file requirements.

## Implementation Phases

### Phase 0 — Baseline and isolation

**Goal:** Protect the current application, define the v1 boundary, and resolve product decisions needed before coding behavior.

#### 0.1 Establish isolated workspace
- **Requirements:** NFR-008, NFR-009
- **Description:** Work on `rearchitecture/v1` and place v1 work under `v1/`; initially retain root files and tests as the behavior reference while the rebuild is validated.
- **Exit gate:** The v1 directory and branch boundary are documented and the initial behavior baseline is captured.

#### 0.2 Review PRD and settle release decisions
- **Requirements:** REQ-010, REQ-020, REQ-027–REQ-032, NFR-005–NFR-009
- **Description:** Record the product-owner decisions: one `HtmlArtsV1.html` release, preservation of current UI identity, IndexedDB for runtime, and explicit file snapshots for portable persistence. Apply safe provisional defaults for remaining details and validate them during implementation.
- **Exit gate:** Product direction and release/persistence model are recorded; no architectural conflict remains that blocks the modular foundation.

#### 0.3 Capture current behavior baseline
- **Requirements:** REQ-008, REQ-014, REQ-016–REQ-018, NFR-009
- **Description:** Record current create/import/catalog/open/navigation/annotation/studio flows and preserve existing test commands as regression checks.
- **Exit gate:** A reviewer can reproduce baseline workflows; test limitations are documented (source checks are not runtime/security proof).

**Phase 0 tasks**
- [x] T001 [Plan:0.1] Establish the v1 directory boundary and document the initial root-app preservation rule in `v1/README.md`.
- [x] T002 [Plan:0.2] Record the product-owner's release, visual identity, and dual-persistence decisions in `PRDSpecifiction.md`.
- [x] T003 [Plan:0.3] Record current user-visible workflows and baseline test results in `v1/PHASE-0-BASELINE.md`.

**Phase 0 execution record**

- Created branch `rearchitecture/v1` and `v1/README.md`; root application files were retained during implementation and validation.
- Both existing checks pass: `node tests/verify-book-server.js` and `node tests/verify-quine-composition.js`.
- Baseline evidence and limitations are recorded in [v1/PHASE-0-BASELINE.md](./v1/PHASE-0-BASELINE.md).
- The product-owner confirmed the single-file `HtmlArtsV1.html` release, current visual identity, document-first ingestion, and IndexedDB runtime plus portable file persistence.
- Remaining browser, external-resource, migration-version, rendering-default, and size-limit details are recorded as provisional defaults/open validation items in the PRD; they do not block establishing the modular build foundation.
- Phase 0 exit gate is met. Phase 1 is ready; no feature implementation has started.

### Phase 1 — Modular application foundation

**Goal:** Agree on the build and runtime constraints, then create the smallest working modular v1 shell and verify its single-file output.

#### 1.1 Select runtime and build approach
- **Requirements:** REQ-030, NFR-006, NFR-008, NFR-009
- **Description:** Use esbuild with a small Node.js HTML assembly script to bundle modular JavaScript and CSS inline into one self-contained `HtmlArtsV1.html`; do not emit separate runtime assets.

#### 1.2 Create source structure and build contract
- **Requirements:** REQ-030, NFR-008, NFR-009
- **Description:** Add the agreed `v1/src/` boundaries for core, ingestion, storage, reader, library, and export. Define generated output location and ensure generated output is not edited as source.

#### 1.3 Build and smoke-test the minimal shell
- **Requirements:** REQ-027, REQ-030, NFR-006, NFR-008
- **Description:** Produce and open a minimal `HtmlArtsV1.html` shell without migrating data or changing the deployment entrypoint.

**Phase 1 tasks**
- [x] T004 [Plan:1.1] Select esbuild plus a Node.js assembly script to inline bundled assets into one HTML release file.
- [x] T005 [Plan:1.2] Create the modular source boundaries and generated-output contract under `v1/`.
- [x] T006 [Plan:1.3] Build and smoke-test the minimal standalone shell without changing root deployment files.

**Phase 1 execution record**

- `v1/package.json` defines reproducible `build` and `test` scripts; `v1/package-lock.json` locks esbuild.
- `v1/src/` establishes core, ingestion, storage, reader, library, export, and stylesheet boundaries. Only the minimal application bootstrap is implemented; later-phase domains remain reserved.
- `v1/scripts/build.mjs` bundles JS/CSS and inlines both into `v1/HtmlArtsV1.html`; generated runtime has no separate script or stylesheet dependencies.
- `npm --prefix v1 test` passed (2 tests); Google Chrome headless opened the generated `file://` artifact and executed the app bootstrap.
- Root application/deployment files remain untouched. Phase 1 exit gate is met; no document/storage/import features have been implemented.

### Phase 2 — Canonical document and persistence foundation

**Goal:** Define the document lifecycle and reliable local persistence before adding import or reader behavior.

#### 2.1 Establish document and annotation contracts
- **Requirements:** REQ-001, REQ-003–REQ-005, REQ-016–REQ-019
- **Description:** Define stable document identity, metadata, original source, safe reading representation, rendering preference, and annotation association.

#### 2.2 Implement canonical persistence and failure reporting
- **Requirements:** REQ-001, REQ-016–REQ-019, REQ-021, REQ-031
- **Description:** Implement IndexedDB runtime persistence for metadata, content, and annotations plus an explicit portable snapshot flow, with transactional behavior, verified hydration, and explicit user-visible failures.

#### 2.3 Plan and validate existing-data migration
- **Requirements:** REQ-020, REQ-021
- **Description:** Inventory supported root-app database versions, build a non-destructive migration with integrity verification, and test interrupted/failing upgrades before allowing legacy cleanup.

**Phase 2 tasks**
- [x] T007 [Plan:2.1] Define v1 document, source, rendering, and annotation contracts under `v1/src/storage/model.js`.
- [x] T008 [Plan:2.2] Implement IndexedDB runtime persistence, portable `HtmlArtsV1.html` snapshot/restore, and save/read/update failure tests.
- [x] T009 [Plan:2.3] Implement and verify the approved non-destructive migration from supported existing data.

**Phase 2 execution record**

- `v1/src/storage/model.js` defines document, content, annotation, and versioned snapshot contracts. Original source, safe HTML, and quarantined legacy-rendered HTML are distinct fields.
- `v1/src/storage/database.js` uses a separate `htmlarts-v1-local-library` database, so the existing root app database is not upgraded or locked out.
- Document and annotation repositories provide local runtime persistence; portable snapshots serialize the full catalog, content, and annotations into escaped JSON within `HtmlArtsV1.html`.
- On startup, a snapshot hydrates only an empty v1 database; existing runtime data takes precedence. Snapshot conflicts are not merged or overwritten.
- Legacy migration reads the existing `htmlarts-local-library` database read-only, writes to the separate v1 database, verifies copied records, and retains all source stores. Conflicts and orphan annotations fail explicitly without deleting legacy source data.
- `npm --prefix v1 test` passed (8 tests). Chrome headless CDP verified IndexedDB startup, downloaded a snapshot, reopened it in a clean browser profile, restored one document, and confirmed its annotation set.
- Phase 2 exit gate is met. Import and safe rendering remain Phase 3 work.

### Phase 3 — Unified ingestion and safe rendering

**Goal:** Import HTML as documents and render a safe, useful representation without trusting embedded behavior.

#### 3.1 Implement document ingestion
- **Requirements:** REQ-002–REQ-008
- **Description:** Validate supported files, extract usable metadata, preserve original source, and register exactly one document only when persistence succeeds.

#### 3.2 Implement safe reading representation
- **Requirements:** REQ-004, REQ-011–REQ-013, REQ-028, REQ-029
- **Description:** Apply the approved security policy to executable elements, attributes, URLs, forms, SVG, and external resources while preserving supported benign content.

#### 3.3 Add rendering strategies
- **Requirements:** REQ-003, REQ-009, REQ-010, REQ-014, REQ-015
- **Description:** Keep identity/source independent from rendering; use safe original presentation by default and select structured folios only for the explicitly supported legacy structure. Automatic pagination is not part of this phase.

**Phase 3 tasks**
- [x] T010 [Plan:3.1] Implement local HTML validation, metadata extraction, source preservation, and import-result feedback.
- [x] T011 [Plan:3.2] Implement the approved safe-content policy and test malicious and benign HTML fixtures.
- [x] T012 [Plan:3.3] Implement rendering selection and fallback behavior without changing document identity.

**Phase 3 execution record**

- `v1/src/ingestion/` now validates and reads local HTML, extracts title/description/author/language metadata, keeps original source separate, and atomically inserts document plus content.
- DOMPurify and CSS Tree remove executable HTML behavior, unsafe URLs/forms/embedded content, remote resources, CSS imports, and URL-bearing CSS declarations while retaining supported benign markup and styles. Outbound links are inert until a reader action confirms navigation.
- Rendering defaults to `SAFE_ORIGINAL`; the supported `.stage > article.page[data-name]` folio structure receives `STRUCTURED_FOLIOS`. Styling or generic page-like markup does not trigger folio selection; automatic pagination is not enabled.
- The product owner confirmed the rendering and network/link policies. Phase 5 testing measured plain-text imports at 1, 5, and 10 MiB on the available Chrome host; the product owner selected a 5 MiB import maximum. Oversized files are rejected before reading, and inputs are never silently truncated.
- `npm --prefix v1 test` passed (14 tests); root regression checks passed (9 checks); dependency audit reported no vulnerabilities.
- Phase 3 exit gate was met before the library and reader work described in Phase 4.

### Phase 4 — Library, reader, annotations, and frame integration

**Goal:** Deliver independently testable user workflows on top of the new foundation.

#### 4.1 Library and create/open workflows
- **Requirements:** REQ-001, REQ-005, REQ-008, REQ-032
- **Description:** Connect create/import/open flows to the v1 catalog, preserve essential catalog behavior, and match the current product's visual identity.

#### 4.2 Reader and annotation workflows
- **Requirements:** REQ-014, REQ-016–REQ-018, REQ-025, REQ-032
- **Description:** Deliver navigation, table of contents, return-to-catalog, and annotation save/restore behavior while preserving the existing reader's color, tone, and interaction identity.

#### 4.3 Validate shell/frame communication
- **Requirements:** REQ-022–REQ-026
- **Description:** Define message contracts, validate sender/payload/size, and reject unexpected messages without state mutation.

#### 4.4 Preserve approved studio workflow
- **Requirements:** REQ-022–REQ-024
- **Description:** Integrate existing studio exports only if the workflow is approved and only through the validated document-ingestion contract.

**Phase 4 tasks**
- [x] T013 [Plan:4.1] Implement v1 catalog, document creation, and open workflows.
- [x] T014 [Plan:4.2] Implement reader navigation, table of contents, return control, and annotation persistence.
- [x] T015 [Plan:4.3] Implement and test the validated shell/reader message contract.
- [x] T016 [Plan:4.4] Integrate the existing studio export path behind sender and payload validation.

**Phase 4 execution record**

- `v1/src/library/` and `v1/src/core/application.js` now connect catalog search, safe title rendering, import, text-based creation, opening, and portable snapshots to IndexedDB.
- `v1/src/reader/` provides safe iframe rendering, structured-folio or heading navigation, a table of contents, keyboard controls, return-to-catalog behavior, explicit outbound-link confirmation, and document-associated reading notes.
- The approved PageServer studio is embedded in the generated standalone file. Its sandboxed opaque-origin frame is checked by exact frame identity and origin; exports are schema-validated, limited to 5 MiB, sanitized, and atomically stored. The build escapes nested script closing tags and omits remote Google Fonts references from the embedded copy.
- Validation passed: `npm --prefix v1 test` (20 tests); root regression checks (9 checks); browser flows exercised studio export → catalog → safe reader, and local HTML import → navigation → note save/reopen → outbound-link confirmation. Test-created documents were removed from the browser profile.
- Phase 4 exit gate is met. Phase 5 remains: browser/device matrix, comprehensive security and error-path review, offline behavior, accessibility, representative-scale benchmarks, and explicit release approval. The imported-file size cap remains a release gate.

### Phase 5 — Quality gates and release

**Goal:** Demonstrate security, data integrity, accessibility, offline behavior, and performance before switching users to v1.

#### 5.1 End-to-end and security validation
- **Requirements:** REQ-006, REQ-007, REQ-011–REQ-015, REQ-018, REQ-020–REQ-026, NFR-001–NFR-004, NFR-010
- **Description:** Exercise user journeys, malicious input fixtures, storage failures, migration recovery, and rejected messages in a real browser.

#### 5.2 Offline, accessibility, and performance validation
- **Requirements:** REQ-027–REQ-029, NFR-005–NFR-007
- **Description:** Verify local workflows offline, keyboard/zoom behavior, and benchmark at least 500 documents plus representative content sizes on the agreed reference environment.

#### 5.3 Release and deployment decision
- **Requirements:** NFR-009
- **Description:** Compare v1 against the baseline and verify the standalone artifact. Update the development branch root entrypoint only with explicit owner direction; do not update the release branch until remaining gates and T019 approval are resolved.

**Phase 5 tasks**
- [x] T017 [Plan:5.1] Run browser-level user journey, security, migration, and error-path tests.
- [x] T018 [Plan:5.2] Run offline, accessibility, and documented representative-scale benchmarks.
- [ ] T019 [Plan:5.3] Review release evidence and obtain explicit approval before changing deployment entrypoints.

**Phase 5 validation record**

- **Environment:** Ubuntu 24.04 host; Intel Core i5-5200U (4 logical CPUs), 11 GiB RAM; Node.js 18.19.1; Google Chrome 156.0.8078.79; Playwright 1.56.1; Docker available (not applicable to this static client).
- **Build and tests:** `npm --prefix v1 test` passed 26 unit/build checks and 15 Chromium browser tests. All 15 browser tests passed under Playwright Firefox 142.0.1 when run serially; an initial default-concurrency run had two UI-wait timeouts under browser contention, and both affected tests passed in isolation. Root regression checks passed 9 checks. `npm audit --prefix v1` found no vulnerabilities.
- **WebKit:** Playwright WebKit 26.0 was downloaded but could not launch because host libraries are missing; installing OS dependencies requires sudo access unavailable in this session. Native Safari is not available on this Linux host. See [v1/runtime-validation-report.md](./v1/runtime-validation-report.md) for the exact missing libraries.
- **Offline/accessibility:** Core import/read journey passed with HTTP(S) requests blocked. Keyboard TOC navigation, focus entry/return, accessible control names, and 320px/375px layouts passed in Chromium and Firefox. A broader assistive-technology audit was not run.
- **Performance and import size:** The latest 500-document benchmark medians were 302ms catalog reload, 60.3ms single-result search, and reader open 158.8ms (1 KiB), 259.7ms (50 KiB), and 227.1ms (250 KiB). Plain-text imports of 1, 5, and 10 MiB completed in 470ms, 1,743ms, and 3,358ms respectively on this host. The owner-approved 5 MiB cap is implemented; browser coverage verifies an exact-limit file imports and a file one byte over the limit is rejected before library mutation. These measurements do not establish performance for complex documents or representative low-memory devices.
- **Remaining release gates:** Resolve or explicitly accept WebKit/Safari coverage, complete broader accessibility review, and obtain explicit product-owner release approval. The owner has requested the v1 cleanup and root redirect for this PR to `dev`; the `release` branch and deployment workflow remain unchanged. T019 remains pending.

## Project Structure

```text
HtmlArts/
├── current application files     # behavior reference and fallback; unchanged until release approval
├── tests/                        # existing baseline checks
├── v1/
│   ├── README.md                 # isolation and Phase 0 boundary
│   ├── src/                      # modular editable source
│   │   ├── core/
│   │   ├── ingestion/
│   │   ├── storage/
│   │   ├── reader/
│   │   ├── library/
│   │   └── export/
│   ├── scripts/                  # build assembly
│   ├── tests/                    # build/storage/migration/snapshot tests
│   └── HtmlArtsV1.html           # generated standalone release; not hand-edited
├── checkpoints/
│   ├── spec-to-plan.yaml
│   └── plan-to-tasks.yaml
└── plan.md
```

## Testing Strategy

- **appType:** Local-first browser application with iframe messaging and standalone HTML distribution.
- **Critical user journeys:** Import and read; safe handling of active HTML; return to catalog; persist and restore annotations; preserve data through migration; offline reading.
- **Primary validation:** Browser-level functional and security tests in the agreed supported browser matrix.
- **Current fallback:** Existing Node.js source-content tests remain regression signals only; they do not prove runtime behavior, isolation, or security.
- **Environment requirements:** v1 uses Node.js, npm, esbuild, fake-indexeddb for storage tests, Playwright, and system Google Chrome for browser E2E tests against the standalone `file://` artifact. Browser E2E and infrastructure are independent; this local-first client has no separate service/database infrastructure tier.
- **Test data:** Benign structured books, styled articles, malformed/large HTML, active-content security fixtures, 500+ catalog entries, and seeded supported legacy database versions.
- **Acceptance:** All approved PRD success criteria pass; failed imports/saves/migrations are surfaced; no unapproved network or script behavior occurs; current app remains deployable until sign-off.
- **Known gaps:** Chromium and Firefox have been exercised; WebKit/Safari remain release gates. Accessibility checks cover keyboard focus/navigation and narrow viewports, not a full assistive-technology audit. The 5 MiB import cap is based on one available host and simple-text samples; complex HTML and lower-memory devices were not measured. The initial migration supports the known current v2 legacy layout; other historical variants require evidence and tests before support is claimed. Authentication testing is not applicable to this local, unauthenticated application.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|---|---|---|---|
| REQ-001 | Create and save a publication | 2.1, 2.2, 4.1 | `v1/src/library/`, `v1/src/storage/document-repository.js` |
| REQ-002 | Import supported HTML | 3.1 | `v1/src/ingestion/` |
| REQ-003 | Document identity independent of presentation | 2.1, 3.3 | `v1/src/storage/model.js` document contract and rendering selection |
| REQ-004 | Preserve original source separately | 2.1, 3.1, 3.2 | `v1/src/storage/model.js`, `v1/src/storage/legacy-migration.js`, `v1/src/ingestion/` |
| REQ-005 | Extract/fallback title | 2.1, 3.1, 4.1 | `v1/src/ingestion/`, `v1/src/library/` |
| REQ-006 | Report import outcome accurately | 3.1, 5.1 | Import flow and browser tests |
| REQ-007 | Avoid partial successful imports | 2.2, 3.1, 5.1 | Persistence transaction and import failure tests |
| REQ-008 | Preserve catalog/open workflow | 4.1 | `v1/src/library/` |
| REQ-009 | Separate rendering strategy | 2.1, 3.3 | Document contract and renderer |
| REQ-010 | Safe original presentation and optional strategies | 0.2, 3.3 | PRD decision and renderer |
| REQ-011 | Disable imported execution by default | 3.2, 5.1 | Safe representation and security fixtures |
| REQ-012 | Neutralize unsafe URLs/forms/navigation | 3.2, 5.1 | Safe representation and security fixtures |
| REQ-013 | Preserve supported benign content | 3.2, 5.1 | Sanitization fidelity tests |
| REQ-014 | Preserve reader navigation and return | 3.3, 4.2 | Reader behavior tests |
| REQ-015 | Explain unavailable/restricted content | 3.3, 4.2 | Reader status/error UI |
| REQ-016 | Persist document-associated annotations | 2.1, 2.2, 4.2 | `v1/src/storage/annotation-repository.js`, reader tests |
| REQ-017 | Restore annotations on reopen | 2.2, 4.2 | `v1/src/storage/annotation-repository.js`, persistence tests |
| REQ-018 | Surface annotation save failures | 2.2, 4.2, 5.1 | `v1/src/storage/annotation-repository.js`, browser tests |
| REQ-019 | Maintain canonical persistence | 2.1, 2.2 | `v1/src/storage/database.js`, repositories |
| REQ-020 | Preserve/verify data migration | 0.2, 2.3, 5.1 | `v1/src/storage/legacy-migration.js`, migration tests |
| REQ-021 | Surface migration/persistence failures | 2.2, 2.3, 5.1 | `v1/src/storage/legacy-migration.js`, recovery tests |
| REQ-022 | Validate sender frame | 4.3, 5.1 | Message-boundary tests |
| REQ-023 | Validate message schema and size | 4.3, 5.1 | Message validation tests |
| REQ-024 | Reject invalid messages without mutation | 4.3, 5.1 | Rejection/state-integrity tests |
| REQ-025 | Enforce reader communication contract | 4.2, 4.3 | Reader messaging tests |
| REQ-026 | Handle opaque sandbox origins safely | 4.3, 5.1 | Security tests for sandboxed frames |
| REQ-027 | Keep core local workflows backend-independent | 1.3, 5.2 | Standalone and offline browser tests |
| REQ-028 | Avoid silent external dependencies | 3.2, 5.2 | Resource-policy tests |
| REQ-029 | Apply/communicate external link/resource policy | 0.2, 3.2, 5.2 | Reviewed policy and browser tests |
| REQ-030 | Produce one self-contained `HtmlArtsV1.html` release | 1.1, 1.2, 1.3 | `v1/scripts/build.mjs`, `v1/HtmlArtsV1.html`, build tests |
| REQ-031 | Use IndexedDB at runtime and explicit portable file snapshots | 2.1, 2.2, 5.1 | `v1/src/storage/database.js`, `v1/src/storage/library-snapshot.js`, snapshot round-trip tests |
| REQ-032 | Preserve current product visual identity | 4.1, 4.2, 5.3 | v1 catalog/reader UI and side-by-side acceptance evidence |
