import { datadogRum } from '@datadog/browser-rum'

export default defineNuxtPlugin((nuxtApp) => {
  // Handle Vue component errors
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    const route = useRoute()
    
    // Extract component name
    const componentName = instance?.$options?.name || 
                          instance?.$options?.__name || 
                          'AnonymousComponent'
    
    // Add error to Datadog with context
    datadogRum.addError(error as Error, {
      type: 'vue_error',
      component: componentName,
      info: info,
      route: route.path,
      routeName: route.name,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    })

    // Also log to console for development
    console.error('[Vue Error]', {
      component: componentName,
      info,
      error
    })
  }

  // Handle Vue warnings (development mode issues)
  const originalWarn = console.warn
  console.warn = (...args) => {
    datadogRum.addError(new Error(args.join(' ')), {
      type: 'vue_warning',
      args: args,
    })
    originalWarn.apply(console, args)
  }
})
