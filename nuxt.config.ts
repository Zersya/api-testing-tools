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
        driver: 'fs',
        base: './mocks'
      },
      settings: {
        driver: 'fs',
        base: './settings'
      }
    }
  },
  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@mock.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-me'
  }
})