import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // AI Studio 및 Cloud Run 환경에서는 HMR WebSocket 프록시가 비활성화되어 있으므로
      // 브라우저 콘솔의 WebSocket 연결 실패 에러를 원천 차단하기 위해 hmr을 false로 설정합니다.
      hmr: false,
    },
  };
});
