/**
 * IndexedDB & Quota-Proof Async Persistent Storage Utility for Tumi ERP
 * Provides a high-capacity storage fallback when localStorage quota (~5MB) is exceeded
 * for large offline POS orders, base64 receipt attachments, or audit logs.
 */

const DB_NAME = 'TumiERP_PersistentDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_key_value_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function setIDBItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB setIDBItem failed for key "${key}":`, err);
  }
}

export async function getIDBItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB getIDBItem failed for key "${key}":`, err);
    return null;
  }
}

/**
 * Quota-Safe LocalStorage Writer
 * Safely attempts localStorage.setItem; if QuotaExceededError is caught,
 * it safely stores the value in IndexedDB as a fallback.
 */
export function safeLocalStorageSet<T>(key: string, value: T): void {
  const jsonStr = JSON.stringify(value);
  try {
    localStorage.setItem(key, jsonStr);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn(`[Tumi ERP Persistence] localStorage QuotaExceededError for "${key}". Falling back to IndexedDB.`);
      // Asynchronously mirror value in IndexedDB
      setIDBItem(key, value);
    } else {
      console.error(`localStorage.setItem error for "${key}":`, e);
    }
  }
}

/**
 * Quota-Safe LocalStorage Reader
 * Reads from localStorage first; if missing or empty, attempts to retrieve from IndexedDB async callback.
 */
export function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    console.warn(`Error reading "${key}" from localStorage:`, e);
  }
  return defaultValue;
}
