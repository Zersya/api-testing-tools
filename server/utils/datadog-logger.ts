/**
 * Datadog Direct Logger
 * 
 * Sends logs directly to Datadog HTTP API as a fallback when Agent is not available.
 * This provides reliable log delivery without requiring the Datadog Agent.
 * 
 * Features:
 * - Batched log shipping (flushes every 5 seconds or when buffer reaches 100 logs)
 * - Automatic retry with exponential backoff
 * - Graceful shutdown handling
 * - Correlation with APM traces via dd.trace_id and dd.span_id
 * - JSON structured logging for better parsing
 */

import tracer from 'dd-trace'

interface LogEntry {
  message: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  service: string
  timestamp: number
  traceId?: string
  spanId?: string
  tags?: Record<string, string | number | boolean>
  error?: {
    kind?: string
    message?: string
    stack?: string
  }
}

interface DatadogLogPayload {
  message: string
  service: string
  status: string
  timestamp: number
  ddsource: string
  ddtags: string
  hostname: string
  trace_id?: string
  span_id?: string
  error_kind?: string
  error_message?: string
  error_stack?: string
}

class DatadogLogger {
  private apiKey: string
  private site: string
  private service: string
  private env: string
  private version: string
  private hostname: string
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private isEnabled: boolean = false
  private isShuttingDown: boolean = false
  private maxBufferSize: number = 100
  private flushIntervalMs: number = 5000
  private retryAttempts: number = 3
  private retryDelayMs: number = 1000

