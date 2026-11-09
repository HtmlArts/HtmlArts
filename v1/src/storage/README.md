# Storage

IndexedDB runtime data uses the dedicated `htmlarts-v1-local-library` database with document metadata, document content, annotation, and migration-state stores. The existing `htmlarts-local-library` database remains a read-only migration source; its stores are never upgraded, overwritten, or deleted by v1.

The canonical document content keeps original source, sanitized `safeHtml`, and quarantined `legacyRenderedHtml` separate. Legacy HTML is not promoted to safe content during migration. The old database's reserved `__folio_notes_state__` annotation is standalone workspace data rather than a document annotation; it remains preserved in the old database and is reported at startup because v1 has no corresponding view. Other orphan annotation records still stop migration without changing their source.
