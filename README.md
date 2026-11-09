# HtmlArts

HtmlArts is a local-first HTML publication library for reading, writing, annotating, and organizing personal books and notes. The application is built from modular source in [`v1/`](./v1/) and distributed as the standalone [`v1/HtmlArtsV1.html`](./v1/HtmlArtsV1.html) file.

## Run the standalone application

Open `v1/HtmlArtsV1.html` in a modern browser. Your library is stored locally in that browser; use the in-app portable snapshot action to export a copy containing your saved publications and annotations.

The root `index.html` forwards to the standalone application for GitHub Pages. No account or server-side database is required.

## Develop and validate

Requirements: Node.js 18+ and npm. From the repository root:

```sh
npm --prefix v1 ci
npm --prefix v1 test
```

The test command builds the standalone artifact, runs unit tests, and runs Playwright browser tests. System Google Chrome is used by default; `CHROME_EXECUTABLE` may point to a compatible local Chromium executable.

To build without running tests:

```sh
npm --prefix v1 run build
```

Edit modular files under `v1/src/`; do not edit the generated `v1/HtmlArtsV1.html` directly. Product requirements and release evidence are in [`PRDSpecifiction.md`](./PRDSpecifiction.md), [`plan.md`](./plan.md), and [`v1/runtime-validation-report.md`](./v1/runtime-validation-report.md).

## Privacy and safety

The application is local-first. Imported HTML is treated as untrusted content, sanitized before storage, and never runs as an application plugin. See [`v1/README.md`](./v1/README.md) for architecture and product boundaries.

## License

Licensed under the [GNU Affero General Public License v3.0](./LICENSE).
