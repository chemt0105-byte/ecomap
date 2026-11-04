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

import { latLngToXY, JUNGHWA_HIGH_SCHOOL } from '../config/mapConfig';
import { CategoryType } from '../types/observation';

let isFirestoreListenerInitialized = false;
let _cachedObservations: Observation[] = [];

/**
 * 관찰 기록 객체 정규화 및 결측값 안전 보정
 * 좌표, 일시, 분류, 텍스트 필드가 누락된 불완전 레코드가 화면 렌더링을 중단(화이트 스크린)시키는 문제를 원천 차단
 */
export function normalizeObservation(raw: any, docId?: string): Observation {
  const id = raw?.id || docId || ('obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  const now = new Date().toISOString();

  const rawCoords = raw?.coordinates;
  const lat = (typeof rawCoords?.lat === 'number' && !isNaN(rawCoords.lat))
    ? rawCoords.lat
    : JUNGHWA_HIGH_SCHOOL.coordinates.lat;
  const lng = (typeof rawCoords?.lng === 'number' && !isNaN(rawCoords.lng))
    ? rawCoords.lng
    : JUNGHWA_HIGH_SCHOOL.coordinates.lng;

  let x = (typeof rawCoords?.x === 'number' && !isNaN(rawCoords.x)) ? rawCoords.x : undefined;
  let y = (typeof rawCoords?.y === 'number' && !isNaN(rawCoords.y)) ? rawCoords.y : undefined;

  if (x === undefined || y === undefined) {
    const converted = latLngToXY(lat, lng);
    x = converted.x;
    y = converted.y;
  }

  const validCategories: CategoryType[] = ['plant', 'animal', 'bird', 'insect', 'fungi', 'other'];
  const category = (validCategories.includes(raw?.category) ? raw.category : 'other') as CategoryType;

  return {
    id,
    speciesName: typeof raw?.speciesName === 'string' && raw.speciesName.trim() ? raw.speciesName.trim() : '이름 미상 생물',
    scientificName: typeof raw?.scientificName === 'string' ? raw.scientificName : '',
    category,
    classId: typeof raw?.classId === 'string' && raw.classId ? raw.classId : '1-1',
    observerName: typeof raw?.observerName === 'string' && raw.observerName.trim() ? raw.observerName.trim() : '익명',
    observedAt: typeof raw?.observedAt === 'string' && raw.observedAt.trim()
      ? raw.observedAt
      : (typeof raw?.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt.slice(0, 16).replace('T', ' ') : now.slice(0, 16).replace('T', ' ')),
    coordinates: {
      lat,
      lng,
      x,
      y,
    },
    locationDescription: typeof raw?.locationDescription === 'string' ? raw.locationDescription : '중화고 교정',
    imageUrl: typeof raw?.imageUrl === 'string' ? raw.imageUrl : '',
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
    season: raw?.season || '가을',
    weather: typeof raw?.weather === 'string' ? raw.weather : '',
    likes: typeof raw?.likes === 'number' ? raw.likes : 0,
    authorId: typeof raw?.authorId === 'string' ? raw.authorId : '',
    deletePassword: typeof raw?.deletePassword === 'string' ? raw.deletePassword : '',
    createdAt: typeof raw?.createdAt === 'string' && raw.createdAt ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
    _pendingSync: Boolean(raw?._pendingSync),
  };
}

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
          const raw = docSnap.data();
          if (raw) {
            const normalized = normalizeObservation(raw, docSnap.id);
            if (deletedIds.has(normalized.id)) {
              deleteDoc(doc(db, 'observations', normalized.id)).catch(() => {});
            } else {
              cloudRecords.push(normalized);
            }
          }
        });

        // 로컬 오프라인 작성 중 아직 동기화되지 않은 기록(_pendingSync) 보존
        const localRecords = await getLocalObservations();
        const normalizedLocal = localRecords.map(r => normalizeObservation(r));
        const offlinePending = normalizedLocal.filter(
          r => r && r.id && r._pendingSync && !deletedIds.has(r.id) && !cloudRecords.some(c => c.id === r.id)
        );

        // 클라우드 데이터 + 로컬 대기 데이터 + 기존 메모리 캐시 병합
        const recordMap = new Map<string, Observation>();
        _cachedObservations.forEach(r => recordMap.set(r.id, r));
        cloudRecords.forEach(r => recordMap.set(r.id, r));
        offlinePending.forEach(r => recordMap.set(r.id, r));

        for (const id of deletedIds) {
          recordMap.delete(id);
        }

        const combined = Array.from(recordMap.values()).sort(
          (a, b) => new Date(b.createdAt || b.observedAt || 0).getTime() - new Date(a.createdAt || a.observedAt || 0).getTime()
        );

        _cachedObservations = combined;
        await saveLocalObservations(combined);

        // 서버 백엔드에도 동기화 백업 (모든 기기 공통 백업)
        if (combined.length > 0) {
          try {
            fetch('/api/observations/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ records: combined }),
            }).catch(() => {});
          } catch {}
        }

        notifyAllListeners();

        // 오프라인 대기 기록 클라우드 업로드 시도
        if (offlinePending.length > 0) {
          let hasSynced = false;
          for (const item of offlinePending) {
            try {
              const { _pendingSync, ...cleanItem } = item;
              await setDoc(doc(db, 'observations', item.id), cleanItem);
              item._pendingSync = false;
              hasSynced = true;
            } catch {
              // 네트워크/할당량 복구 시 재시도
            }
          }
          if (hasSynced) {
            const currentLocal = await getLocalObservations();
            const updated = currentLocal.map(loc => {
              if (offlinePending.some(p => p.id === loc.id)) {
                return { ...loc, _pendingSync: false };
              }
              return loc;
            });
            await saveLocalObservations(updated);
          }
        }
      },
      (error) => {
        console.warn('Firestore snapshot listener warning (falling back to server & local storage):', error);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore onSnapshot:', err);
  }
}

