import tracer from 'dd-trace'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  
  // Skip in development if desired
  if (config.datadogEnv === 'development') {
    console.log('[Datadog APM] Skipping initialization in development')
    return
  }

  // Initialize tracer
  tracer.init({
    service: 'postrack-api',
    env: config.datadogEnv,
    version: config.public.appVersion,
    site: config.datadogSite,
    logLevel: 'warn', // Reduce noise
    
    // Sampling - capture all traces initially
    sampleRate: 1,
    
    // Runtime metrics
    runtimeMetrics: true,
  })

  // Auto-instrument common packages
  tracer.use('http', {
    server: true,
    client: true,
  })
  
  tracer.use('net')
  tracer.use('dns')
  tracer.use('pg', {
    service: 'postrack-postgres'
  })

  console.log('[Datadog APM] Initialized', {
    service: 'postrack-api',
    env: config.datadogEnv,
    version: config.public.appVersion
  })
})
