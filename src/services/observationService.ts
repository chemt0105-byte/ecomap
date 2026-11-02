import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Observation } from '../types/observation';
import { SAMPLE_OBSERVATIONS } from '../data/sampleObservations';
import {
  getLocalObservations,
  saveLocalObservations,
  addLocalObservation,
  deleteLocalObservation,
} from './dbStorage';

const BROADCAST_CHANNEL_NAME = 'junghwa_eco_channel';
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // ignore
}

const syncListeners = new Set<() => void>();

function notifyAllListeners(): void {
  for (const listener of syncListeners) {
    try {
      listener();
    } catch (e) {
      console.warn('Listener notification error:', e);
    }
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'OBSERVATIONS_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

/**
 * Merge two observation lists by ID preserving newest updates
 */
function mergeObservations(primaryList: Observation[], fallbackList: Observation[]): Observation[] {
  const map = new Map<string, Observation>();

  for (const item of primaryList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  for (const item of fallbackList) {
    if (item && item.id) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Background push unsynced local observations to Firestore
async function syncLocalToFirestore(localRecords: Observation[], cloudIds: Set<string>): Promise<void> {
  const unsynced = localRecords.filter(r => r && r.id && !cloudIds.has(r.id));
  for (const record of unsynced) {
    try {
      await setDoc(doc(db, 'observations', record.id), record);
    } catch (err) {
      console.warn('Background sync to Firestore failed for record:', record.id, err);
    }
  }
}

let isFirestoreListenerInitialized = false;

/**
 * Real-time Firestore snapshot listener:
 * Automatically pulls observations when any student or teacher posts anywhere.
 */
function initializeFirestoreListener(): void {
  if (isFirestoreListenerInitialized || typeof window === 'undefined') return;
  isFirestoreListenerInitialized = true;

  try {
    onSnapshot(
      collection(db, 'observations'),
      async (snapshot) => {
        const cloudRecords: Observation[] = [];
        snapshot.forEach((docSnap) => {
          cloudRecords.push(docSnap.data() as Observation);
        });

        const localRecords = await getLocalObservations();
        const merged = mergeObservations(cloudRecords, localRecords);

        await saveLocalObservations(merged);
        notifyAllListeners();

        // If local had records not in cloud, push them to Firestore
        const cloudIds = new Set(cloudRecords.map(c => c.id));
        if (merged.length > cloudRecords.length) {
          syncLocalToFirestore(localRecords, cloudIds).catch(() => {});
        }
      },
      (error) => {
        console.warn('Firestore snapshot listener error:', error);
        handleFirestoreError(error, OperationType.GET, 'observations');
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore onSnapshot:', err);
  }
}

/**
 * 전체 관찰 기록 조회
 * 1. Cloud Firestore에서 실시간 최신 목록 취득
 * 2. 만약 Firestore가 완전 비어있다면 샘플 데이터 자동 초기화 (지도가 비어 보이지 않도록 방지)
 * 3. 로컬 IndexedDB에 항상 안전하게 동기화 저장
 * 4. 네트워크 단절 시 IndexedDB 로컬 데이터 반환
 */
export async function getObservations(): Promise<Observation[]> {
  initializeFirestoreListener();

  const localData = await getLocalObservations();

  try {
    const querySnapshot = await getDocs(collection(db, 'observations'));
    const cloudRecords: Observation[] = [];

    querySnapshot.forEach((docSnap) => {
      cloudRecords.push(docSnap.data() as Observation);
    });

    if (cloudRecords.length > 0) {
      const merged = mergeObservations(cloudRecords, localData);
      await saveLocalObservations(merged);

      // Auto-sync unpushed local records if any
      const cloudIds = new Set(cloudRecords.map(c => c.id));
      if (merged.length > cloudRecords.length) {
        syncLocalToFirestore(localData, cloudIds).catch(() => {});
      }

      return merged;
    } else {
      // Cloud is brand new/empty: seed initial observations or local data
      const recordsToSeed = localData.length > 0 ? localData : SAMPLE_OBSERVATIONS;
      for (const item of recordsToSeed) {
        try {
          await setDoc(doc(db, 'observations', item.id), item);
        } catch {
          // ignore individual seed failure
        }
      }
      await saveLocalObservations(recordsToSeed);
      return recordsToSeed;
    }
  } catch (err) {
    console.warn('Firestore getDocs fallback to local cache:', err);
  }

  // Fallback to Express backend if reachable
  try {
    const response = await fetch('/api/observations', {
      headers: { Accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const merged = mergeObservations(result.data, localData);
        await saveLocalObservations(merged);
        return merged;
      }
    }
  } catch {
    // ignore
  }

  return localData.length > 0 ? localData : SAMPLE_OBSERVATIONS;
}

/**
 * 새로운 관찰 기록 등록
 * 1. 로컬 IndexedDB에 먼저 저장 (오프라인/지연 방지)
 * 2. Cloud Firestore에 기록 저장 -> 모든 학생/교사 기기에 실시간 자동 전파
 * 3. 로컬 Express 서버에도 백업 저장
 */
export async function addObservation(
  newRecord: Omit<Observation, 'id' | 'createdAt'>
): Promise<Observation> {
  initializeFirestoreListener();

  const item: Observation = {
    ...newRecord,
    id: 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
  };

  // 1. Immediately save to IndexedDB
  await addLocalObservation(item);
  notifyAllListeners();

  // 2. Persist to Cloud Firestore
  try {
    await setDoc(doc(db, 'observations', item.id), item);
  } catch (err) {
    console.warn('Firestore setDoc failed:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, `observations/${item.id}`);
    } catch {
      // Keep local observation safe even if cloud throws
    }
  }

  // 3. Background backup to Express server
  try {
    fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return item;
}

/**
 * 관찰 기록 수정
 */
export async function updateObservation(
  id: string,
  updates: Partial<Observation>
): Promise<Observation | null> {
  const currentList = await getLocalObservations();
  const index = currentList.findIndex(o => o.id === id);
  let updatedItem: Observation | null = null;

  if (index !== -1) {
    currentList[index] = {
      ...currentList[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    updatedItem = currentList[index];
    await saveLocalObservations(currentList);
    notifyAllListeners();
  }

  // Update in Cloud Firestore
  try {
    await updateDoc(doc(db, 'observations', id), updates);
  } catch (err) {
    console.warn('Firestore updateDoc failed:', err);
    try {
      handleFirestoreError(err, OperationType.UPDATE, `observations/${id}`);
    } catch {
      // Local copy is already updated
    }
  }

  // Update in Express server
  try {
    fetch(`/api/observations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return updatedItem;
}

/**
 * 관찰 기록 삭제
 */
export async function deleteObservation(id: string): Promise<boolean> {
  // 1. Delete locally first
  await deleteLocalObservation(id);
  notifyAllListeners();

  // 2. Delete from Cloud Firestore
  try {
    await deleteDoc(doc(db, 'observations', id));
  } catch (err) {
    console.warn('Firestore deleteDoc failed:', err);
    try {
      handleFirestoreError(err, OperationType.DELETE, `observations/${id}`);
    } catch {
      // Local copy is deleted
    }
  }

  // 3. Delete from Express server
  try {
    fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {
    // ignore
  }

  return true;
}

/**
 * [개발/테스트 전용] 예시 관찰 데이터 주입
 */
export async function seedDevObservations(sampleData: Observation[]): Promise<boolean> {
  await saveLocalObservations(sampleData);
  notifyAllListeners();

  for (const item of sampleData) {
    try {
      await setDoc(doc(db, 'observations', item.id), item);
    } catch {
      // ignore
    }
  }

  try {
    fetch('/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleData),
    }).catch(() => {});
  } catch {
    // ignore
  }

  return true;
}

/**
 * 전체 데이터 초기화
 */
export async function clearAllObservations(): Promise<boolean> {
  const current = await getLocalObservations();
  await saveLocalObservations([]);
  notifyAllListeners();

  for (const item of current) {
    try {
      await deleteDoc(doc(db, 'observations', item.id));
    } catch {
      // ignore
    }
  }

  try {
    fetch('/api/dev/clear', { method: 'POST' }).catch(() => {});
  } catch {
    // ignore
  }

  return true;
}

/**
 * UI 컴포넌트 실시간 동기화 구독
 */
export function subscribeToObservationsSync(callback: () => void): () => void {
  syncListeners.add(callback);

  if (broadcastChannel) {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OBSERVATIONS_UPDATED') {
        callback();
      }
    };
    broadcastChannel.addEventListener('message', handler);
    return () => {
      syncListeners.delete(callback);
      broadcastChannel?.removeEventListener('message', handler);
    };
  }

  return () => {
    syncListeners.delete(callback);
  };
}
