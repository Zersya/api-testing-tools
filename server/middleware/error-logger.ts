import tracer from 'dd-trace'
import { trackServerError } from '../utils/error-tracking'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  
  // Skip in development
  if (config.datadogEnv === 'development') return

  // Create span for this request
  const span = tracer.startSpan('http.request', {
    tags: {
      'http.method': event.method,
      'http.url': event.path,
      'http.route': event.path,
    },
  })

  // Store span in event context
  event.context.datadogSpan = span

  // Track request timing
  const startTime = Date.now()

  // Cleanup after response
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime
    
    span.setTag('http.status_code', event.node.res.statusCode)
    span.setTag('http.response_time', duration)
    
    // Tag slow requests (> 1s)
    if (duration > 1000) {
      span.setTag('performance.slow', true)
      console.warn(`[Slow Request] ${event.method} ${event.path} - ${duration}ms`)
    }
    
    // Tag errors
    if (event.node.res.statusCode >= 400) {
      span.setTag('error', true)
    }
    
    span.finish()
  })

  // Handle unhandled errors
  event.node.req.on('error', (error) => {
    trackServerError(error, {
      type: 'request_error',
      requestId: event.context.params?.id,
    })
    
    finishSpanWithError(span, error)
  })
})

function finishSpanWithError(span: tracer.Span, error: unknown) {
  span.setTag('error', true)
  if (error instanceof Error) {
    span.setTag('error.message', error.message)
    span.setTag('error.stack', error.stack)
  }
  span.finish()
}
