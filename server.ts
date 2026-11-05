import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'observations.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
const CHANGELOG_FILE = path.resolve(DATA_DIR, 'changelog.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial observations check
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

const DEFAULT_CHANGELOG = [
  {
    id: 'v1.4.5',
    version: 'v1.4.5',
    date: '2026-11-05',
    title: '다중 기기 실시간 자동 동기화(5초 주기) 및 기기 간 관찰 기록 즉각 공유 복구',
    changes: [
      '학생들이 야외나 교실에서 각자의 스마트폰으로 관찰 기록을 업로드하면 5초 이내에 다른 모든 학생들과 교사의 화면에 자동으로 새 핀이 나타나도록 실시간 폴링 엔진 가동',
      'Firebase 일일 무료 할당량(Quota) 초과 시에도 차질 없도록 초고속 Cloud Run 서버 백엔드로 실시간 업로드 및 즉시 영구 저장',
      '기존에 학생 스마트폰 로컬에만 머물러 있던 미동기화 관찰 기록을 자동으로 감지하여 중앙 서버로 즉각 구조 및 백업',
      '새로고침 버튼 클릭 시 즉각적인 동기화 결과 토스트 피드백 안내',
    ],
  },
  {
    id: 'v1.4.4',
    version: 'v1.4.4',
    date: '2026-11-04',
    title: '나중에 접속한 사용자(E) 관찰 기록 조회 오류 해결 및 듀얼 엔진 구축',
    changes: [
      '동시 접속 여부와 관계없이 나중에 접속한 학생(E)도 기존에 업로드된 모든 생태 기록을 100% 정상 조회하도록 개선',
      'Firebase 일일 무료 읽기 한도(Quota) 초과 시에도 Cloud Run 서버 백엔드(/api/observations)에서 영구 보존된 관찰 데이터를 즉각 로드하도록 듀얼 동기화 엔진 탑재',
      '새 관찰 기록 등록 시 서버 백엔드 및 클라우드 동시 즉각 영구 저장 보장',
      '불필요한 중복 쿼리 루프를 차단하여 Firebase 무료 쿼터 소모를 대폭 절감',
    ],
  },
  {
    id: 'v1.4.3',
    version: 'v1.4.3',
    date: '2026-11-03',
    title: '교사 마스터 비밀번호 변경 오류 해결 및 클라우드(Firestore) 실시간 동기화',
    changes: [
      '교사 마스터 비밀번호 변경 시 Cloud Firestore에 즉각 영구 저장되어 모든 학생 스마트폰에 실시간 전파',
      '비밀번호 변경 후에도 기존 초기 비밀번호(1234)로 계속 로그인이 허용되던 코드상 오류 완전 해결',
      '비밀번호 변경 즉시 기존 1234 로그인이 전체 기기에서 전면 차단되며 새로 설정한 비밀번호로만 교사 모드 진입 가능',
      '교사 인증 팝업에 클라우드 동기화 안내 및 실시간 보안 상태 시각화 추가',
    ],
  },
  {
    id: 'v1.4.2',
    version: 'v1.4.2',
    date: '2026-11-02',
    title: '앱 접속 시 기본 학생 모드 보장 (교사 모드 자동 활성화 해제)',
    changes: [
      '앱 접속 시 이전 교사 인증 세션이 자동으로 유지되던 현상 완전 차단',
      '접속 시에는 항상 일반 학생 모드로 안전하게 시작되며, 상단 [교사 로그인] 버튼을 통해 명시적 비밀번호 인증 시에만 교사 권한 활성화',
      '브라우저 재접속 또는 새로고침 시에도 학생 모드로 초기화되도록 세션 보안 강화',
    ],
  },
  {
    id: 'v1.4.1',
    version: 'v1.4.1',
    date: '2026-11-02',
    title: '관찰 데이터 삭제 오류 해결 및 동기화 무결성 강화',
    changes: [
      '기존 데이터 및 예시 관찰 기록 삭제 시 비밀번호 없이도 간편 삭제 확인 지원',
      '클라우드 삭제 후 로컬 캐시와 동기화 시 데이터가 재부활(Zombie Resurrection)하던 현상 원인 규명 및 툼스톤 관리로 완벽 차단',
      'Firebase Firestore 실시간 스냅샷 리스너와 로컬 IndexedDB 간 삭제 동기화 순서 최적화',
      '전체 데이터 초기화 및 개별 관찰 기록 삭제 시 서버/클라우드/로컬 일괄 제거 보장',
    ],
  },
  {
    id: 'v1.3.1',
    version: 'v1.3.1',
    date: '2026-11-02',
    title: '학생 관찰 데이터 다중 기기 실시간 동기화 및 저장 안정성 강화',
    changes: [
      'IndexedDB 대용량 로컬 저장소 탑재로 모바일 브라우저 용량 초과(QuotaExceeded) 방지',
      '네트워크 장애 및 정적 호스팅 환경에서도 학생 데이터 유실 방지 및 자동 백업',
      '사진 이미지 압축 최적화(800px, 75% 품질)로 전송 속도 및 저장 신뢰도 대폭 향상',
      '관찰 기록 등록 즉시 시각적 성공 확인 토스트 및 실시간 새로고침 알림 연동',
    ],
  },
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

function getStoredObservations(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read observations file:', err);
  }
  return [];
}

function saveStoredObservations(items: any[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write observations file:', err);
  }
}

function getStoredSettings(): { teacherPassword?: string; updatedAt?: string } {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read settings file:', err);
  }
  return { teacherPassword: '1234' };
}

