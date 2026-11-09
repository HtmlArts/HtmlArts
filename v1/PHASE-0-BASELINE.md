# Phase 0 Baseline

**Date:** 2026-11-09

**Branch:** `rearchitecture/v1`
**Reference commit:** `659f7b6`

## Isolation

- The rebuild branch is `rearchitecture/v1`.
- New work is isolated under `v1/`.
- The existing root application and deployment files have not been moved or edited.
- Local untracked review/spec files remain untouched.

## Existing checks

| Command | Result | What it establishes |
|---|---|---|
| `node tests/verify-book-server.js` | Pass | Source-level presence checks for Book-01 folios, reader controls, and ingestion hooks |
| `node tests/verify-quine-composition.js` | Pass | Source-level checks for escaping, export hooks, IndexedDB declarations, and inline-script integrity |

These are source-content checks. They do **not** establish runtime behavior in a browser, successful offline operation, imported-content isolation, message-sender validation, migration safety, accessibility, or performance.

## Existing behavior to preserve or review

- The root application provides a catalog, publication creation/import flows, and IndexedDB-backed local state.
- The reader is hosted in an iframe and supports folio navigation, table of contents, return-to-catalog, and annotations.
- The shell and reader use `postMessage`; the Page Studio also exports content to the shell.
- Existing persistence includes metadata/content stores and a legacy store; changes require a data-preservation decision and migration verification.
- The product owner confirmed a single standalone `HtmlArtsV1.html` release and a user-triggered portable snapshot alongside IndexedDB runtime persistence.
- The product owner confirmed preserving the existing colors, tone, and UI identity.

## Product-owner decisions received

- One `HtmlArtsV1.html` release artifact; no other runtime package format.
- Preserve current product color, tone, and UI identity.
- Document-first ingestion and safe-by-default handling are approved.
- IndexedDB for runtime persistence plus explicit portable file persistence.
- Reader, annotation, creation, and studio workflows should be preserved.
- Migration/data-preservation direction and success criteria are approved.

## Provisional decisions for later phase validation

- Structured-folio mode only for explicitly supported structures; safe original-content presentation otherwise.
- No automatic remote resource loading; external navigation requires user action.
- Start with current stable desktop Chromium, Firefox, and Safari coverage, subject to available test environment.
- Support the current schema and known legacy store first; retain old data until verified.
- Establish and test size limits before release; reject oversized input rather than truncate.
- Snapshot generation is user-triggered; do not claim silent overwrite. Define conflict behavior for stale file snapshots before hydration is implemented.
