import { createDocument, createDocumentContent } from "./model.js";
import { requestResult, STORES, transactionResult } from "./database.js";

export async function listDocuments(database) {
  const transaction = database.transaction(STORES.documents, "readonly");
  return requestResult(transaction.objectStore(STORES.documents).getAll());
}

export async function getDocument(database, documentId) {
  const transaction = database.transaction(STORES.documents, "readonly");
  return requestResult(transaction.objectStore(STORES.documents).get(documentId));
}

export async function updateDocumentMetadata(database, documentId, metadata) {
  const transaction = database.transaction(STORES.documents, "readwrite");
  const store = transaction.objectStore(STORES.documents);
  const completed = transactionResult(transaction);
  const current = await requestResult(store.get(documentId));
  if (!current) {
    transaction.abort();
    await completed.catch(() => {});
    throw new Error(`Cannot update unknown document "${documentId}".`);
  }
  const document = createDocument({
    ...current,
    ...metadata,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  store.put(document);
  await completed;
  return document;
}

export async function updateDocumentContent(database, documentId, contentInput, metadata = {}) {
  const transaction = database.transaction([STORES.documents, STORES.contents], "readwrite");
  const documentStore = transaction.objectStore(STORES.documents);
  const contentStore = transaction.objectStore(STORES.contents);
  const completed = transactionResult(transaction);
  const current = await requestResult(documentStore.get(documentId));
  if (!current) {
    transaction.abort();
    await completed.catch(() => {});
    throw new Error(`Cannot update content for unknown document "${documentId}".`);
  }
  const currentContent = await requestResult(contentStore.get(documentId));
  const updatedAt = new Date().toISOString();
  const document = createDocument({
    ...current,
    ...metadata,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt,
  });
  const content = createDocumentContent(documentId, {
    ...currentContent,
    ...contentInput,
    updatedAt,
  });
  documentStore.put(document);
  contentStore.put(content);
  await completed;
  return { document, content };
}

export async function getDocumentContent(database, documentId) {
  const transaction = database.transaction(STORES.contents, "readonly");
  return requestResult(transaction.objectStore(STORES.contents).get(documentId));
}

export async function saveDocument(database, documentInput, contentInput) {
  const document = createDocument(documentInput);
  const content = createDocumentContent(document.id, contentInput);
  const transaction = database.transaction([STORES.documents, STORES.contents], "readwrite");
  const completed = transactionResult(transaction);
  transaction.objectStore(STORES.documents).put(document);
  transaction.objectStore(STORES.contents).put(content);
  await completed;
  return { document, content };
}

export async function insertDocument(database, documentInput, contentInput) {
  const document = createDocument(documentInput);
  const content = createDocumentContent(document.id, contentInput);
  const transaction = database.transaction([STORES.documents, STORES.contents], "readwrite");
  const completed = transactionResult(transaction);
  const documentRequest = transaction.objectStore(STORES.documents).add(document);
  const contentRequest = transaction.objectStore(STORES.contents).add(content);
  let requestError;
  documentRequest.onerror = () => {
    requestError ??= documentRequest.error;
  };
  contentRequest.onerror = () => {
    requestError ??= contentRequest.error;
  };
  try {
    await completed;
  } catch (error) {
    throw requestError ?? error;
  }
  return { document, content };
}

export async function deleteDocument(database, documentId) {
  const transaction = database.transaction(
    [STORES.documents, STORES.contents, STORES.annotations],
    "readwrite",
  );
  const completed = transactionResult(transaction);
  transaction.objectStore(STORES.documents).delete(documentId);
  transaction.objectStore(STORES.contents).delete(documentId);
  transaction.objectStore(STORES.annotations).delete(documentId);
  await completed;
}

export async function countDocuments(database) {
  const transaction = database.transaction(STORES.documents, "readonly");
  return requestResult(transaction.objectStore(STORES.documents).count());
}
