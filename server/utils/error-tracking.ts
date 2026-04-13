import tracer from 'dd-trace'
import { ddError } from './datadog-logger'

export interface ErrorDetails {
  type: string
  message: string
  stack?: string
  userId?: string
  workspaceId?: string
  requestId?: string
  metadata?: Record<string, any>
}

export function trackServerError(error: Error | unknown, context?: Partial<ErrorDetails>) {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  const activeSpan = tracer.scope().active()
  
  const errorDetails: ErrorDetails = {
    type: context?.type || 'server_error',
    message: errorObj.message,
    stack: errorObj.stack,
    userId: context?.userId,
    workspaceId: context?.workspaceId,
    requestId: context?.requestId,
    metadata: context?.metadata,
  }

  // Add error to active span
  if (activeSpan) {
    activeSpan.setTag('error', true)
    activeSpan.setTag('error.type', errorDetails.type)
    activeSpan.setTag('error.message', errorDetails.message)
    activeSpan.setTag('error.stack', errorDetails.stack)
    
    if (errorDetails.userId) {
      activeSpan.setTag('user.id', errorDetails.userId)
    }
    if (errorDetails.workspaceId) {
      activeSpan.setTag('workspace.id', errorDetails.workspaceId)
    }
  }

  // Inject Datadog trace IDs for log correlation
  const traceId = activeSpan ? activeSpan.context().toTraceId() : undefined
  const spanId = activeSpan ? activeSpan.context().toSpanId() : undefined

  // Send to Datadog via direct logger
  ddError(
    `[${errorDetails.type}] ${errorDetails.message}`,
    errorObj,
    {
      error_type: errorDetails.type,
      user_id: errorDetails.userId || 'unknown',
      workspace_id: errorDetails.workspaceId || 'unknown',
      request_id: errorDetails.requestId || 'unknown',
      ...(errorDetails.metadata || {}),
      ...(traceId ? { trace_id: traceId } : {}),
      ...(spanId ? { span_id: spanId } : {})
    }
  )

  // Also log to console as JSON for Agent log collection (if Agent is present)
  console.error(JSON.stringify({
    message: errorDetails.message,
    level: 'error',
    error: {
      kind: errorDetails.type,
      message: errorDetails.message,
      stack: errorDetails.stack,
    },
    userId: errorDetails.userId,
    workspaceId: errorDetails.workspaceId,
    requestId: errorDetails.requestId,
    metadata: errorDetails.metadata,
    'dd.trace_id': traceId,
    'dd.span_id': spanId
  }))

  return errorDetails
}

export function createRequestSpan(name: string, options?: tracer.SpanOptions) {
  return tracer.startSpan(name, options)
}

export function setSpanTags(span: tracer.Span, tags: Record<string, any>) {
  Object.entries(tags).forEach(([key, value]) => {
    span.setTag(key, value)
  })
}

export function finishSpanWithError(span: tracer.Span, error: Error | unknown) {
  const errorObj = error instanceof Error ? error : new Error(String(error))
  
  span.setTag('error', true)
  span.setTag('error.message', errorObj.message)
  span.setTag('error.stack', errorObj.stack)
  span.finish()
}
