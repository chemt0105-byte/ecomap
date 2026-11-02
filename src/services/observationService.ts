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
const DELETED_IDS_STORAGE_KEY = 'junghwa_deleted_observation_ids';
const INITIAL_SYNC_COMPLETED_KEY = 'junghwa_initial_cloud_sync_done';

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
 * 영구 삭제된 관찰 기록 ID 목록 (툼스톤 관리)
 * 다중 기기 및 로컬 캐시와의 동기화 과정에서 삭제된 데이터가 재부활(Zombie Resurrection)하는 문제를 완벽히 차단
 */
export function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

export function markAsDeleted(id: string): void {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function unmarkAsDeleted(id: string): void {
  try {
    const set = getDeletedIds();
    set.delete(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

let isFirestoreListenerInitialized = false;

/**
 * Real-time Firestore snapshot listener:
 * 학생이나 교사가 새 관찰을 올리거나 삭제할 때 실시간으로 최신 상태를 반영
 */
function initializeFirestoreListener(): void {
  if (isFirestoreListenerInitialized || typeof window === 'undefined') return;
  isFirestoreListenerInitialized = true;

  try {
    onSnapshot(
      collection(db, 'observations'),
      async (snapshot) => {
        const deletedIds = getDeletedIds();
        const cloudRecords: Observation[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Observation;
          if (data && data.id) {
            if (deletedIds.has(data.id)) {
              // 사용자가 삭제한 데이터가 클라우드에 아직 남아있다면 즉각 영구 삭제 수행
              deleteDoc(doc(db, 'observations', data.id)).catch(() => {});
            } else {
              cloudRecords.push(data);
            }
          }
        });

        // 로컬 오프라인 작성 중 아직 동기화되지 않은 기록(_pendingSync) 보존
        const localRecords = await getLocalObservations();
        const offlinePending = localRecords.filter(
          r => r && r.id && r._pendingSync && !deletedIds.has(r.id) && !cloudRecords.some(c => c.id === r.id)
        );

        const combined = [...cloudRecords, ...offlinePending].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        await saveLocalObservations(combined);
        notifyAllListeners();

        // 오프라인 대기 기록이 있다면 클라우드로 업로드 시도
        if (offlinePending.length > 0) {
          for (const item of offlinePending) {
            try {
              const { _pendingSync, ...cleanItem } = item;
              await setDoc(doc(db, 'observations', item.id), cleanItem);
              item._pendingSync = false;
            } catch {
              // 네트워크 재연결 시 재시도
            }
          }
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
 * 1. Cloud Firestore에서 실시간 최신 목록 취득 (삭제된 항목 제외)
 * 2. 초기 1회에 한하여 완전히 비어있을 때만 샘플 데이터 자동 초기화 (이후 사용자가 모두 삭제한 경우 빈 상태 유지)
 * 3. 로컬 IndexedDB에 안전하게 동기화 저장
 * 4. 네트워크 단절 시 IndexedDB 로컬 데이터 반환
 */
export async function getObservations(): Promise<Observation[]> {
  initializeFirestoreListener();
  const deletedIds = getDeletedIds();

  try {
    const querySnapshot = await getDocs(collection(db, 'observations'));
    const cloudRecords: Observation[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Observation;
      if (data && data.id) {
        if (deletedIds.has(data.id)) {
          // 삭제된 툼스톤 문서 정리
          deleteDoc(doc(db, 'observations', data.id)).catch(() => {});
        } else {
          cloudRecords.push(data);
        }
      }
    });

    const localData = await getLocalObservations();
    const cleanedLocal = localData.filter(item => item && item.id && !deletedIds.has(item.id));
    const hasEverInitialized = typeof window !== 'undefined' && localStorage.getItem(INITIAL_SYNC_COMPLETED_KEY) === 'true';

    if (cloudRecords.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIAL_SYNC_COMPLETED_KEY, 'true');
      }
      const offlinePending = cleanedLocal.filter(
        r => r._pendingSync && !cloudRecords.some(c => c.id === r.id)
      );
      const combined = [...cloudRecords, ...offlinePending].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      await saveLocalObservations(combined);
      return combined;
    } else if (!hasEverInitialized && cleanedLocal.length === 0) {
      // 최초 배포 시에만 1회 예시 데이터 생성
      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIAL_SYNC_COMPLETED_KEY, 'true');
      }
      for (const item of SAMPLE_OBSERVATIONS) {
        unmarkAsDeleted(item.id);
        try {
          await setDoc(doc(db, 'observations', item.id), item);
        } catch {
          // ignore individual seed failure
        }
      }
      await saveLocalObservations(SAMPLE_OBSERVATIONS);
      return SAMPLE_OBSERVATIONS;
    } else {
      // 사용자가 데이터를 모두 삭제했거나 비어있는 상태
      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIAL_SYNC_COMPLETED_KEY, 'true');
      }
      await saveLocalObservations([]);
      return [];
    }
  } catch (err) {
    console.warn('Firestore getDocs fallback to local cache:', err);
  }

  // 네트워크 장애 시 로컬 IndexedDB 캐시 반환 (삭제된 항목 제외)
  const localData = await getLocalObservations();
  const validLocal = localData.filter(item => item && item.id && !deletedIds.has(item.id));
  return validLocal;
}

/**
 * 새로운 관찰 기록 등록
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

  // 삭제 목록에서 제거 (만약 동일 ID가 있었다면 해제)
  unmarkAsDeleted(item.id);

  // 1. Immediately save to IndexedDB
  await addLocalObservation(item);
  notifyAllListeners();

  // 2. Persist to Cloud Firestore
  try {
    const { _pendingSync, ...cleanItem } = item;
    await setDoc(doc(db, 'observations', item.id), cleanItem);
  } catch (err) {
    console.warn('Firestore setDoc failed, flagging for background retry:', err);
    item._pendingSync = true;
    await addLocalObservation(item);
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
 * 1. 툼스톤(DELETED_IDS)에 즉각 등록하여 동기화 루프에 의한 부활 완벽 차단
 * 2. 로컬 IndexedDB 및 캐시에서 제거
 * 3. Cloud Firestore에서 문서 삭제 (deleteDoc)
 * 4. Express 서버 백업 파일에서 삭제
 * 5. 모든 UI 리스너에 최종 반영 알림 전파
 */
export async function deleteObservation(id: string): Promise<boolean> {
  if (!id) return false;

  // 1. 툼스톤에 영구 등록
  markAsDeleted(id);

  // 2. 로컬 IndexedDB에서 즉각 삭제
  await deleteLocalObservation(id);

  // 3. Cloud Firestore에서 삭제
  try {
    await deleteDoc(doc(db, 'observations', id));
  } catch (err) {
    console.warn('Firestore deleteDoc failed:', err);
    try {
      handleFirestoreError(err, OperationType.DELETE, `observations/${id}`);
    } catch {
      // 로컬 삭제 상태 유지
    }
  }

  // 4. Express 서버 백업 삭제
  try {
    fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {
    // ignore
  }

  // 5. 모든 클라우드/로컬 삭제 절차 완료 후 UI 알림 전파
  notifyAllListeners();

  return true;
}

/**
 * [개발/테스트 전용] 예시 관찰 데이터 주입
 */
export async function seedDevObservations(sampleData: Observation[]): Promise<boolean> {
  // 예시 데이터 ID 툼스톤 해제
  for (const item of sampleData) {
    unmarkAsDeleted(item.id);
  }

  await saveLocalObservations(sampleData);

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

  notifyAllListeners();
  return true;
}

/**
 * 전체 데이터 초기화
 */
export async function clearAllObservations(): Promise<boolean> {
  const current = await getLocalObservations();
  for (const item of current) {
    if (item && item.id) {
      markAsDeleted(item.id);
    }
  }

  await saveLocalObservations([]);

  try {
    const snapshot = await getDocs(collection(db, 'observations'));
    for (const docSnap of snapshot.docs) {
      markAsDeleted(docSnap.id);
      await deleteDoc(docSnap.ref).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to clear Firestore observations:', err);
  }

  try {
    fetch('/api/dev/clear', { method: 'POST' }).catch(() => {});
  } catch {
    // ignore
  }

  notifyAllListeners();
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
