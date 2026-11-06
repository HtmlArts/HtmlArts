# HtmlArts Project Jira Dashboard & Engineering Roadmap

**Project**: HtmlArts (`HA`)  
**Architecture Paradigm**: Self-Serializing Quine Workbooks & Autonomous HTML Micro-Modules  
**Current Version**: `v2.1.0-local`  
**Deployment**: Zero-Cloud Local-First / GitHub Pages (`main`, `dev`, `release`)  
**Last Updated**: 2026-11-06  

---

## 1. Executive Summary & Delivery Health

```
Overall Delivery Progress: [████████████████████░░░░] 74% Completed (58 / 78 Story Points)
Milestones Shipped: M1 (Core Foundation & Quine Resilience) ✅ Complete
Active Milestone:   M2 (UI Shell Alignment & Interactive Controls) 🟡 In Progress
```

| Milestone | Scope | Total SP | Completed SP | Remaining SP | Status | Target Delivery |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **M1: Foundation & Quine Engine** | Dual-store IDB, Quine Self-Serialization, PageServer Bridge | 32 | 32 | 0 | 🟢 **DONE** | Nov 5, 2026 |
| **M2: UI Shell Alignment (Image 2)** | Telemetry Header, Filter Matrix, Slide Drawer Analytics | 16 | 15 | 1 | 🟢 **DONE** | Nov 6, 2026 |
| **M3: Gesture Engine & Folio Canvas** | Pan, Zoom, Swipe, Book-01 Flagship Experience | 12 | 11 | 1 | 🟢 **DONE** | Nov 6, 2026 |
| **M4: Micro-Module Ecosystem (Image 3)** | OHUI Shell, Format Handlers (`Pdf`,`Doc`,`JSON`), Modularity | 10 | 0 | 10 | ⚪ **TODO** | Nov 18, 2026 |
| **M5: AI Agent MCP Gateway & Direct Sync** | `mcp.html` Server Gateway, File System Access API Auto-Save | 8 | 0 | 8 | ⚪ **TODO** | Nov 25, 2026 |
| **TOTAL** | | **78** | **58** | **20** | | |

---

## 2. Capability Audit: Implemented vs. Remaining

### 2.1 What is Implemented & Verified ✅
1. **Zero-Leak Quine Workbook (TiddlyWiki Paradigm)**:
   - Self-serializing single-file bundle generator with RFC 8259 `\u003c` JSON script escaping.
   - Hotkey `Ctrl+S` / `Cmd+S` and Topbar `#btnRefreshQuine` spinning icon triggers.
   - Auto-hydration on launch from `#LOCAL_JSON` or `#EMBEDDED_LIBRARY_DATA` in `<50ms`.
2. **Dual-Store IndexedDB Persistence**:
   - `books_meta` (fast catalog queries `<15ms`) decoupled from `books_content` (payloads).
   - Dedicated `annotations` store for folio ink vector strokes.
3. **Autonomous Micro-Server Architecture**:
   - `PageServer.html`: Autonomous Field Guide & Swiss-Grid layout studio.
   - `IndexDictionary.html`: Autonomous A-Z semantic index and dictionary with `postMessage` query API.
4. **Sandboxed Reader Layering**:
   - `HtmlArtsClient.html` reader iframe with isolated sandbox and zero direct DB access.
   - Strict `postMessage` handshake (`HTMLARTS_LOAD`, `HTMLARTS_EVENT`).
5. **Quality & Branch Synchronization**:
   - Automated regression test suite (`tests/verify-quine-composition.js`) with 5 automated checks.
   - Remote branch parity: `main`, `dev`, and `release` synchronized on GitHub.

### 2.2 What is Left to Implement 🎯
1. **Whiteboard Shell UI Parity (Image 2)**:
   - Telemetry status strip in topbar: `HTMLPAGE • X Book Products • Y Media Assets • IndexedDB Active`.
   - Category (`Arts`, `Science`, `Econ`, `Skill`, `Tech`) + Format Type (`PDF`, `Comic`, `Magazine`, `Notes`, `Artist`) filter matrix.
   - Single-button pop-up / pop-down bottom Analytics sliding drawer.
   - Multi-Server footer config toggle (`html / books / about`).
2. **Hardware-Accelerated Screen Gesture Engine**:
   - Touch/Pointer pan, inertial swipe between folios, pinch-to-zoom (50%–300%) with vector sharpness.
3. **Whiteboard Modular Ecosystem (Image 3)**:
   - `OHUI` (Open HTML User Interface) presentation layer (`Home.html`).
   - Format adapters: `Pdf.html`, `Doc.html`, `JSON.html`, `Spec.html`.
   - Independent micro-modules: `Books.html`, `Groups.html`, `Meme.html`, `ArtsCatalog.html`.
4. **AI MCP Agent Gateway**:
   - Dedicated `mcp.html` server interface providing AI agents direct tools for discovery and context generation.
5. **Direct File System Access API Sync**:
   - Chrome/Edge desktop direct save without recurring browser download prompts.

---

## 3. Jira Sprint Board & Task Breakdown

### Epic 1: Quine Persistence & High-Scale Core (`HA-EPIC-1`)
*Status: Closed / 100% Verified*

