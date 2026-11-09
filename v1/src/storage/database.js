export const DATABASE_NAME = "htmlarts-v1-local-library";
export const DATABASE_VERSION = 1;
export const LEGACY_DATABASE_NAME = "htmlarts-local-library";

export const STORES = Object.freeze({
  documents: "documents",
  contents: "document_content",
  annotations: "document_annotations",
  migration: "migration_state",
});

export function openDatabase(indexedDBApi = globalThis.indexedDB) {
  if (!indexedDBApi) {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBApi.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORES.documents)) {
        database.createObjectStore(STORES.documents, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORES.contents)) {
        database.createObjectStore(STORES.contents, { keyPath: "documentId" });
      }
      if (!database.objectStoreNames.contains(STORES.annotations)) {
        database.createObjectStore(STORES.annotations, { keyPath: "documentId" });
      }
      if (!database.objectStoreNames.contains(STORES.migration)) {
        database.createObjectStore(STORES.migration, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open HtmlArts storage."));
    request.onblocked = () => reject(new Error("HtmlArts storage upgrade is blocked by another tab."));
  });
}

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}
