import { datadogRum } from '@datadog/browser-rum'

export interface ErrorContext {
  type?: string
  action?: string
  metadata?: Record<string, any>
}

export function useErrorTracking() {
  const trackError = (error: Error | string, context?: ErrorContext) => {
    const errorObj = error instanceof Error ? error : new Error(error)
    const route = useRoute()
    const { user } = useUser()
    
    const errorContext = {
      type: context?.type || 'manual_error',
      action: context?.action,
      route: route.path,
      routeName: route.name,
      userId: user.value?.id,
      workspaceId: user.value?.workspaceId,
      timestamp: new Date().toISOString(),
      ...context?.metadata,
    }
    
    datadogRum.addError(errorObj, errorContext)
    
    console.error('[Tracked Error]', errorObj, errorContext)
  }

  const trackAction = (name: string, metadata?: Record<string, any>) => {
    const route = useRoute()
    
    datadogRum.addAction(name, {
      route: route.path,
      routeName: route.name,
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  }

  const trackTiming = (name: string, duration: number, metadata?: Record<string, any>) => {
    datadogRum.addTiming(name, duration)
    
    if (duration > 1000) {
      trackError(new Error(`Slow operation: ${name}`), {
        type: 'performance_slow_operation',
        metadata: {
          operation: name,
          duration,
          ...metadata,
        },
      })
    }
  }

  const trackUserStress = (reason: string, metadata?: Record<string, any>) => {
    datadogRum.addError(new Error(`User stress detected: ${reason}`), {
      type: 'user_stress',
      reason,
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  }

  return {
    trackError,
    trackAction,
    trackTiming,
    trackUserStress,
  }
}