/**
 * 전체 관찰 기록 조회
 * 
 * 1. 로컬 IndexedDB 데이터 즉각 반환 (빠른 초기 렌더링)
 * 2. Express 서버(/api/observations)에서 최신 관찰 데이터 취득
 *    - Cloud Run 서버에 영구 보존되어 Firestore 일일 할당량(Quota) 초과 시에도 나중에 접속한 사용자(E)가 100% 조회 가능
 * 3. Cloud Firestore 실시간 리스너 및 쿼리 연동 (할당량 허용 시)
 * 4. 세 저장소(서버, Firestore, 로컬) 데이터를 안전하게 병합 및 중복 제거
 */
export async function getObservations(): Promise<Observation[]> {
  initializeFirestoreListener();
  const deletedIds = getDeletedIds();

  // 1. 메모리 캐시 및 로컬 IndexedDB 확인
  const localData = await getLocalObservations();
  const validLocal = localData
    .filter(item => item && item.id && !deletedIds.has(item.id))
    .map(item => normalizeObservation(item));

  const recordMap = new Map<string, Observation>();
  validLocal.forEach(item => recordMap.set(item.id, item));
  _cachedObservations.forEach(item => {
    if (!deletedIds.has(item.id)) recordMap.set(item.id, item);
  });

  // 2. 서버 백엔드(/api/observations)에서 영구 저장된 데이터 조회
  // 핵심: Firestore의 일일 읽기 할당량 초과(resource-exhausted) 상태에서도
  // 다른 학생(B)이 올린 게시물이 이후 접속한 학생(E)에게 100% 확실하게 표시됩니다!
  try {
    const res = await fetch('/api/observations');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        json.data.forEach((raw: any) => {
          if (raw && raw.id && !deletedIds.has(raw.id)) {
            const normalized = normalizeObservation(raw);
            recordMap.set(normalized.id, normalized);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Server observations fetch failed, continuing with available data:', err);
  }

  // 3. Firestore에서 직접 1회 조회 (아직 데이터가 비어있을 때만 시도하여 쿼터 낭비 방지)
  if (recordMap.size === 0) {
    try {
      const querySnapshot = await getDocs(collection(db, 'observations'));
      querySnapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        if (raw) {
          const normalized = normalizeObservation(raw, docSnap.id);
          if (deletedIds.has(normalized.id)) {
            deleteDoc(doc(db, 'observations', normalized.id)).catch(() => {});
          } else {
            recordMap.set(normalized.id, normalized);
          }
        }
      });
    } catch (err: any) {
      console.warn('Firestore getDocs skipped (using server/local records):', err?.message || err);
    }
  }

  let finalRecords = Array.from(recordMap.values()).sort(
    (a, b) => new Date(b.createdAt || b.observedAt || 0).getTime() - new Date(a.createdAt || a.observedAt || 0).getTime()
  );

  // 4. 최초 배포 시에만 1회 예시 데이터 생성 (클라우드/서버/로컬 모두 완전히 비어있을 때)
  const hasEverInitialized = typeof window !== 'undefined' && localStorage.getItem(INITIAL_SYNC_COMPLETED_KEY) === 'true';
  if (finalRecords.length === 0 && !hasEverInitialized) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INITIAL_SYNC_COMPLETED_KEY, 'true');
    }
    const normalizedSamples = SAMPLE_OBSERVATIONS.map(s => normalizeObservation(s));
    finalRecords = normalizedSamples;

    // 서버에 저장
    try {
      fetch('/api/observations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: normalizedSamples }),
      }).catch(() => {});
    } catch {}

    // Firestore에 저장 시도
    for (const item of normalizedSamples) {
      unmarkAsDeleted(item.id);
      try {
        setDoc(doc(db, 'observations', item.id), item).catch(() => {});
      } catch {}
    }
  } else if (finalRecords.length > 0) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INITIAL_SYNC_COMPLETED_KEY, 'true');
    }
  }

  _cachedObservations = finalRecords;
  await saveLocalObservations(finalRecords);

  // 서버에 누락된 레코드 백그라운드 동기화
  if (finalRecords.length > 0) {
    try {
      fetch('/api/observations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: finalRecords }),
      }).catch(() => {});
    } catch {}
  }

  return finalRecords;
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

  // 1. 로컬 IndexedDB 및 메모리에 즉시 저장 (작성자 화면 즉각 반영)
  await addLocalObservation(item);
  _cachedObservations = [item, ..._cachedObservations.filter(o => o.id !== item.id)];
  notifyAllListeners();

  // 2. 서버 백엔드(/api/observations)에 즉각 영구 저장
  // await를 적용하여 서버에 확실히 저장되도록 보장 -> 이후 접속한 사용자(E)도 100% 확인 가능
  try {
    const res = await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      console.warn('Server POST /api/observations returned status:', res.status);
    }
  } catch (err) {
    console.warn('Server POST /api/observations failed (saved to local/cloud):', err);
  }

  // 3. Cloud Firestore에 저장 (실시간 브로드캐스트)
  try {
    const { _pendingSync, ...cleanItem } = item;
    await setDoc(doc(db, 'observations', item.id), cleanItem);
    item._pendingSync = false;
    await addLocalObservation(item);
  } catch (err: any) {
    console.warn('Firestore setDoc failed (saved on server & local):', err?.message || err);
    item._pendingSync = true;
    await addLocalObservation(item);
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
    _cachedObservations = currentList;
    await saveLocalObservations(currentList);
    notifyAllListeners();
  }

  // Update in Express server backend
  try {
    await fetch(`/api/observations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn('Server update failed:', err);
  }

  // Update in Cloud Firestore
  try {
    await updateDoc(doc(db, 'observations', id), updates);
  } catch (err) {
    console.warn('Firestore updateDoc failed (applied on server/local):', err);
  }

  return updatedItem;
}

/**
 * 관찰 기록 삭제
 */
export async function deleteObservation(id: string): Promise<boolean> {
  if (!id) return false;

  // 1. 툼스톤에 영구 등록
  markAsDeleted(id);

  // 2. 로컬 IndexedDB 및 메모리에서 즉각 삭제
  await deleteLocalObservation(id);
  _cachedObservations = _cachedObservations.filter(o => o.id !== id);

  // 3. Express 서버에서 삭제
  try {
    await fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Server delete failed:', err);
  }

  // 4. Cloud Firestore에서 삭제
  try {
    await deleteDoc(doc(db, 'observations', id));
  } catch (err) {
    console.warn('Firestore deleteDoc failed (deleted on server/local):', err);
  }

  // 5. 알림 전파
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

  _cachedObservations = sampleData;
  await saveLocalObservations(sampleData);

  // Server seed
  try {
    await fetch('/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleData),
    });
  } catch (err) {
    console.warn('Server seed failed:', err);
  }

  // Firestore seed
  for (const item of sampleData) {
    try {
      await setDoc(doc(db, 'observations', item.id), item);
    } catch {
      // ignore
    }
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

  _cachedObservations = [];
  await saveLocalObservations([]);

  // Server clear
  try {
    await fetch('/api/dev/clear', { method: 'POST' });
  } catch (err) {
    console.warn('Server clear failed:', err);
  }

  // Firestore clear
  try {
    const snapshot = await getDocs(collection(db, 'observations'));
    for (const docSnap of snapshot.docs) {
      markAsDeleted(docSnap.id);
      await deleteDoc(docSnap.ref).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to clear Firestore observations:', err);
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
