// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  modules: ["@nuxtjs/tailwindcss"],
  nitro: {
    storage: {
      mocks: {
        driver: process.env.VERCEL || process.env.REDIS_URL ? 'redis' : 'fs',
        base: 'mocks',
        url: process.env.REDIS_URL
      },
      settings: {
        driver: process.env.VERCEL || process.env.REDIS_URL ? 'redis' : 'fs',
        base: 'settings',
        url: process.env.REDIS_URL
      }
    }
  },
  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@mock.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-me'
  }
})