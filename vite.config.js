import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/schedule-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 새 배포 감지 시 자동 갱신
      injectRegister: false, // main.jsx에서 직접 등록
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '여백스케줄',
        short_name: '여백스케줄',
        start_url: '/schedule-app/',
        scope: '/schedule-app/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/schedule-app/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/schedule-app/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // index.html은 네트워크 우선 → 새 배포 즉시 반영
        navigateFallback: '/schedule-app/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Supabase 데이터는 항상 네트워크 우선
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-data' },
          },
        ],
      },
    }),
  ],
})
