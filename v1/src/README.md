# v1 Source Boundaries

- `core/`: application bootstrap and shared configuration.
- `ingestion/`: Phase 3 document validation and HTML processing.
- `storage/`: Phase 2 runtime persistence and portable snapshot support.
- `reader/`: Phase 4 reading, navigation, and annotation presentation.
- `library/`: Phase 4 catalog and document workflows.
- `export/`: Phase 2 portable `HtmlArtsV1.html` snapshot behavior.

The source is modular; the build embeds its JavaScript and CSS into one standalone `HtmlArtsV1.html`.