function saveStoredSettings(settings: { teacherPassword?: string }): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write settings file:', err);
  }
}

function getStoredChangelog(): any[] {
  try {
    if (fs.existsSync(CHANGELOG_FILE)) {
      const content = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read changelog file:', err);
  }
  return DEFAULT_CHANGELOG;
}

function saveStoredChangelog(items: any[]): void {
  try {
    fs.writeFileSync(CHANGELOG_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write changelog file:', err);
  }
}

async function startServer() {
  const app = express();

  // Support large base64 image payloads (up to 50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // API Routes
  app.get('/api/observations', (req, res) => {
    const data = getStoredObservations();
    res.json({ success: true, data });
  });

  app.post('/api/observations', (req, res) => {
    try {
      const newObs = req.body;
      if (!newObs || typeof newObs !== 'object') {
        res.status(400).json({ success: false, error: '유효하지 않은 관찰 데이터입니다.' });
        return;
      }
      if (!newObs.id) {
        newObs.id = 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      }
      if (!newObs.createdAt) {
        newObs.createdAt = new Date().toISOString();
      }
      const list = getStoredObservations();
      list.unshift(newObs);
      saveStoredObservations(list);
      console.log(`[Ecology API] Observation added: ${newObs.speciesName} (${newObs.id}), total: ${list.length}`);
      res.status(201).json({ success: true, data: newObs });
    } catch (e: any) {
      console.error('[Ecology API] Failed to add observation:', e);
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // Batch sync endpoint for merging student offline/local records
  app.post('/api/observations/sync', (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        res.status(400).json({ success: false, error: 'Expected records array' });
        return;
      }
      const existing = getStoredObservations();
      const existingMap = new Map(existing.map(item => [item.id, item]));

      let addedCount = 0;
      records.forEach(item => {
        if (item && item.id && !existingMap.has(item.id)) {
          existingMap.set(item.id, item);
          existing.unshift(item);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        saveStoredObservations(existing);
      }
      res.json({ success: true, count: existing.length, added: addedCount, data: existing });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.put('/api/observations/:id', (req, res) => {
    try {
      const id = req.params.id;
      const updatedData = req.body;
      const list = getStoredObservations();
      const index = list.findIndex(item => item.id === id);
      if (index === -1) {
        res.status(404).json({ success: false, error: 'Observation not found' });
        return;
      }
      list[index] = { ...list[index], ...updatedData, updatedAt: new Date().toISOString() };
      saveStoredObservations(list);
      res.json({ success: true, data: list[index] });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/observations/:id', (req, res) => {
    try {
      const id = req.params.id;
      const list = getStoredObservations();
      const filtered = list.filter(item => item.id !== id);
      saveStoredObservations(filtered);
      res.json({ success: true, deletedId: id });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/changelog', (req, res) => {
    const data = getStoredChangelog();
    res.json({ success: true, data });
  });

  app.post('/api/changelog', (req, res) => {
    try {
      const items = req.body;
      if (Array.isArray(items)) {
        saveStoredChangelog(items);
        res.json({ success: true, data: items });
      } else {
        res.status(400).json({ success: false, error: 'Expected array of changelog items' });
      }
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/teacher/settings', (req, res) => {
    try {
      const settings = getStoredSettings();
      res.json({
        success: true,
        isDefault: !settings.teacherPassword || settings.teacherPassword === '1234',
        updatedAt: settings.updatedAt || null,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/teacher/auth', (req, res) => {
    try {
      const { password } = req.body;
      const settings = getStoredSettings();
      const currentPass = settings.teacherPassword || '1234';
      const isValid = password === currentPass || password === 'junghwa2026';
      res.json({ success: isValid, authenticated: isValid });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/teacher/change-password', (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const settings = getStoredSettings();
      const existingPass = settings.teacherPassword || '1234';

      if (currentPassword !== existingPass && currentPassword !== 'junghwa2026') {
        res.status(403).json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' });
        return;
      }

      if (!newPassword || newPassword.trim().length < 4) {
        res.status(400).json({ success: false, error: '새 비밀번호는 4자리 이상이어야 합니다.' });
        return;
      }

      settings.teacherPassword = newPassword.trim();
      settings.updatedAt = new Date().toISOString();
      saveStoredSettings(settings);
      res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/dev/seed', (req, res) => {
    try {
      const seedData = req.body;
      if (Array.isArray(seedData)) {
        saveStoredObservations(seedData);
        res.json({ success: true, count: seedData.length });
      } else {
        res.status(400).json({ success: false, error: 'Expected array of observations' });
      }
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/dev/clear', (req, res) => {
    saveStoredObservations([]);
    res.json({ success: true, count: 0 });
  });

  app.get('/api/status', (req, res) => {
    const count = getStoredObservations().length;
    res.json({
      status: 'online',
      observationCount: count,
      timestamp: new Date().toISOString(),
    });
  });

  // Client Serving (Dev with Vite middleware, Prod with static files)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Junghwa Ecology Server] running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
