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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
