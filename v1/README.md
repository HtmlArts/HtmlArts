# HtmlArts v1 Rebuild

This directory contains the modular source for the HtmlArts application and its generated standalone release file.

## Product constraints recorded for v1

- Source modules, the embedded Studio source, build scripts, tests, and generated release artifacts belong under this directory.
- The root `index.html` forwards to `HtmlArtsV1.html` for the GitHub Pages deployment.
- Do not treat imported HTML as a privileged plugin.
- Release one self-contained `HtmlArtsV1.html`; modular source remains in this repository.
- Preserve the current product's colors, tone, and overall UI identity.
- Use IndexedDB for runtime persistence and an explicit file snapshot for portable local persistence.
- Treat imported HTML as untrusted; do not treat it as a privileged plugin.

The v1 home follows the legacy landing-page composition: illustrated hero, library navigation and search, capability shortcuts, and a featured shelf populated from local publications. The About dialog preserves the complete legacy note; home actions route to the existing create, import, reader, studio, refresh, and snapshot workflows.

The modular source builds into the single artifact. The build embeds `src/studio/PageServer.html` as inert template text; the Studio runs only in an opaque-origin sandbox and its exports pass sender, schema, and HTML-sanitization checks before persistence. Studio exports and imported HTML files are independently limited to 5 MiB; oversized imports are rejected before reading. Google Fonts references are omitted from the embedded copy so Studio use stays offline-capable. Runtime and migration boundaries are documented in `src/storage/README.md`; snapshot semantics are documented in `src/export/README.md`; import and rendering policy is documented in `src/ingestion/README.md`. External-resource and rendering policies are confirmed; browser-matrix validation remains a release gate in `../PRDSpecifiction.md`.

## Development

From this directory, run `npm install`, `npm test`, `npm run build`, or `npm run benchmark`. `npm test` runs the unit suite and Playwright browser journeys and requires system Google Chrome or `CHROME_EXECUTABLE`. The benchmark seeds an isolated browser context with 500 documents and reports catalog/search/reader timings. The generated `HtmlArtsV1.html` is the release artifact and must not be edited directly.
