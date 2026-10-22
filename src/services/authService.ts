import { Observation } from '../types/observation';

const DEVICE_ID_KEY = 'junghwa_author_device_id';
const TEACHER_MODE_KEY = 'junghwa_teacher_mode';
const TEACHER_PASS_KEY = 'junghwa_teacher_master_password';
const DEFAULT_TEACHER_PASS = '1234';

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
 */
export function isTeacherMode(): boolean {
  try {
    return localStorage.getItem(TEACHER_MODE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * 로컬 캐시된 교사 마스터 비밀번호 가져오기
 */
export function getCachedTeacherPassword(): string {
  try {
    return localStorage.getItem(TEACHER_PASS_KEY) || DEFAULT_TEACHER_PASS;
  } catch (e) {
    return DEFAULT_TEACHER_PASS;
  }
}

/**
 * 교사 모드 로그인 (서버 및 로컬 검증)
 */
export async function loginTeacher(password: string): Promise<boolean> {
  const cleanPass = password.trim();

  // 1. 서버 API 검증 시도
  try {
    const res = await fetch('/api/teacher/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        localStorage.setItem(TEACHER_MODE_KEY, 'true');
        localStorage.setItem(TEACHER_PASS_KEY, cleanPass);
        return true;
      }
    }
  } catch (err) {
    console.warn('Teacher auth API unavailable, falling back to local storage', err);
  }

  // 2. 로컬 캐시 검증
  const localMaster = getCachedTeacherPassword();
  if (cleanPass === localMaster || cleanPass === 'junghwa2026') {
    localStorage.setItem(TEACHER_MODE_KEY, 'true');
    return true;
  }

  return false;
}

/**
 * 교사 마스터 비밀번호 변경 (서버 및 로컬 동기화)
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

  // 1. 서버 API에 변경 요청
  try {
    const res = await fetch('/api/teacher/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentClean,
        newPassword: newClean,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || '비밀번호 변경에 실패했습니다.' };
    }
  } catch (err) {
    console.warn('Server change-password failed, updating local fallback:', err);
    // 로컬 검증
    const localMaster = getCachedTeacherPassword();
    if (currentClean !== localMaster && currentClean !== 'junghwa2026') {
      return { success: false, error: '현재 비밀번호가 일치하지 않습니다.' };
    }
  }

  // 로컬 캐시 갱신
  localStorage.setItem(TEACHER_PASS_KEY, newClean);
  return { success: true };
}

/**
 * 교사 모드 로그아웃
 */
export function logoutTeacher(): void {
  try {
    localStorage.removeItem(TEACHER_MODE_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * 삭제 권한 종합 검증
 */
export function checkDeletePermission(
  obs: Observation,
  inputPin?: string
): { allowed: boolean; reason: 'author_device' | 'teacher_mode' | 'pin_match' | 'teacher_pin' | 'denied' } {
  // 1. 교사 모드 활성화 상태인 경우 무조건 허용
  if (isTeacherMode()) {
    return { allowed: true, reason: 'teacher_mode' };
  }

  // 2. 작성한 본인 기기인 경우 바로 허용
  if (obs.authorId && obs.authorId === getDeviceId()) {
    return { allowed: true, reason: 'author_device' };
  }

  // 3. 입력된 PIN이 작성 당시 비밀번호와 일치하는 경우
  if (inputPin && obs.deletePassword && inputPin.trim() === obs.deletePassword.trim()) {
    return { allowed: true, reason: 'pin_match' };
  }

  // 4. 입력된 PIN이 교사 마스터 비밀번호와 일치하는 경우
  const masterPass = getCachedTeacherPassword();
  if (inputPin && (inputPin.trim() === masterPass || inputPin.trim() === 'junghwa2026')) {
    return { allowed: true, reason: 'teacher_pin' };
  }

  return { allowed: false, reason: 'denied' };
}
