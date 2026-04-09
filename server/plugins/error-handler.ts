import { trackServerError } from '../utils/error-tracking'
import tracer from 'dd-trace'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    console.error(`[Nitro Error] ${event?.path || 'Unknown path'}:`, error)
    
    if (event) {
      // Find the span from context or active scope
      const span = event.context.datadogSpan || tracer.scope().active()
      
      const errorDetails = trackServerError(error, {
        type: 'nitro_error',
        requestId: event.context.params?.id,
        metadata: { path: event.path, method: event.method }
      })

      if (span) {
        span.setTag('error', true)
        span.setTag('error.type', errorDetails.type)
        span.setTag('error.message', errorDetails.message)
        span.setTag('error.stack', errorDetails.stack)
      }
    } else {
      trackServerError(error, { type: 'nitro_internal_error' })
    }
  })
})
