/**
 * Хранилище сейва: IndexedDB, с откатом на localStorage.
 * Сейв целиком помещается в один ключ — игра полностью офлайновая.
 */
const DB_NAME = 'eclipse-idle';
const STORE = 'kv';
const KEY = 'save';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let settled = false;
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        if (!settled) {
          settled = true;
          resolve(req.result);
        }
      };
      req.onerror = () => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      };
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 1500);
    } catch {
      resolve(null);
    }
  });
}

export async function loadRaw(): Promise<string | null> {
  const db = await openDb();
  if (db) {
    const v = await new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (v) return v;
  }
  try {
    return localStorage.getItem(`${DB_NAME}:${KEY}`);
  } catch {
    return null;
  }
}

export async function saveRaw(value: string): Promise<void> {
  const db = await openDb();
  if (db) {
    const ok = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
    if (ok) return;
  }
  try {
    localStorage.setItem(`${DB_NAME}:${KEY}`, value);
  } catch {
    /* переполнение — молча игнорируем, игра продолжит работать в памяти */
  }
}

export async function clearSave(): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.removeItem(`${DB_NAME}:${KEY}`);
  } catch {
    /* noop */
  }
}
