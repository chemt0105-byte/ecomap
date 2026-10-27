import { ChangelogItem } from '../types/changelog';

const CHANGELOG_CACHE_KEY = 'junghwa_changelog_cache';

export const INITIAL_CHANGELOG: ChangelogItem[] = [
  {
    id: 'v1.3.0',
    version: 'v1.3.0',
    date: '2026-10-27',
    title: '사진 업로드 옵션 분리 및 학생 사용 도움말 추가',
    changes: [
      '관찰 사진 업로드를 선택 사항으로 변경하여 사진 없이도 생태 관찰 기록 등록 가능',
      '모바일 환경에서 직접 카메라 촬영과 갤러리/앨범 파일 선택 버튼 분리',
      '학생을 위한 필수 이용 안내 팝업(물음표 아이콘) 제공',
      '버전별 업데이트 내역 확인 및 관리자 모드 수정 기능 탑재',
    ],
  },
  {
    id: 'v1.2.0',
    version: 'v1.2.0',
    date: '2026-10-22',
    title: '교사 마스터 비밀번호 관리 및 3중 삭제 보호 시스템',
    changes: [
      '교사 마스터 비밀번호 변경 기능 추가 및 서버 영구 동기화',
      '작성자 본인 기기 자동 인식 토큰 기반 삭제 보호 적용',
      '타인 기기 삭제 시도시 4자리 PIN 또는 교사 마스터 코드 확인 로직 구축',
    ],
  },
  {
    id: 'v1.1.0',
    version: 'v1.1.0',
    date: '2026-10-22',
    title: '중화고 교정 항공 위성 사진 캔버스 지도 전환',
    changes: [
      'Google Maps API 없이 실제 중화고 항공 캡처본을 활용한 인터랙티브 캔버스 지도 탑재',
      '화면 드래그(Pan), 확대/축소(Zoom), 학교 중심 리셋 인터랙션 구현',
      '새 관찰 기록 등록 양식을 필수 6개 핵심 정보로 간소화',
    ],
  },
  {
    id: 'v1.0.0',
    version: 'v1.0.0',
    date: '2026-10-22',
    title: '중화고등학교 생태지도 웹앱 최초 런칭',
    changes: [
      '중화고등학교 학생·교사를 위한 공동 생태지도 웹앱 초기 런칭',
      '1학년 1반부터 7반까지 학급별 탭 필터링 및 실시간 관찰 개수 집계',
      '생물 분류별 핀 색상 구분 및 교정 주요 탐사 구역 바로가기 프리셋 제공',
    ],
  },
];

export async function getChangelog(): Promise<ChangelogItem[]> {
  try {
    const res = await fetch('/api/changelog');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch changelog from API, using cached data:', err);
  }

  try {
    const cached = localStorage.getItem(CHANGELOG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore
  }

  return INITIAL_CHANGELOG;
}

export async function saveChangelog(items: ChangelogItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/changelog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (res.ok) {
      localStorage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(items));
      return true;
    }
  } catch (err) {
    console.warn('Failed to save changelog to server:', err);
  }

  localStorage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(items));
  return true;
}
