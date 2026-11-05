# HtmlArts 🎨📖

> **A local-first, zero-install HTMLBook platform and creative reading environment.**  
> Built as self-contained HTML pages using a Server–Client layered architecture, standard browser sandboxing (`<iframe>`), and asynchronous IndexedDB storage.

---

## 🏛️ Architectural Overview

HtmlArts follows **Convention over Configuration** where file naming defines structural roles:

```
HtmlArts/
├── HtmlArtsServer.html    # Core Server / Orchestrator (UI shell, IndexedDB, Ingestion)
├── HtmlArtsClient.html    # Core Client / Sandboxed Reader (Canvas ink, gestures, postMessage)
├── HtmlArts.html          # Legacy pilot monolith (Stage 1-3 baseline reference)
├── LICENSE                # GNU Affero General Public License v3.0 (GNU AGPLv3)
├── .editorconfig          # Code style & formatting rules
├── .gitattributes         # LF normalization & binary asset mappings
└── .gitignore             # Ignore rules for OS, IDE, and build caches
```

### 1. Ingestion Model (Server–Client)
- **Server ingests Client**: `HtmlArtsServer.html` acts as the host shell and dynamically renders `HtmlArtsClient.html` in a sandboxed `<iframe>`.
- **Client never consumes itself**: `HtmlArtsClient.html` is a leaf node focused exclusively on reader rendering, ink annotation, and touch gestures.
- **Bi-directional `postMessage` protocol**:
  - `HTMLARTS_LOAD`: Server transmits book markup, active theme, metadata, and prior annotation strokes to the client.
  - `HTMLARTS_CONFIG`: Server pushes runtime configuration updates (e.g. read-only mode).
  - `HTMLARTS_EVENT`: Client emits life-cycle events back to the server:
    - `book-ready`: Handshake confirmation once rendered.
    - `annotations-updated`: Transmits normalized `(0, 1)` coordinate stroke arrays for local persistence.
    - `close`: Requests closing the reader overlay.

### 2. Functional-Style Persistence
All persistent storage runs through an asynchronous, functional-style interface over browser IndexedDB:
- Database: `htmlarts-local-library`
  - Store `books`: Stored book records, templates, custom HTML, and import metadata.
  - Store `annotations`: Serialized ink strokes linked to specific `bookId`s.
- Database: `htmlarts-assets-v1`
  - Store `assets`: Binary blobs for local images, media, and attachments.

---

## 🚀 Getting Started

No node modules, build steps, or compilers required.

### Run locally via any HTTP server:
```bash
# Using Python
python3 -m http.server 8080

# Or open in your browser
# Server Entrypoint: http://localhost:8080/HtmlArtsServer.html
# Standalone Client: http://localhost:8080/HtmlArtsClient.html
```

Or simply **double click** `HtmlArtsServer.html` to open directly from your file system.

---

## 📜 License

Licensed under the [GNU Affero General Public License v3.0 (GNU AGPLv3)](LICENSE).
