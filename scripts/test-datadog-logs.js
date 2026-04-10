/**
 * Datadog Integration Test Script
 * 
 * Run this script after deployment to verify logs are being sent to Datadog.
 * 
 * Usage:
 *   node scripts/test-datadog-logs.js
 * 
 * This will:
 * 1. Test direct log shipping via API
 * 2. Verify environment variables
 * 3. Test log-trace correlation
 */

import { getDatadogLogger, ddInfo, ddWarn, ddError, ddDebug } from '../server/utils/datadog-logger.ts'
import tracer from 'dd-trace'

console.log('=== Datadog Integration Test ===\n')

// Test 1: Environment Variables
console.log('Test 1: Checking environment variables...')
const requiredVars = [
  'DATADOG_API_KEY',
  'DATADOG_SITE',
  'DATADOG_ENV'
]

const missingVars = []
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName)
    console.log(`  ❌ ${varName}: NOT SET`)
  } else {
    const value = varName.includes('KEY') || varName.includes('TOKEN') 
      ? '***hidden***' 
      : process.env[varName]
    console.log(`  ✅ ${varName}: ${value}`)
  }
}

if (missingVars.length > 0) {
  console.log(`\n⚠️  Missing required variables: ${missingVars.join(', ')}`)
  console.log('Logs will be sent to console only (not to Datadog)\n')
}

// Test 2: Logger Initialization
console.log('Test 2: Initializing Datadog logger...')
try {
  const logger = getDatadogLogger()
  console.log('  ✅ Logger initialized successfully\n')
} catch (error) {
  console.log(`  ❌ Logger initialization failed: ${error.message}\n`)
  process.exit(1)
}

// Test 3: Send Test Logs
console.log('Test 3: Sending test logs...')

// Create a trace span for correlation testing
const testSpan = tracer.startSpan('datadog.test', {
  tags: {
    test: true,
    component: 'integration-test'
  }
})

tracer.scope().activate(testSpan, () => {
  // Send different log levels
  ddDebug('Debug message from test script', { test_type: 'debug', component: 'integration-test' })
  console.log('  ✅ Sent debug log')

  ddInfo('Info message from test script', { test_type: 'info', component: 'integration-test' })
  console.log('  ✅ Sent info log')

  ddWarn('Warning message from test script', { test_type: 'warn', component: 'integration-test' })
  console.log('  ✅ Sent warning log')

  ddError('Error message from test script', new Error('Test error for Datadog integration'), { test_type: 'error', component: 'integration-test' })
  console.log('  ✅ Sent error log with exception\n')

  // Set tags and finish span
  testSpan.setTag('test.completed', true)
  testSpan.finish()
})

// Test 4: Metrics
console.log('Test 4: Testing metric tracking...')
try {
  const { incrementCounter, recordGauge, recordHistogram } = await import('../server/utils/datadog-metrics.ts')
  
  incrementCounter('test.counter', 1, { test: 'true' })
  console.log('  ✅ Sent counter metric')
  
  recordGauge('test.gauge', 42, { test: 'true' })
  console.log('  ✅ Sent gauge metric')
  
  recordHistogram('test.histogram', 150, { test: 'true' })
  console.log('  ✅ Sent histogram metric\n')
} catch (error) {
  console.log(`  ❌ Metric test failed: ${error.message}\n`)
}

// Test 5: Flush and Verify
console.log('Test 5: Flushing logs...')
const logger = getDatadogLogger()

// Wait a moment then flush
setTimeout(async () => {
  try {
    await logger.flush()
    console.log('  ✅ Logs flushed successfully\n')
    
    console.log('=== Test Complete ===')
    console.log('\nNext steps:')
    console.log('1. Check Datadog → Logs → Livetail')
    console.log('2. Filter by: service:postrack-api component:integration-test')
    console.log('3. Look for the test logs above')
    console.log('4. Verify log-trace correlation by clicking on a log\n')
    
    // Graceful shutdown
    await logger.shutdown()
    process.exit(0)
  } catch (error) {
    console.log(`  ❌ Flush failed: ${error.message}\n`)
    process.exit(1)
  }
}, 2000)
