import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read version from package.json
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
const appVersion = packageJson.version || '0.0.0'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  // Disable SSR for Tauri (client-side only)
  ssr: false,

  modules: ["@nuxtjs/tailwindcss"],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
        }
      ]
    }
  },
  nitro: {
    storage: {
      // File storage is now deprecated - all data stored in SQLite
      // Keeping minimal config for any future storage needs
    },
    // Include drizzle migrations in the build
    serverAssets: [
      {
        baseName: 'drizzle',
        dir: './drizzle'
      }
    ]
  },

  vite: {
    // Better support for Tauri CLI output
    clearScreen: false,
    // Enable environment variables
    envPrefix: ['VITE_', 'TAURI_'],
    server: {
      // Tauri requires a consistent port
      strictPort: true,
    },
  },

  // Ignore src-tauri to avoid file watching issues
  ignore: ['**/src-tauri/**'],

  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@mock.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-me',
    nodeEnv: process.env.NODE_ENV || 'development',
    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'https://api-mock.transtrack.id',
      appVersion
    }
  }
})