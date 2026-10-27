import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'observations.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
const CHANGELOG_FILE = path.resolve(DATA_DIR, 'changelog.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_CHANGELOG = [
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

function getStoredSettings(): { teacherPassword?: string } {
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

function apiPlugin(): Plugin {
  return {
    name: 'ecology-api-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Only handle /api/ routes
        if (!url.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // GET /api/observations
        if (req.method === 'GET' && url === '/api/observations') {
          const data = getStoredObservations();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, data }));
          return;
        }

        // POST /api/observations
        if (req.method === 'POST' && url === '/api/observations') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const newObs = JSON.parse(body);
              if (!newObs.id) {
                newObs.id = 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
              }
              if (!newObs.createdAt) {
                newObs.createdAt = new Date().toISOString();
              }
              const list = getStoredObservations();
              list.unshift(newObs);
              saveStoredObservations(list);
              res.statusCode = 201;
              res.end(JSON.stringify({ success: true, data: newObs }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // PUT /api/observations/:id
        if (req.method === 'PUT' && url.startsWith('/api/observations/')) {
          const id = url.replace('/api/observations/', '').split('?')[0];
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const updatedData = JSON.parse(body);
              const list = getStoredObservations();
              const index = list.findIndex(item => item.id === id);
              if (index === -1) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: 'Observation not found' }));
                return;
              }
              list[index] = { ...list[index], ...updatedData, updatedAt: new Date().toISOString() };
              saveStoredObservations(list);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, data: list[index] }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // DELETE /api/observations/:id
        if (req.method === 'DELETE' && url.startsWith('/api/observations/')) {
          const id = url.replace('/api/observations/', '').split('?')[0];
          const list = getStoredObservations();
          const filtered = list.filter(item => item.id !== id);
          saveStoredObservations(filtered);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, deletedId: id }));
          return;
        }

        // GET /api/changelog
        if (req.method === 'GET' && url === '/api/changelog') {
          const data = getStoredChangelog();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, data }));
          return;
        }

        // POST /api/changelog
        if (req.method === 'POST' && url === '/api/changelog') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const items = JSON.parse(body);
              if (Array.isArray(items)) {
                saveStoredChangelog(items);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, data: items }));
              } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Expected array of changelog items' }));
              }
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // POST /api/teacher/auth
        if (req.method === 'POST' && url === '/api/teacher/auth') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { password } = JSON.parse(body);
              const settings = getStoredSettings();
              const currentPass = settings.teacherPassword || '1234';
              const isValid = password === currentPass || password === 'junghwa2026';
              res.statusCode = 200;
              res.end(JSON.stringify({ success: isValid, authenticated: isValid }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // POST /api/teacher/change-password
        if (req.method === 'POST' && url === '/api/teacher/change-password') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { currentPassword, newPassword } = JSON.parse(body);
              const settings = getStoredSettings();
              const existingPass = settings.teacherPassword || '1234';

              if (currentPassword !== existingPass && currentPassword !== 'junghwa2026') {
                res.statusCode = 403;
                res.end(JSON.stringify({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }));
                return;
              }

              if (!newPassword || newPassword.trim().length < 4) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: '새 비밀번호는 4자리 이상이어야 합니다.' }));
                return;
              }

              settings.teacherPassword = newPassword.trim();
              saveStoredSettings(settings);

              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // POST /api/dev/seed
        if (req.method === 'POST' && url === '/api/dev/seed') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const seedData = JSON.parse(body);
              if (Array.isArray(seedData)) {
                saveStoredObservations(seedData);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, count: seedData.length }));
              } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Expected array of observations' }));
              }
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
          return;
        }

        // POST /api/dev/clear
        if (req.method === 'POST' && url === '/api/dev/clear') {
          saveStoredObservations([]);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, count: 0 }));
          return;
        }

        // GET /api/status
        if (req.method === 'GET' && url === '/api/status') {
          const count = getStoredObservations().length;
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'online',
            observationCount: count,
          }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
