import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Observation } from '../types/observation';

const DEVICE_ID_KEY = 'junghwa_author_device_id';
const TEACHER_MODE_KEY = 'junghwa_teacher_mode';
const TEACHER_PASS_KEY = 'junghwa_teacher_master_password';
const DEFAULT_TEACHER_PASS = '1234';
const RECOVERY_MASTER_KEY = 'junghwa2026';
const SETTINGS_COLLECTION = 'settings';
const TEACHER_SETTINGS_DOC = 'teacher';

// 접속 시 교사 모드가 항상 비활성화(해제)된 상태로 시작하도록 보장
let _isTeacherMode = false;
const teacherListeners = new Set<(isTeacher: boolean) => void>();

// 로컬 캐시된 교사 비밀번호 (기본: 1234)
let _cachedTeacherPassword: string = DEFAULT_TEACHER_PASS;
try {
  const local = localStorage.getItem(TEACHER_PASS_KEY);
  if (local && local.trim().length >= 4) {
    _cachedTeacherPassword = local.trim();
  }
} catch (e) {
  // ignore
}

// 비밀번호 변경 리스너
const passwordChangeListeners = new Set<(newPass: string) => void>();

export function subscribePasswordChange(callback: (newPass: string) => void): () => void {
  passwordChangeListeners.add(callback);
  return () => {
    passwordChangeListeners.delete(callback);
  };
}

// 이전 버전의 localStorage/sessionStorage에 남아있을 수 있는 교사 모드 플래그 완벽 초기화
try {
  localStorage.removeItem(TEACHER_MODE_KEY);
  sessionStorage.removeItem(TEACHER_MODE_KEY);
} catch (e) {
  // ignore
}

// Firestore settings/teacher 실시간 리스너 연결
// 교사가 비밀번호를 변경하면 학생 및 모든 기기에서 즉시 새 비밀번호로 실시간 동기화됨
try {
  const teacherDocRef = doc(db, SETTINGS_COLLECTION, TEACHER_SETTINGS_DOC);
  onSnapshot(
    teacherDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && typeof data.teacherPassword === 'string' && data.teacherPassword.trim().length >= 4) {
          const cloudPass = data.teacherPassword.trim();
          if (cloudPass !== _cachedTeacherPassword) {
            console.log('[Auth] Teacher master password synced from Firestore:', cloudPass);
            _cachedTeacherPassword = cloudPass;
            try {
              localStorage.setItem(TEACHER_PASS_KEY, cloudPass);
            } catch (e) {}
            passwordChangeListeners.forEach(fn => {
              try {
                fn(cloudPass);
              } catch (err) {
                console.error(err);
              }
            });
          }
        }
      }
    },
    (err) => {
      console.warn('Firestore settings listener error (falling back to local/server):', err);
    }
  );
} catch (e) {
  console.warn('Failed to attach Firestore settings listener:', e);
}

/**
 * 접속 기기(브라우저) 고유 식별자 가져오기 또는 생성
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return 'temp_device_id';
  }
}

/**
 * 현재 기기 사용자가 해당 관찰 기록의 작성자인지 확인
 */
export function isAuthor(obs: Observation | null | undefined): boolean {
  if (!obs || !obs.authorId) return false;
  return obs.authorId === getDeviceId();
}

/**
 * 교사 관리자 모드 활성화 여부
 * (앱 접속 시 기본값: false)
 */
export function isTeacherMode(): boolean {
  return _isTeacherMode;
}

/**
 * 교사 모드 변경 및 구독 컴포넌트(Header, ObservationDetail 등)에 상태 즉시 전파
 */
export function setTeacherMode(enabled: boolean): void {
  _isTeacherMode = enabled;
  // 접속 시 자동 활성화를 막기 위해 localStorage에 영구 플래그를 저장하지 않음
  try {
    localStorage.removeItem(TEACHER_MODE_KEY);
    sessionStorage.removeItem(TEACHER_MODE_KEY);
  } catch (e) {
    // ignore
  }
  teacherListeners.forEach(listener => {
    try {
      listener(_isTeacherMode);
    } catch (err) {
      console.error(err);
    }
  });
}

/**
 * 교사 모드 상태를 실시간으로 추적하는 React Hook
 */
export function useTeacherMode(): boolean {
  const [isTeacher, setIsTeacher] = useState<boolean>(_isTeacherMode);

  useEffect(() => {
    const handleUpdate = (mode: boolean) => {
      setIsTeacher(mode);
    };
    teacherListeners.add(handleUpdate);
    setIsTeacher(_isTeacherMode);
    return () => {
      teacherListeners.delete(handleUpdate);
    };
  }, []);

  return isTeacher;
}

/**
 * 현재 메모리/로컬에 캐시된 교사 마스터 비밀번호 가져오기
 */
export function getCachedTeacherPassword(): string {
  return _cachedTeacherPassword || DEFAULT_TEACHER_PASS;
}

/**
 * Cloud Firestore 및 서버에서 실시간 활성 교사 비밀번호 조회
 */
