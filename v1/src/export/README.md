# Export

The portable snapshot is embedded as escaped JSON in the `htmlarts-snapshot` data element of one `HtmlArtsV1.html` file. IndexedDB remains the runtime source of truth. At startup, a snapshot hydrates only an empty v1 database; existing runtime data wins over a stale embedded snapshot.
