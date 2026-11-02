import { Observation } from '../types/observation';
import { STORAGE_KEYS } from '../config/mapConfig';

const DB_NAME = 'JunghwaEcologyDB';
const DB_VERSION = 1;
const STORE_NAME = 'observations';

function openDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = event => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Fallback to localStorage safely
 */
function getLocalStorageFallback(): Observation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function setLocalStorageFallback(list: Observation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(list));
  } catch (e) {
    // If quota exceeded, try saving without heavy image data in localStorage as emergency fallback
    try {
      const lightweight = list.map(item => ({
        ...item,
        imageUrl: item.imageUrl && item.imageUrl.length > 500 ? '' : item.imageUrl,
      }));
      localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }
}

/**
 * Get all observations stored locally on this client device (IndexedDB + localStorage fallback)
 */
export async function getLocalObservations(): Promise<Observation[]> {
  const db = await openDB();
  if (!db) {
    return getLocalStorageFallback();
  }

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result as Observation[];
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          // If IndexedDB is empty, check if localStorage has older records and migrate
          const lsData = getLocalStorageFallback();
          if (lsData.length > 0) {
            saveLocalObservations(lsData).catch(() => {});
            resolve(lsData);
          } else {
            resolve([]);
          }
        }
      };

      req.onerror = () => {
        resolve(getLocalStorageFallback());
      };
    } catch (e) {
      resolve(getLocalStorageFallback());
    }
  });
}

/**
 * Save / Replace list in local store (IndexedDB + localStorage fallback)
 */
export async function saveLocalObservations(list: Observation[]): Promise<void> {
  setLocalStorageFallback(list);

  const db = await openDB();
  if (!db) return;

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of list) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

/**
 * Save single observation to local store
 */
export async function addLocalObservation(obs: Observation): Promise<void> {
  const current = await getLocalObservations();
  const index = current.findIndex(item => item.id === obs.id);
  if (index !== -1) {
    current[index] = obs;
  } else {
    current.unshift(obs);
  }
  await saveLocalObservations(current);
}

/**
 * Delete single observation from local store
 */
export async function deleteLocalObservation(id: string): Promise<void> {
  const current = await getLocalObservations();
  const filtered = current.filter(item => item.id !== id);
  await saveLocalObservations(filtered);
}