  constructor() {
    const config = useRuntimeConfig()
    this.apiKey = config.datadogApiKey || process.env.DATADOG_API_KEY || ''
    this.site = config.datadogSite || process.env.DATADOG_SITE || 'us5.datadoghq.com'
    this.service = 'postrack-api'
    this.env = config.datadogEnv || process.env.DATADOG_ENV || 'production'
    this.version = config.public?.appVersion || process.env.DD_VERSION || '0.0.0'
    this.hostname = process.env.HOSTNAME || process.env.DD_HOSTNAME || 'postrack-api-host'
    
    // Enable if we have an API key and we're not in development (unless forced)
    const forceEnable = process.env.DD_LOGS_FORCE_ENABLE === 'true'
    this.isEnabled = !!(this.apiKey && (forceEnable || this.env !== 'development'))

    if (this.isEnabled) {
      this.startFlushInterval()
      console.log(`[Datadog Logger] Initialized - shipping to ${this.site}`)
    } else {
      console.log('[Datadog Logger] Disabled (no API key or development mode)')
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('[Datadog Logger] Flush error:', err)
      })
    }, this.flushIntervalMs)
  }

  private formatLogEntry(entry: LogEntry): DatadogLogPayload {
    // Build tags string
    const tags: Record<string, string> = {
      env: this.env,
      version: this.version,
      service: this.service,
      ...(entry.tags || {})
    }
    
    const ddtags = Object.entries(tags)
      .map(([k, v]) => `${k}:${v}`)
      .join(',')

    const payload: DatadogLogPayload = {
      message: entry.message,
      service: this.service,
      status: entry.level,
      timestamp: entry.timestamp,
      ddsource: 'nodejs',
      ddtags,
      hostname: this.hostname,
    }

    // Add trace correlation if available
    if (entry.traceId) {
      payload.trace_id = entry.traceId
    }
    if (entry.spanId) {
      payload.span_id = entry.spanId
    }

    // Add error details if present
    if (entry.error) {
      payload.error_kind = entry.error.kind
      payload.error_message = entry.error.message
      payload.error_stack = entry.error.stack
    }

    return payload
  }

  private async sendLogsWithRetry(logs: DatadogLogPayload[], attempt: number = 1): Promise<void> {
    try {
      const url = `https://http-intake.logs.${this.site}/v1/input/${this.apiKey}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
          'DD-EVP-ORIGIN': 'postrack-api',
          'DD-EVP-ORIGIN-VERSION': this.version
        },
        body: JSON.stringify(logs),
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1)
        console.warn(`[Datadog Logger] Retry ${attempt}/${this.retryAttempts} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.sendLogsWithRetry(logs, attempt + 1)
      }
      throw error
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isEnabled || this.isShuttingDown) return

    const logs = [...this.buffer]
    this.buffer = []

    try {
      const formattedLogs = logs.map(l => this.formatLogEntry(l))
      await this.sendLogsWithRetry(formattedLogs)
    } catch (error) {
      console.error('[Datadog Logger] Failed to send logs:', error)
      
      // If sending fails, add back to buffer (limited size to prevent memory issues)
      if (this.buffer.length < this.maxBufferSize) {
        this.buffer.unshift(...logs.slice(0, this.maxBufferSize - this.buffer.length))
      }
    }
  }

  private getTraceContext(): { traceId?: string; spanId?: string } {
    try {
      const activeSpan = tracer.scope().active()
      if (activeSpan) {
        return {
          traceId: activeSpan.context().toTraceId(),
          spanId: activeSpan.context().toSpanId()
        }
      }
    } catch {
      // Ignore tracer errors
    }
    return {}
  }

  private addToBuffer(entry: LogEntry) {
    if (this.buffer.length >= this.maxBufferSize) {
      // Remove oldest log to make room
      this.buffer.shift()
    }
    this.buffer.push(entry)
  }

  log(
    message: string, 
    level: LogEntry['level'] = 'info', 
    tags?: Record<string, string | number | boolean>,
    error?: Error
  ) {
    // Always log to console for local debugging
    const consoleMethod = level === 'error' || level === 'fatal' ? console.error : 
                         level === 'warn' ? console.warn : console.log
    consoleMethod(`[${level.toUpperCase()}] ${message}`, tags || '')

    if (!this.isEnabled || this.isShuttingDown) return

    const traceContext = this.getTraceContext()
    
    const entry: LogEntry = {
      message,
      level,
      service: this.service,
      timestamp: Date.now(),
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      tags
    }

    // Add error details if provided
    if (error) {
      entry.error = {
        kind: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    this.addToBuffer(entry)

    // If error or fatal, flush immediately
    if (level === 'error' || level === 'fatal') {
      this.flush().catch(err => {
        console.error('[Datadog Logger] Immediate flush error:', err)
      })
    }
  }

  // Convenience methods
  debug(message: string, tags?: Record<string, string | number | boolean>) {
    this.log(message, 'debug', tags)
  }

  info(message: string, tags?: Record<string, string | number | boolean>) {
    this.log(message, 'info', tags)
  }

  warn(message: string, tags?: Record<string, string | number | boolean>) {
    this.log(message, 'warn', tags)
  }

  error(message: string, error?: Error, tags?: Record<string, string | number | boolean>) {
    this.log(message, 'error', tags, error)
  }

  fatal(message: string, error?: Error, tags?: Record<string, string | number | boolean>) {
    this.log(message, 'fatal', tags, error)
  }

  async shutdown() {
    if (this.isShuttingDown) return
    
    this.isShuttingDown = true
    console.log('[Datadog Logger] Shutting down...')

    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    // Final flush with longer timeout
    try {
      await Promise.race([
        this.flush(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown flush timeout')), 5000)
        )
      ])
      console.log('[Datadog Logger] Shutdown complete')
    } catch (error) {
      console.error('[Datadog Logger] Shutdown error:', error)
    }
  }
}

// Singleton instance
let logger: DatadogLogger | null = null

export function getDatadogLogger(): DatadogLogger {
  if (!logger) {
    logger = new DatadogLogger()
  }
  return logger
}

// Convenience export functions
export function ddLog(
  message: string, 
  level: LogEntry['level'] = 'info', 
  tags?: Record<string, string | number | boolean>,
  error?: Error
) {
  getDatadogLogger().log(message, level, tags, error)
}

export function ddDebug(message: string, tags?: Record<string, string | number | boolean>) {
  getDatadogLogger().debug(message, tags)
}

export function ddInfo(message: string, tags?: Record<string, string | number | boolean>) {
  getDatadogLogger().info(message, tags)
}

export function ddWarn(message: string, tags?: Record<string, string | number | boolean>) {
  getDatadogLogger().warn(message, tags)
}

export function ddError(message: string, error?: Error, tags?: Record<string, string | number | boolean>) {
  getDatadogLogger().error(message, error, tags)
}

export function ddFatal(message: string, error?: Error, tags?: Record<string, string | number | boolean>) {
  getDatadogLogger().fatal(message, error, tags)
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  if (logger) {
    await logger.shutdown()
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  if (logger) {
    await logger.shutdown()
  }
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[Uncaught Exception]', error)
  if (logger) {
    logger.fatal('Uncaught exception', error)
    await logger.shutdown()
  }
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[Unhandled Rejection]', reason)
  if (logger) {
    logger.error('Unhandled promise rejection', reason as Error)
  }
})
