# HtmlArts 🎨📖

> **A local-first, zero-install HTMLBook platform and creative reading environment.**  
> Built as self-contained HTML pages using a Server–Client layered architecture, standard browser sandboxing (`<iframe>`), and asynchronous IndexedDB storage.

---

## 🏛️ Architectural Overview

HtmlArts follows **Convention over Configuration** where file naming defines structural roles:

```
HtmlArts/
├── HtmlArtsServer.html      # Core Server / Orchestrator (UI shell, Dual-Store DB, Ingestion)
├── HtmlArtsClient.html      # Core Client / Sandboxed Reader (Canvas ink, gestures, postMessage)
├── PageServer.html          # Specialized Micro-Server (Field Guide & Flat PDF/HTML Architecture)
├── index.html               # GitHub Pages Root Entrypoint (mirrors HtmlArtsServer.html)
├── manifest.webmanifest     # Web App Manifest for native PWA installation (HtmlLib.app)
├── sw.js                    # Service Worker for 100% offline-first application caching
├── wrapper-kit/             # Android APK (HtmlLib.apk) & Desktop native wrapper source
│   ├── android/             # AndroidManifest.xml, MainActivity.java (WebView hardware accel)
│   └── desktop/             # Linux, macOS, and Windows standalone launcher scripts
├── HtmlLib-Native-Kit.zip   # Downloadable native package archive
├── HtmlArts.html            # Legacy pilot monolith (Stage 1-3 baseline reference)
├── LICENSE                  # GNU Affero General Public License v3.0 (GNU AGPLv3)
├── .editorconfig            # Code style & formatting rules
├── .gitattributes           # LF normalization & binary asset mappings
└── .gitignore               # Ignore rules for OS, IDE, and build caches
```

### 1. Ingestion Model & Dynamic Micro-Servers
- **Server ingests Client**: `HtmlArtsServer.html` acts as the host shell and dynamically renders `HtmlArtsClient.html` in a sandboxed `<iframe>`.
- **Dynamic Capability Acquisition**: Rather than bloating the server with all layout algorithms, `HtmlArtsServer.html` ingests specialized micro-servers (such as `PageServer.html` for technical architecture sheets and A4 print engines) on demand.
- **Client never consumes itself**: `HtmlArtsClient.html` is a leaf node focused exclusively on reader rendering, ink annotation, and touch gestures. Zero IndexedDB access in the client.

### 2. High-Scale Dual-Store Persistence (500+ Books, <30ms Latency)
All persistent storage runs through an asynchronous, dual-store interface over browser IndexedDB:
- Database: `htmlarts-local-library` (v2)
  - Store `books_meta`: Lightweight metadata (`id`, `title`, `category`, `genre`, `template`, `updatedAt`, `sizeBytes`). Read time for 500 books is **<15ms**, keeping catalog boot instantaneous and memory under 30MB.
  - Store `books_content`: Heavy HTML payloads and raw source documents (`id`, `html`, `rawHtml`). Fetched on demand when opening a book in **<3ms**.
  - Store `annotations`: Serialized ink strokes linked to specific `bookId`s.
- Database: `htmlarts-assets-v1`
  - Store `assets`: Binary blobs for local images, media, and attachments.

### 3. Dual-Runtime Distribution
HtmlArts provides one-click options to run anywhere:
1. **Browser Runtime (`HTMLARTSAPP.html`)**:
   - Single-file zero-dependency super-bundle containing all 500 books, embedded client reader, and self-extracting IndexedDB bootstrapper.
   - Openable by double-clicking in Chrome, Safari, Firefox, or Edge completely offline.
2. **Native App & Mobile APK (`HtmlLib.app` / `HtmlLib.apk`)**:
   - **PWA 1-Click Install**: Install directly to Desktop or Android home screen with no URL bar.
   - **Android APK Kit**: Preconfigured Android WebView project ready to compile with `./gradlew assembleRelease` into `HtmlLib.apk`.
   - **Desktop Launchers**: Native launcher scripts for macOS, Linux, and Windows.

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