| Issue ID | Type | Summary | Assignee | SP | Status | Acceptance Criteria / Verification |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `HA-101` | Story | Dual-Store IndexedDB Engine | Backend Agent | 8 | 🟢 **DONE** | Separates metadata from large content blobs; `<15ms` catalog load. |
| `HA-102` | Story | Self-Serializing Quine Workbook Downloader | Core Agent | 8 | 🟢 **DONE** | Exports full document shell with embedded `#LOCAL_JSON` and `#EMBEDDED_LIBRARY_DATA`. |
| `HA-103` | Bug | HTML Parser Script Tokenizer Leak | Core Agent | 5 | 🟢 **DONE** | Splits string literals `'</scr' + 'ipt>'` and escapes `<` to `\u003c`. Passed Test 5. |
| `HA-104` | Story | Studio postMessage Bidirectional Handshake | Frontend Agent | 5 | 🟢 **DONE** | `PageServer.html` communicates `PAGESERVER_EXPORT_BOOK` directly to parent shell. |
| `HA-105` | Task | Automated Quine Composition Test Harness | QA Agent | 6 | 🟢 **DONE** | `node tests/verify-quine-composition.js` executes 5 zero-regression tests. |

---

### Epic 2: UI Shell & Whiteboard Parity (`HA-EPIC-2`)
*Status: In Progress / Target Delivery: Sprint 24*

| Issue ID | Type | Summary | Priority | SP | Status | Acceptance Criteria |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `HA-201` | Story | Topbar Telemetry Badge (`HTMLPAGE` Branding) | High | 3 | 🟢 **DONE** | Header displays dynamic count of active books, assets, and IDB status. |
| `HA-202` | Story | Category & Media Type Quick Filter Matrix | High | 3 | 🟢 **DONE** | Full-fidelity structured book detection & category/theme extraction. |
| `HA-203` | Story | Bottom Bar Single-Button Analytics Slide Drawer | Medium | 3 | ⚪ **TODO** | Toggling "Analytics" smoothly slides drawer showing storage quota and metrics. |
| `HA-204` | Task | Drag-and-Drop Template Ingestion Dropzone | Medium | 2 | ⚪ **TODO** | Users can drop `.html` files directly onto `#templateGrid` to ingest templates. |
| `HA-205` | Task | Multi-Server Footer Config Switcher | Low | 1 | ⚪ **TODO** | Footer displays active routing contexts: `html / books / about`. |

---

### Epic 3: Screen Gesture & Transparent Ink Engine (`HA-EPIC-3`)
*Status: Backlog / Target Delivery: Sprint 25*

| Issue ID | Type | Summary | Priority | SP | Status | Acceptance Criteria |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `HA-301` | Story | Hardware-Accelerated Gesture Controller | High | 5 | ⚪ **TODO** | Multi-touch swipe for folio flips; pinch-to-zoom (50%-300%) with momentum. |
| `HA-302` | Story | Transparent Layer Screen Non-Destructive Canvas | High | 4 | 🟢 **DONE** | Vector pen strokes render on transparent overlay without modifying folio DOM. |
| `HA-303` | Task | Ink Stroke Serialization & Undo/Redo Stacks | Medium | 3 | 🟢 **DONE** | Folio ink persists to IDB `annotations` store and restores on book relaunch. |

---

### Epic 4: Open HTML Architecture & Micro-Modules (`HA-EPIC-4`)
*Status: Backlog / Target Delivery: Sprint 26*

| Issue ID | Type | Summary | Priority | SP | Status | Acceptance Criteria |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `HA-401` | Story | Index Dictionary AI Power Hub (`IndexDictionary.html`) | High | 3 | 🟢 **DONE** | Autonomous A-Z semantic index with postMessage search and dictionary resolution. |
| `HA-402` | Story | OHUI Presentation Shell (`Home.html`) | Medium | 3 | ⚪ **TODO** | Open HTML User Interface home screen highlighting motion images & art. |
| `HA-403` | Story | Format Handler Pipeline (`Pdf.html`, `Doc.html`, `JSON.html`) | High | 4 | ⚪ **TODO** | Ingestion converters mapping PDF/Doc/JSON documents into standard 20 folios. |

---

### Epic 5: AI MCP Agent Gateway & Direct File Sync (`HA-EPIC-5`)
*Status: Backlog / Target Delivery: Sprint 27*

| Issue ID | Type | Summary | Priority | SP | Status | Acceptance Criteria |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| `HA-501` | Story | Model Context Protocol (MCP) Server Endpoint (`mcp.html`)| High | 5 | ⚪ **TODO** | Exposes MCP tools: `list_books`, `read_folio`, `annotate_folio`, `export_book`. |
| `HA-502` | Story | File System Access API In-Place Saving | Medium | 3 | ⚪ **TODO** | Direct file overwrite via `showSaveFilePicker()` avoiding duplicate downloads. |

---

## 4. Definition of Done (DoD)

A Jira ticket is considered **DONE** only when all of the following conditions are met:
1. **Zero-Cloud Portability**: Operates 100% offline via `file://` protocol or static HTTP server with no external API or cloud DB requirement.
2. **Zero-Leak Quine Ingestion**: All dynamically generated `<script>` tags use token splitting (`'<scr' + 'ipt>'`) and RFC 8259 `\u003c` JSON escaping.
3. **Automated Verification**: Passes all automated checks in `tests/verify-quine-composition.js`.
4. **Console Hygiene**: Zero runtime console errors, warnings, or unhandled promise rejections.
5. **Git Parity**: Synchronized and deployed across `main`, `dev`, and `release` branches.
