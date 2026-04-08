import tracer from 'dd-trace'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  
  // Skip in development if desired
  if (config.datadogEnv === 'development') {
    console.log('[Datadog APM] Skipping initialization in development')
    return
  }

  // Check if dd-trace is already initialized via CLI flag (--require dd-trace/init)
  // This is the recommended way to ensure proper instrumentation
  const isAlreadyInitialized = tracer._tracer !== undefined
  
  if (!isAlreadyInitialized) {
    // Initialize tracer only if not already done via CLI
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

    console.log('[Datadog APM] Initialized via plugin', {
      service: 'postrack-api',
      env: config.datadogEnv,
      version: config.public.appVersion
    })
  } else {
    // Configure additional instrumentation when initialized via CLI
    tracer.use('http', {
      server: true,
      client: true,
    })
    
    tracer.use('net')
    tracer.use('dns')
    tracer.use('pg', {
      service: 'postrack-postgres'
    })

    console.log('[Datadog APM] Already initialized via CLI flag', {
      service: 'postrack-api',
      env: config.datadogEnv,
      version: config.public.appVersion
    })
  }
})
