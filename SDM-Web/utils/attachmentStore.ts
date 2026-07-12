// Binary attachment storage for SDM Web, backed by IndexedDB (localStorage's
// ~5MB quota can't hold PDFs/images). AttachedFile.uri holds an "idb://<id>"
// reference; the actual Blob lives here. Object URLs are created on demand for
// preview/download and revoked by the caller.

const DB_NAME = 'sdm-web';
const STORE = 'attachments';
const URI_PREFIX = 'idb://';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const isAttachmentUri = (uri: string): boolean => !!uri && uri.startsWith(URI_PREFIX);

export const idFromUri = (uri: string): string => (isAttachmentUri(uri) ? uri.slice(URI_PREFIX.length) : uri);

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Store a blob and return its "idb://<id>" reference. */
export const putBlob = async (blob: Blob): Promise<string> => {
  const id = newId();
  await tx('readwrite', (store) => store.put(blob, id));
  return `${URI_PREFIX}${id}`;
};

export const getBlob = async (uri: string): Promise<Blob | null> => {
  const res = await tx<Blob | undefined>('readonly', (store) => store.get(idFromUri(uri)));
  return res ?? null;
};

export const deleteBlob = async (uri: string): Promise<void> => {
  if (!isAttachmentUri(uri)) return;
  await tx('readwrite', (store) => store.delete(idFromUri(uri)));
};

/** Copy an existing attachment blob under a fresh id. Returns the new uri. */
export const cloneBlob = async (uri: string): Promise<string> => {
  const blob = await getBlob(uri);
  if (!blob) throw new Error('attachment not found');
  return putBlob(blob);
};

/** Object URL for preview/download. Caller should URL.revokeObjectURL when done. */
export const getObjectUrl = async (uri: string): Promise<string | null> => {
  const blob = await getBlob(uri);
  return blob ? URL.createObjectURL(blob) : null;
};

/** Open an attachment in a new browser tab (preview). */
export const openAttachment = async (uri: string): Promise<void> => {
  const url = await getObjectUrl(uri);
  if (url && typeof window !== 'undefined') window.open(url, '_blank');
};

/** Trigger a browser download of the attachment. */
export const downloadAttachment = async (uri: string, fileName: string): Promise<void> => {
  const url = await getObjectUrl(uri);
  if (!url || typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
