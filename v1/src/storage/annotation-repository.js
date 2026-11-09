import { createAnnotationSet } from "./model.js";
import { requestResult, STORES, transactionResult } from "./database.js";
import { getDocument } from "./document-repository.js";

export async function getAnnotations(database, documentId) {
  const transaction = database.transaction(STORES.annotations, "readonly");
  const result = await requestResult(transaction.objectStore(STORES.annotations).get(documentId));
  return result ?? createAnnotationSet(documentId, []);
}

export async function saveAnnotations(database, documentId, strokes) {
  const document = await getDocument(database, documentId);
  if (!document) {
    throw new Error(`Cannot save annotations for unknown document "${documentId}".`);
  }
  const annotationSet = createAnnotationSet(documentId, strokes);
  const transaction = database.transaction(STORES.annotations, "readwrite");
  const completed = transactionResult(transaction);
  transaction.objectStore(STORES.annotations).put(annotationSet);
  await completed;
  return annotationSet;
}
