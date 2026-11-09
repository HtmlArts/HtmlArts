# Storage

IndexedDB runtime data uses the dedicated `htmlarts-v1-local-library` database with document metadata, document content, annotation, and migration-state stores. The existing `htmlarts-local-library` database remains a read-only migration source; its stores are never upgraded, overwritten, or deleted by v1.

The canonical document content keeps original source, sanitized `safeHtml`, and quarantined `legacyRenderedHtml` separate. Legacy HTML is not promoted to safe content during migration. The old database can contain both its reserved `__folio_notes_state__` workspace record and orphan annotations left behind when legacy books were deleted. These records are not copied into the v1 library, remain preserved in the old database, and are reported at startup; they do not block migration of valid books and annotations.
