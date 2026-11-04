// Remembers the PC folder chosen for backups. Browsers keep this handle only in IndexedDB,
// and only Chromium browsers (Chrome, Edge) can write to a chosen folder.
const DB_NAME = 'asset-manager-backups', STORE = 'folders';

export const supportsBackupFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function chooseBackupFolder(userId: string) {
  const handle = await (window as any).showDirectoryPicker({ id: 'asset-manager-backups', mode: 'readwrite' });
  await withStore('readwrite', store => store.put(handle, userId));
  return handle;
}

export async function loadBackupFolder(userId: string) {
  try { return (await withStore('readonly', store => store.get(userId))) || null; } catch { return null; }
}

export async function forgetBackupFolder(userId: string) {
  await withStore('readwrite', store => store.delete(userId));
}

export const folderPermission = (handle: any): Promise<string> => handle.queryPermission({ mode: 'readwrite' });
/** Must be called from a click: browsers refuse to ask otherwise. */
export const requestFolderPermission = (handle: any): Promise<string> => handle.requestPermission({ mode: 'readwrite' });

export async function writeBackupFile(handle: any, fileName: string, text: string) {
  const file = await handle.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}
