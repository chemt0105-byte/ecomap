export type CategoryType = 'plant' | 'animal' | 'bird' | 'insect' | 'fungi' | 'other';

export interface CategoryInfo {
  id: CategoryType;
  label: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  pinBg: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  x?: number; // 0 ~ 100% on school satellite capture
  y?: number; // 0 ~ 100% on school satellite capture
}

export interface SchoolClass {
  id: string; // e.g. "1-1", "1-2"
  grade: number;
  classNum: number;
  label: string; // e.g. "1학년 1반"
  shortLabel: string; // e.g. "1반"
}

export interface SchoolZone {
  id: string;
  name: string;
  description: string;
  coordinates: Coordinates;
}

export interface Observation {
  id: string;
  speciesName: string; // 생물 이름 (예: 산수유, 까치, 호랑나비)
  scientificName?: string; // 학명 (선택)
  category: CategoryType; // 식물, 동물, 조류, 곤충, 균류 등
  classId: string; // 관찰 학급 (예: "1-1")
  observerName: string; // 관찰자 (학생 이름 또는 모둠)
  observedAt: string; // 관찰 일시 (ISO string 또는 YYYY-MM-DD HH:mm)
  coordinates: Coordinates; // 위도/경도 및 사진 내 상대 좌표 (x%, y%)
  locationDescription: string; // 발견 위치 설명 (예: 본관 앞 화단)
  imageUrl: string; // 사진 데이터 (base64 or URL)
  notes: string; // 관찰 내용 / 생태적 특징
  season?: '봄' | '여름' | '가을' | '겨울';
  weather?: string;
  likes?: number;
  authorId?: string; // 작성자 기기 식별자 (작성자 본인 확인용)
  deletePassword?: string; // 작성 시 설정한 간편 삭제 비밀번호 (선택 또는 4자리 PIN)
  createdAt: string;
  updatedAt?: string;
}

export interface ObservationFilter {
  selectedClassId: string; // 'all' or specific classId
  selectedCategory: CategoryType | 'all';
  searchQuery: string;
  sortBy: 'latest' | 'oldest' | 'name';
}
