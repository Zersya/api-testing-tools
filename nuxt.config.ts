// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  modules: ["@nuxtjs/tailwindcss"],

  css: ['~/assets/css/main.css'],

  ssr: false,

  nitro: {
    preset: 'node-server',
    prerender: {
      routes: ['/']
    },
    externals: {
      inline: ['server/**']
    }
  },

  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@mock.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-me',
    public: {
      apiUrl: process.env.API_URL || (
        process.env.TAURI_ENV_DEV === 'true' 
          ? 'http://localhost:3000' 
          : 'http://127.0.0.1:3001'
      ),
      isTauri: process.env.TAURI === 'true' || process.env.TAURI_ENV_DEV === 'true'
    }
  }
})
