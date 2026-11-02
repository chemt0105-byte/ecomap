import { Observation } from '../types/observation';
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
} catch (e) {
  // ignore
}

function notifySync(): void {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'OBSERVATIONS_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
}

/**
 * Merge two observation lists by ID preserving the newest updates
 */
function mergeObservations(serverList: Observation[], localList: Observation[]): Observation[] {
  const map = new Map<string, Observation>();

  // Insert server items first
  for (const item of serverList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Merge local items that are not in server yet
  for (const item of localList) {
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

/**
 * Sync unpushed local observations to the server in the background
 */
async function syncUnpushedToServer(localList: Observation[], serverList: Observation[]): Promise<void> {
  const serverIds = new Set(serverList.map(s => s.id));
  const unpushed = localList.filter(item => item && item.id && !serverIds.has(item.id));

  if (unpushed.length === 0) return;

  try {
    await fetch('/api/observations/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: unpushed }),
    });
  } catch {
    // If batch sync is not supported or fails, push individually
    for (const item of unpushed) {
      try {
        await fetch('/api/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch {
        break;
      }
    }
  }
}

/**
 * 전체 관찰 기록 조회
 * 1. 서버 API 호출 시도
 * 2. 성공 시 로컬 IndexedDB 데이터와 병합하여 누락 방지
 * 3. 서버가 비어있거나 통신 불가 시 로컬 데이터 안전 반환 (절대 빈 배열로 덮어쓰지 않음)
 */
export async function getObservations(): Promise<Observation[]> {
  const localData = await getLocalObservations();

  try {
    const response = await fetch('/api/observations', {
      headers: { Accept: 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const serverData: Observation[] = result.data;

        // Merge server and local records
        const merged = mergeObservations(serverData, localData);
        await saveLocalObservations(merged);

        // Background sync: If local has student records not yet on server, push them
        if (merged.length > serverData.length) {
          syncUnpushedToServer(localData, serverData).catch(() => {});
        }

        return merged;
      }
    }
  } catch (err) {
    console.warn('Server API not reachable or static host, using local database cache:', err);
  }

  // Fallback to local store (IndexedDB / localStorage)
  return localData;
}

/**
 * 새로운 관찰 기록 등록
 * 1. 즉시 로컬 데이터베이스(IndexedDB)에 저장하여 데이터 유실 100% 방지
 * 2. 서버 API로 전송하여 중앙 데이터베이스에 영구 보존
 */
export async function addObservation(
  newRecord: Omit<Observation, 'id' | 'createdAt'>
): Promise<Observation> {
  const item: Observation = {
    ...newRecord,
    id: 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
  };

  // 1. Immediately save to local high-capacity store (IndexedDB)
  await addLocalObservation(item);
  notifySync();

  // 2. Persist to server API
  try {
    const response = await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      if (result.success && result.data) {
        const saved = result.data;
        await addLocalObservation(saved);
        notifySync();
        return saved;
      }
    }
  } catch (err) {
    console.warn('Server API not reachable right now; record safely preserved in local database:', err);
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
    notifySync();
  }

  try {
    const response = await fetch(`/api/observations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      if (result.success && result.data) {
        await addLocalObservation(result.data);
        notifySync();
        return result.data;
      }
    }
  } catch (err) {
    console.warn('Failed to update on server, applied to local database:', err);
  }

  return updatedItem;
}

/**
 * 관찰 기록 삭제
 */
export async function deleteObservation(id: string): Promise<boolean> {
  // Delete locally first
  await deleteLocalObservation(id);
  notifySync();

  try {
    await fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Server delete failed, removed from local database:', err);
  }

  return true;
}

/**
 * [개발/테스트 전용] 예시 관찰 데이터 주입
 */
export async function seedDevObservations(sampleData: Observation[]): Promise<boolean> {
  await saveLocalObservations(sampleData);
  notifySync();

  try {
    await fetch('/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleData),
    });
  } catch (err) {
    console.warn('Seed via API failed, saved to local database:', err);
  }

  return true;
}

/**
 * 전체 데이터 초기화
 */
export async function clearAllObservations(): Promise<boolean> {
  await saveLocalObservations([]);
  notifySync();

  try {
    await fetch('/api/dev/clear', { method: 'POST' });
  } catch (err) {
    console.warn('Clear via API failed:', err);
  }

  return true;
}

export function subscribeToObservationsSync(callback: () => void): () => void {
  if (!broadcastChannel) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'OBSERVATIONS_UPDATED') {
      callback();
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}
