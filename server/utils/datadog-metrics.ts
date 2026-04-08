import tracer from 'dd-trace'

export interface MetricOptions {
  tags?: Record<string, string>
  timestamp?: number
}

export function incrementCounter(metricName: string, value: number = 1, options?: MetricOptions) {
  const activeSpan = tracer.scope().active()
  
  if (activeSpan) {
    activeSpan.setTag(`metric.${metricName}`, value)
    
    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, val]) => {
        activeSpan.setTag(`metric.${metricName}.${key}`, val)
      })
    }
  }
  
  console.log(`[Metric] ${metricName}: +${value}`, options?.tags || {})
}

export function recordGauge(metricName: string, value: number, options?: MetricOptions) {
  const activeSpan = tracer.scope().active()
  
  if (activeSpan) {
    activeSpan.setTag(`metric.${metricName}`, value)
    
    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, val]) => {
        activeSpan.setTag(`metric.${metricName}.${key}`, val)
      })
    }
  }
  
  console.log(`[Metric] ${metricName}: ${value}`, options?.tags || {})
}

export function recordHistogram(metricName: string, value: number, options?: MetricOptions) {
  const activeSpan = tracer.scope().active()
  
  if (activeSpan) {
    activeSpan.setTag(`metric.${metricName}`, value)
    
    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, val]) => {
        activeSpan.setTag(`metric.${metricName}.${key}`, val)
      })
    }
  }
  
  console.log(`[Metric] ${metricName}: ${value}`, options?.tags || {})
}

// Convenience functions
export function trackRequestExecution(method: string, statusCode: number, durationMs: number, success: boolean, tags?: Record<string, string>) {
  incrementCounter('postrack.proxy.request.count', 1, {
    tags: {
      method,
      status_code: statusCode.toString(),
      success: success.toString(),
      ...tags,
    },
  })
  
  recordHistogram('postrack.proxy.request.duration', durationMs, {
    tags: {
      method,
      success: success.toString(),
      ...tags,
    },
  })
}

export function trackSlowRequest(durationMs: number, threshold: number = 3000) {
  if (durationMs > threshold) {
    incrementCounter('postrack.proxy.slow_request', 1, {
      tags: {
        duration_bucket: durationMs > 5000 ? '5s+' : durationMs > 3000 ? '3-5s' : 'unknown',
      },
    })
  }
}

export function trackUserStress(reason: string, metadata?: Record<string, string>) {
  incrementCounter('postrack.user.stress', 1, {
    tags: {
      reason,
      ...metadata,
    },
  })
}
