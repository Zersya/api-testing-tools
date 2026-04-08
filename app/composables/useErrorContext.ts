import { datadogRum } from '@datadog/browser-rum'

export interface RecentError {
  type: string
  message: string
  timestamp: string
}

export function useErrorContext() {
  const getRecentErrors = (): RecentError[] => {
    // Get errors from localStorage
    const storedErrors = localStorage.getItem('recent_errors')
    
    if (storedErrors) {
      try {
        const errors = JSON.parse(storedErrors)
        // Filter to last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        return errors
          .filter((e: any) => new Date(e.timestamp).getTime() > oneHourAgo)
          .slice(0, 10) // Max 10 recent errors
      } catch {
        return []
      }
    }
    
    return []
  }

  const trackError = (type: string, message: string) => {
    const errors = getRecentErrors()
    errors.push({
      type,
      message,
      timestamp: new Date().toISOString(),
    })
    
    // Keep only last 50 errors
    const trimmedErrors = errors.slice(-50)
    localStorage.setItem('recent_errors', JSON.stringify(trimmedErrors))
  }

  const getSessionId = (): string | undefined => {
    try {
      const context = datadogRum.getInternalContext()
      return context?.session_id
    } catch {
      return undefined
    }
  }

  const getErrorContext = () => {
    const recentErrors = getRecentErrors()
    
    return {
      errorCount: recentErrors.length,
      recentErrors: recentErrors.slice(-5), // Last 5 errors
      sessionId: getSessionId(),
    }
  }

  const clearErrorContext = () => {
    localStorage.removeItem('recent_errors')
  }

  return {
    getRecentErrors,
    trackError,
    getSessionId,
    getErrorContext,
    clearErrorContext,
  }
}
