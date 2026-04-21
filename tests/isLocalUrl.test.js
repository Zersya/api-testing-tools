/**
 * Tests for isLocalUrl() function
 * Run with: node tests/isLocalUrl.test.js
 */

// Import the isLocalUrl function (requires TypeScript compilation or tsx)
// For now, we'll duplicate the function here for testing
// In a real setup, you'd use tsx or compile TypeScript first

function isLocalUrl(url) {
  // Check for template variables at the start of the URL
  const templateVarPattern = /^(\{\{|%7B%7B)([^{}%]+)(\}\}|%7D%7D)/;
  const templateMatch = url.match(templateVarPattern);

  if (templateMatch) {
    const varName = templateMatch[2].trim().toUpperCase();
    
    // Only tentatively treat as local for variable names that exactly suggest localhost
    // Use exact matches to prevent false positives like {{API_URL}} containing "URL"
    const localHintNames = ['URL', 'LOCAL_URL', 'BASE_URL', 'LOCAL_API_URL', 'DEV_URL', 'LOCALHOST'];
    const hasLocalHint = localHintNames.includes(varName);
    
    if (hasLocalHint) {
      const afterTemplate = url.substring(templateMatch[0].length);
      if (afterTemplate.startsWith('/') || afterTemplate === '' || afterTemplate.startsWith('?')) {
        return true;
      }
    }
    
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Localhost variants
    if (hostname === 'localhost') return true;
    if (hostname === '127.0.0.1') return true;
    // IPv6 localhost - hostname may include brackets
    if (hostname === '::1' || hostname === '[::1]') return true;

    // Local domains
    if (hostname.endsWith('.local') || hostname.endsWith('.localhost')) return true;

    // IPv4 private ranges
    if (hostname.startsWith('10.')) return true;

    // 172.16.0.0/12
    if (hostname.startsWith('172.')) {
      const secondOctet = parseInt(hostname.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }

    // 192.168.0.0/16
    if (hostname.startsWith('192.168.')) return true;

    // 127.0.0.0/8 (loopback range)
    if (hostname.startsWith('127.')) return true;

    // IPv6 private ranges
    // Strip brackets for IPv6 addresses (e.g., [fc00::1] -> fc00::1)
    const ipv6Host = hostname.replace(/^\[|\]$/g, '');
    
    // fc00::/7 (Unique Local Addresses)
    if (ipv6Host.startsWith('fc') || ipv6Host.startsWith('fd')) return true;

    // fe80::/10 (Link-local addresses)
    if (ipv6Host.startsWith('fe8') || ipv6Host.startsWith('fe9') ||
        ipv6Host.startsWith('fea') || ipv6Host.startsWith('feb')) return true;

    return false;
  } catch {
    return false;
  }
}

// Test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

// Tests
test('should detect localhost', () => {
  assertEqual(isLocalUrl('http://localhost:3000/api'), true);
  assertEqual(isLocalUrl('http://localhost/api'), true);
  assertEqual(isLocalUrl('https://localhost:443/api'), true);
});

test('should detect 127.0.0.1', () => {
  assertEqual(isLocalUrl('http://127.0.0.1:4000/api'), true);
  assertEqual(isLocalUrl('http://127.0.0.1/api'), true);
});

test('should detect 127.x.x.x loopback range', () => {
  assertEqual(isLocalUrl('http://127.0.0.2:3000/api'), true);
  assertEqual(isLocalUrl('http://127.255.255.255/api'), true);
});

test('should detect IPv6 localhost', () => {
  // IPv6 addresses in URLs must be wrapped in brackets
  assertEqual(isLocalUrl('http://[::1]:3000/api'), true);
  // http://::1/api is invalid URL syntax, will return false
  assertEqual(isLocalUrl('http://::1/api'), false);
});

test('should detect .local domains', () => {
  assertEqual(isLocalUrl('http://myserver.local:8080/api'), true);
  assertEqual(isLocalUrl('http://api.local/api'), true);
});

test('should detect .localhost domains', () => {
  assertEqual(isLocalUrl('http://myapp.localhost:3000/api'), true);
});

test('should detect 10.x.x.x private range', () => {
  assertEqual(isLocalUrl('http://10.0.0.1:8080/api'), true);
  assertEqual(isLocalUrl('http://10.255.255.255/api'), true);
});

test('should detect 172.16-31.x.x private range', () => {
  assertEqual(isLocalUrl('http://172.16.0.1:3000/api'), true);
  assertEqual(isLocalUrl('http://172.31.255.255/api'), true);
  // Should NOT detect 172.15.x.x or 172.32.x.x
  assertEqual(isLocalUrl('http://172.15.0.1/api'), false);
  assertEqual(isLocalUrl('http://172.32.0.1/api'), false);
});

test('should detect 192.168.x.x private range', () => {
  assertEqual(isLocalUrl('http://192.168.0.1:3000/api'), true);
  assertEqual(isLocalUrl('http://192.168.255.255/api'), true);
  // Should NOT detect 192.169.x.x
  assertEqual(isLocalUrl('http://192.169.0.1/api'), false);
});

test('should detect IPv6 unique local addresses (fc00::/7)', () => {
  assertEqual(isLocalUrl('http://[fc00::1]:3000/api'), true);
  assertEqual(isLocalUrl('http://[fd00::1]/api'), true);
});

test('should detect IPv6 link-local addresses (fe80::/10)', () => {
  assertEqual(isLocalUrl('http://[fe80::1]:3000/api'), true);
  assertEqual(isLocalUrl('http://[febf::1]/api'), true);
  // Should NOT detect fec0::/10
  assertEqual(isLocalUrl('http://[fec0::1]/api'), false);
});

test('should NOT detect public URLs', () => {
  assertEqual(isLocalUrl('https://api.example.com/v1/users'), false);
  assertEqual(isLocalUrl('https://google.com'), false);
  assertEqual(isLocalUrl('http://example.com:8080/api'), false);
});

test('should handle template variables with local hints', () => {
  // Should return true for variable names suggesting localhost
  assertEqual(isLocalUrl('{{URL}}/api/users'), true);
  assertEqual(isLocalUrl('{{BASE_URL}}/api'), true);
  assertEqual(isLocalUrl('{{LOCAL_URL}}/api'), true);
  assertEqual(isLocalUrl('{{DEV_URL}}/api'), true);
  assertEqual(isLocalUrl('{{LOCALHOST}}/api'), true);
  assertEqual(isLocalUrl('{{LOCAL_API_URL}}/api'), true);
});

test('should NOT handle template variables without local hints', () => {
  // Should return false for generic variable names
  assertEqual(isLocalUrl('{{API_URL}}/users'), false);
  assertEqual(isLocalUrl('{{PRODUCTION_URL}}/api'), false);
  assertEqual(isLocalUrl('{{BACKEND_URL}}/api'), false);
  assertEqual(isLocalUrl('{{SERVER_URL}}/api'), false);
});

test('should handle URL-encoded template variables', () => {
  // %7B%7B = {{, %7D%7D = }}
  assertEqual(isLocalUrl('%7B%7BURL%7D%7D/api'), true);
  assertEqual(isLocalUrl('%7B%7BAPI_URL%7D%7D/api'), false);
});

test('should handle invalid URLs gracefully', () => {
  assertEqual(isLocalUrl('not-a-url'), false);
  assertEqual(isLocalUrl(''), false);
  assertEqual(isLocalUrl('   '), false);
});

test('should be case-insensitive for hostnames', () => {
  assertEqual(isLocalUrl('http://LOCALHOST:3000/api'), true);
  assertEqual(isLocalUrl('http://Localhost/api'), true);
  assertEqual(isLocalUrl('http://127.0.0.1/API'), true);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests: ${passed + failed} total, ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