export async function fetchActiveTeacherPassword(): Promise<string> {
  // 1. Cloud Firestore settings/teacher 문서 직접 조회
  try {
    const teacherDocRef = doc(db, SETTINGS_COLLECTION, TEACHER_SETTINGS_DOC);
    const snap = await getDoc(teacherDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.teacherPassword === 'string' && data.teacherPassword.trim().length >= 4) {
        _cachedTeacherPassword = data.teacherPassword.trim();
        try {
          localStorage.setItem(TEACHER_PASS_KEY, _cachedTeacherPassword);
        } catch (e) {}
        return _cachedTeacherPassword;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch teacher password from Firestore:', err);
  }

  // 2. 서버 API settings 조회 시도
  try {
    const res = await fetch('/api/teacher/settings');
    if (res.ok) {
      const json = await res.json();
      if (json && json.teacherPassword) {
        _cachedTeacherPassword = json.teacherPassword;
        try {
          localStorage.setItem(TEACHER_PASS_KEY, _cachedTeacherPassword);
        } catch (e) {}
        return _cachedTeacherPassword;
      }
    }
  } catch (err) {
    // ignore
  }

  // 3. 로컬 캐시 / 기본값 (1234)
  return _cachedTeacherPassword || DEFAULT_TEACHER_PASS;
}

/**
 * 교사 모드 로그인 (클라우드 및 로컬 검증)
 * 중요: 교사 비밀번호가 변경된 후에는 기존 1234로는 절대 로그인되지 않음!
 */
export async function loginTeacher(password: string): Promise<boolean> {
  const cleanPass = password.trim();
  if (!cleanPass) return false;

  // 최신 클라우드 활성 비밀번호 확인
  const activePassword = await fetchActiveTeacherPassword();

  // 1. 최신 교사 비밀번호 또는 비상 복구키 검증
  if (cleanPass === activePassword || cleanPass === RECOVERY_MASTER_KEY) {
    setTeacherMode(true);
    return true;
  }

  // 2. 서버 API 검증 시도 (백엔드 지원 환경)
  try {
    const res = await fetch('/api/teacher/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        setTeacherMode(true);
        return true;
      }
    }
  } catch (err) {
    // API unavailable
  }

  return false;
}

/**
 * 교사 마스터 비밀번호 변경 (Cloud Firestore 및 서버, 로컬 전체 동기화)
 */
export async function updateTeacherMasterPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const currentClean = currentPassword.trim();
  const newClean = newPassword.trim();

  if (!newClean || newClean.length < 4) {
    return { success: false, error: '새 비밀번호는 4자리 이상이어야 합니다.' };
  }

  // 최신 활성 비밀번호 조회
  const activePassword = await fetchActiveTeacherPassword();

  // 현재 비밀번호 일치 검증
  if (currentClean !== activePassword && currentClean !== RECOVERY_MASTER_KEY) {
    return { success: false, error: '현재 비밀번호가 일치하지 않습니다.' };
  }

  if (newClean === currentClean) {
    return { success: false, error: '새 비밀번호가 기존 비밀번호와 동일합니다.' };
  }

  const updatedAt = new Date().toISOString();

  // 1. Cloud Firestore에 즉시 영구 저장 (모든 학생 기기 및 교사 PC 실시간 반영)
  try {
    const teacherDocRef = doc(db, SETTINGS_COLLECTION, TEACHER_SETTINGS_DOC);
    await setDoc(
      teacherDocRef,
      {
        teacherPassword: newClean,
        updatedAt,
        updatedBy: getDeviceId(),
      },
      { merge: true }
    );
    console.log('[Auth] Teacher master password saved to Firestore cloud successfully');
  } catch (err) {
    console.error('Failed to save teacher password to Firestore cloud:', err);
  }

  // 2. 서버 백엔드 API 동기화 (서버 환경인 경우)
  try {
    await fetch('/api/teacher/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentClean,
        newPassword: newClean,
      }),
    });
  } catch (err) {
    // ignore
  }

  // 3. 로컬 캐시 및 상태 즉시 갱신
  _cachedTeacherPassword = newClean;
  try {
    localStorage.setItem(TEACHER_PASS_KEY, newClean);
  } catch (e) {}

  // 변경 알림 브로드캐스트
  passwordChangeListeners.forEach(fn => {
    try {
      fn(newClean);
    } catch (err) {
      console.error(err);
    }
  });

  return { success: true };
}

/**
 * 교사 모드 로그아웃 (교사 모드 해제)
 */
export function logoutTeacher(): void {
  setTeacherMode(false);
}

/**
 * 삭제 권한 종합 검증
 */
export function checkDeletePermission(
  obs: Observation,
  inputPin?: string
): { allowed: boolean; reason: 'author_device' | 'teacher_mode' | 'legacy_data' | 'pin_match' | 'teacher_pin' | 'denied' } {
  // 1. 교사 모드 활성화 상태인 경우 무조건 허용
  if (isTeacherMode()) {
    return { allowed: true, reason: 'teacher_mode' };
  }

  // 2. 예시 데이터(sample_obs_*) 또는 비밀번호/작성자ID가 없는 기존 데이터는 누구나 삭제 가능
  if (obs.id.startsWith('sample_') || (!obs.authorId && !obs.deletePassword)) {
    return { allowed: true, reason: 'legacy_data' };
  }

  // 3. 작성한 본인 기기인 경우 바로 허용
  if (obs.authorId && obs.authorId === getDeviceId()) {
    return { allowed: true, reason: 'author_device' };
  }

  // 4. 입력된 PIN이 작성 당시 비밀번호와 일치하는 경우
  if (inputPin && obs.deletePassword && inputPin.trim() === obs.deletePassword.trim()) {
    return { allowed: true, reason: 'pin_match' };
  }

  // 5. 입력된 PIN이 현재 활성 교사 마스터 비밀번호와 일치하는 경우
  // 중요: 변경된 후에는 1234로 삭제 불가능하며 오직 현재 교사 비밀번호만 유효
  const masterPass = getCachedTeacherPassword();
  if (inputPin && (inputPin.trim() === masterPass || inputPin.trim() === RECOVERY_MASTER_KEY)) {
    return { allowed: true, reason: 'teacher_pin' };
  }

  // 6. 비밀번호가 설정되지 않았던 게시물인 경우
  if (!obs.deletePassword) {
    return { allowed: true, reason: 'legacy_data' };
  }

  return { allowed: false, reason: 'denied' };
}
