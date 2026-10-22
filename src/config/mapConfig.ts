import { CategoryInfo, CategoryType, SchoolClass, SchoolZone, Coordinates } from '../types/observation';

/**
 * 중화고등학교 실제 위성 항공 캡처본 설정
 */
export const CAMPUS_SATELLITE_IMAGE = '/assets/aistudio/image_131c3b06.png';

/**
 * 중화고등학교 (서울특별시 중랑구 신내로15길 125)
 * 공식 좌표: 위도 37.60472, 경도 127.08309
 */
export const JUNGHWA_HIGH_SCHOOL = {
  name: '중화고등학교',
  address: '서울특별시 중랑구 신내로15길 125',
  coordinates: {
    lat: 37.60472,
    lng: 127.08309,
    x: 53,
    y: 52,
  },
  defaultZoom: 1,
  minZoom: 1,
  maxZoom: 3,
};

/**
 * 위성 캡처 사진의 지리적 경계 (Georeferencing)
 * 사진의 좌상단(Top-Left)과 우하단(Bottom-Right) 위경도
 */
export const MAP_GEO_BOUNDS = {
  north: 37.6062,
  south: 37.6032,
  west: 127.0812,
  east: 127.0848,
};

/**
 * 위경도를 사진 비율(0~100%)로 변환
 */
export function latLngToXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - MAP_GEO_BOUNDS.west) / (MAP_GEO_BOUNDS.east - MAP_GEO_BOUNDS.west)) * 100;
  const y = ((MAP_GEO_BOUNDS.north - lat) / (MAP_GEO_BOUNDS.north - MAP_GEO_BOUNDS.south)) * 100;
  return {
    x: Math.max(2, Math.min(98, Number(x.toFixed(2)))),
    y: Math.max(2, Math.min(98, Number(y.toFixed(2)))),
  };
}

/**
 * 사진 비율(0~100%)을 위경도로 변환
 */
export function xyToLatLng(x: number, y: number): { lat: number; lng: number } {
  const lng = MAP_GEO_BOUNDS.west + (x / 100) * (MAP_GEO_BOUNDS.east - MAP_GEO_BOUNDS.west);
  const lat = MAP_GEO_BOUNDS.north - (y / 100) * (MAP_GEO_BOUNDS.north - MAP_GEO_BOUNDS.south);
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

/**
 * 학급 구성 관리 (단일 지점에서 관리)
 * 기본값: 1학년 1반 ~ 7반
 */
export const DEFAULT_CLASSES: SchoolClass[] = [
  { id: '1-1', grade: 1, classNum: 1, label: '1학년 1반', shortLabel: '1반' },
  { id: '1-2', grade: 1, classNum: 2, label: '1학년 2반', shortLabel: '2반' },
  { id: '1-3', grade: 1, classNum: 3, label: '1학년 3반', shortLabel: '3반' },
  { id: '1-4', grade: 1, classNum: 4, label: '1학년 4반', shortLabel: '4반' },
  { id: '1-5', grade: 1, classNum: 5, label: '1학년 5반', shortLabel: '5반' },
  { id: '1-6', grade: 1, classNum: 6, label: '1학년 6반', shortLabel: '6반' },
  { id: '1-7', grade: 1, classNum: 7, label: '1학년 7반', shortLabel: '7반' },
];

/**
 * 생물 분류 정의 및 핀 스타일링
 */
export const CATEGORIES: Record<CategoryType, CategoryInfo> = {
  plant: {
    id: 'plant',
    label: '식물 / 수목',
    iconName: 'Leaf',
    color: '#059669', // emerald-600
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-700',
    pinBg: '#10b981',
  },
  bird: {
    id: 'bird',
    label: '조류 (새)',
    iconName: 'Bird',
    color: '#0284c7', // sky-600
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    badgeText: 'text-sky-700',
    pinBg: '#0ea5e9',
  },
  insect: {
    id: 'insect',
    label: '곤충 / 무척추',
    iconName: 'Bug',
    color: '#8b5cf6', // purple-500
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeText: 'text-purple-700',
    pinBg: '#a855f7',
  },
  animal: {
    id: 'animal',
    label: '포유류 / 파충류',
    iconName: 'Footprints',
    color: '#d97706', // amber-600
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-700',
    pinBg: '#f59e0b',
  },
  fungi: {
    id: 'fungi',
    label: '균류 / 버섯',
    iconName: 'Sprout',
    color: '#ea580c', // orange-600
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    badgeText: 'text-orange-700',
    pinBg: '#f97316',
  },
  other: {
    id: 'other',
    label: '기타 생물',
    iconName: 'Sparkles',
    color: '#4b5563', // gray-600
    badgeBg: 'bg-stone-100 text-stone-800 border-stone-200',
    badgeText: 'text-stone-700',
    pinBg: '#6b7280',
  },
};

/**
 * 학교 주요 탐사 구역 프리셋 (위성 사진 실제 위치 기준)
 */
export const SCHOOL_ZONES: SchoolZone[] = [
  {
    id: 'front_flowerbed',
    name: '본관 앞 화단',
    description: '본관 정면 진입로와 정원, 관목 및 계절 초화류',
    coordinates: { lat: 37.60485, lng: 127.08320, x: 53, y: 52 },
  },
  {
    id: 'sports_field',
    name: '운동장 및 스탠드 주변',
    description: '인조잔디 운동장과 우레탄 트랙, 스탠드 경계 수목',
    coordinates: { lat: 37.60440, lng: 127.08275, x: 37, y: 68 },
  },
  {
    id: 'gym_zone',
    name: '체육관 (붉은 지붕)',
    description: '체육관 및 강당 주변 조경수 및 진입로 화단',
    coordinates: { lat: 37.60535, lng: 127.08310, x: 54, y: 16 },
  },
  {
    id: 'rear_pavilion',
    name: '본관 뒤편 쉼터 및 수목원',
    description: '본관 뒤편 그늘 쉼터와 큰 교목(느티나무, 벚나무) 군락',
    coordinates: { lat: 37.60515, lng: 127.08338, x: 68, y: 30 },
  },
  {
    id: 'bonghwasan_trail',
    name: '봉화산 연결 숲길 탐방로',
    description: '학교 뒷산인 봉화산 근린공원 진입 수풀 및 야생 조류 관찰지',
    coordinates: { lat: 37.60545, lng: 127.08395, x: 88, y: 38 },
  },
  {
    id: 'south_building',
    name: '남측 교사동 화단',
    description: '남쪽 교사동 주변 화단과 가로수',
    coordinates: { lat: 37.60425, lng: 127.08345, x: 50, y: 84 },
  },
];

export const STORAGE_KEYS = {
  OBSERVATIONS: 'junghwa_eco_observations',
  CLASSES: 'junghwa_school_classes',
};
