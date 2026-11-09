# Storage

IndexedDB runtime data uses the dedicated `htmlarts-v1-local-library` database with document metadata, document content, annotation, and migration-state stores. The existing `htmlarts-local-library` database remains a read-only migration source; its stores are never upgraded, overwritten, or deleted by v1.

The canonical document content keeps original source, sanitized `safeHtml`, and quarantined `legacyRenderedHtml` separate. Legacy HTML is not promoted to safe content during migration.
