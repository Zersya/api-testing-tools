import { datadogRum } from '@datadog/browser-rum'

export default defineNuxtPlugin(() => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    
    datadogRum.addError(error instanceof Error ? error : new Error(String(error)), {
      type: 'unhandled_promise_rejection',
      reason: error,
      promise: event.promise,
      route: window.location.pathname,
    })

    console.error('[Unhandled Promise Rejection]', error)
  })

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    datadogRum.addError(event.error || new Error(event.message), {
      type: 'javascript_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      message: event.message,
      route: window.location.pathname,
    })

    console.error('[Global Error]', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  // Track page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (perfData) {
        datadogRum.addAction('page_load_performance', {
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          request: perfData.responseStart - perfData.requestStart,
          response: perfData.responseEnd - perfData.responseStart,
          dom: perfData.domComplete - perfData.domInteractive,
          total: perfData.loadEventEnd - perfData.fetchStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        })

        // Alert if page is slow (> 3s)
        if (perfData.loadEventEnd - perfData.fetchStart > 3000) {
          datadogRum.addError(new Error('Slow page load'), {
            type: 'performance_slow_page_load',
            loadTime: perfData.loadEventEnd - perfData.fetchStart,
            route: window.location.pathname,
          })
        }
      }
    }, 0)
  })

  // Track resource loading failures
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as HTMLElement).tagName) {
      const target = event.target as HTMLLinkElement | HTMLScriptElement | HTMLImageElement
      
      datadogRum.addError(new Error('Resource load failed'), {
        type: 'resource_load_error',
        tagName: target.tagName,
        src: target.href || target.src,
        route: window.location.pathname,
      })
    }
  }, true) // Use capture phase
})
