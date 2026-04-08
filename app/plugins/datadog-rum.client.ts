import { datadogRum } from '@datadog/browser-rum'
import { datadogLogs } from '@datadog/browser-logs'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Skip in development if desired
  if (config.public.datadogEnv === 'development') {
    console.log('[Datadog] Skipping initialization in development')
    return
  }

  // Initialize RUM
  datadogRum.init({
    applicationId: config.public.datadogApplicationId!,
    clientToken: config.public.datadogClientToken!,
    site: config.public.datadogSite!,
    service: config.public.datadogService!,
    env: config.public.datadogEnv!,
    version: config.public.datadogVersion!,
    
    // Sampling
    sessionSampleRate: 100,
    sessionReplaySampleRate: 10, // Reduced for privacy
    
    // Performance tracking
    trackResources: true,
    trackUserInteractions: true,
    trackLongTasks: true,
    
    // Distributed tracing - link to backend
    allowedTracingUrls: [
      config.public.appUrl,
      'https://postrack.transtrack.co',
      'http://localhost:3000'
    ],
    
    // Privacy
    defaultPrivacyLevel: 'mask-user-input',
  })

  // Initialize Logs (optional but useful)
  datadogLogs.init({
    clientToken: config.public.datadogClientToken!,
    site: config.public.datadogSite!,
    service: config.public.datadogService!,
    env: config.public.datadogEnv!,
    forwardErrorsToLogs: true,
    forwardConsoleLogs: ['error', 'warn'],
  })

  console.log('[Datadog RUM] Initialized', {
    service: config.public.datadogService,
    env: config.public.datadogEnv,
    version: config.public.datadogVersion
  })

  // Provide global access
  return {
    provide: {
      datadogRum,
      datadogLogs
    }
  }
})
