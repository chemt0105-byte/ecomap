import { STORAGE_KEYS } from '../config/mapConfig';
import { Observation } from '../types/observation';

const BROADCAST_CHANNEL_NAME = 'junghwa_eco_channel';
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

/**
 * 로컬 캐시에서 불러오기
 */
function getLocalFallback(): Observation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read from localStorage fallback', e);
  }
  return [];
}

/**
 * 로컬 캐시에 저장하기
 */
function setLocalFallback(list: Observation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to write to localStorage fallback (storage may be full)', e);
  }
}

/**
 * 전체 관찰 기록 조회
 * 서버 DB 우선, 실패 시 로컬 스토리지 데이터 반환 (임의의 가짜 데이터 생성 안 함)
 */
export async function getObservations(): Promise<Observation[]> {
  try {
    const response = await fetch('/api/observations', {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setLocalFallback(result.data);
        return result.data;
      }
    }
  } catch (err) {
    console.warn('Server API not reachable, using local storage cache:', err);
  }

  // Fallback to local storage (strictly real user records previously saved, never fake data)
  return getLocalFallback();
}

/**
 * 새로운 관찰 기록 등록
 */
export async function addObservation(
  newRecord: Omit<Observation, 'id' | 'createdAt'>
): Promise<Observation> {
  const item: Observation = {
    ...newRecord,
    id: 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const saved = result.data;
        const currentList = getLocalFallback();
        currentList.unshift(saved);
        setLocalFallback(currentList);
        notifySync();
        return saved;
      }
    }
  } catch (err) {
    console.warn('Failed to save to server API, persisting to local storage:', err);
  }

  // Fallback to local storage
  const currentList = getLocalFallback();
  currentList.unshift(item);
  setLocalFallback(currentList);
  notifySync();
  return item;
}

/**
 * 관찰 기록 수정 (좋아요, 내용 수정 등)
 */
export async function updateObservation(
  id: string,
  updates: Partial<Observation>
): Promise<Observation | null> {
  try {
    const response = await fetch(`/api/observations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const currentList = getLocalFallback();
        const index = currentList.findIndex(o => o.id === id);
        if (index !== -1) {
          currentList[index] = { ...currentList[index], ...result.data };
          setLocalFallback(currentList);
        }
        notifySync();
        return result.data;
      }
    }
  } catch (err) {
    console.warn('Failed to update on server, applying locally:', err);
  }

  const currentList = getLocalFallback();
  const index = currentList.findIndex(o => o.id === id);
  if (index !== -1) {
    currentList[index] = {
      ...currentList[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setLocalFallback(currentList);
    notifySync();
    return currentList[index];
  }
  return null;
}

/**
 * 관찰 기록 삭제
 */
export async function deleteObservation(id: string): Promise<boolean> {
  let success = false;
  try {
    const response = await fetch(`/api/observations/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      success = true;
    }
  } catch (err) {
    console.warn('Server delete failed, removing locally:', err);
  }

  const currentList = getLocalFallback();
  const filtered = currentList.filter(o => o.id !== id);
  setLocalFallback(filtered);
  notifySync();
  return true;
}

/**
 * [개발/테스트 전용] 예시 관찰 데이터 주입
 * 실제 운영에서는 학생이 등록한 데이터만 표시하되,
 * 교사 또는 개발자가 테스트할 수 있도록 분리된 기능
 */
export async function seedDevObservations(sampleData: Observation[]): Promise<boolean> {
  try {
    const response = await fetch('/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleData),
    });
    if (response.ok) {
      setLocalFallback(sampleData);
      notifySync();
      return true;
    }
  } catch (err) {
    console.warn('Seed via API failed, saving to local fallback:', err);
  }

  setLocalFallback(sampleData);
  notifySync();
  return true;
}

/**
 * 전체 데이터 초기화
 */
export async function clearAllObservations(): Promise<boolean> {
  try {
    await fetch('/api/dev/clear', { method: 'POST' });
  } catch (err) {
    console.warn('Clear via API failed:', err);
  }
  setLocalFallback([]);
  notifySync();
  return true;
}

function notifySync(): void {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'OBSERVATIONS_UPDATED', timestamp: Date.now() });
  }
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
