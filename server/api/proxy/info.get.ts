/**
 * Proxy Version Info Endpoint
 * GET /api/proxy/info
 * 
 * Returns current proxy version information for update checks.
 * Called by the local proxy script to check for updates.
 */

export default defineEventHandler(async (event) => {
  // CORS headers for proxy update checks
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*');
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, OPTIONS');
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 200);
    return '';
  }

  // Current proxy version - must match version in mock-api-proxy.js
  const PROXY_VERSION = '1.0.0';
  
  // Build the base URL from runtime config
  const config = useRuntimeConfig();
  const baseUrl = config.public?.appUrl || 'https://api-mock.transtrack.id';

  return {
    version: PROXY_VERSION,
    releaseDate: '2026-04-02',
    downloadUrl: `${baseUrl}/proxy-scripts/mock-api-proxy.js`,
    installScriptBash: `${baseUrl}/install-proxy.sh`,
    installScriptPowerShell: `${baseUrl}/install-proxy.ps1`,
    documentationUrl: `${baseUrl}/docs/proxy`,
    minimumNodeVersion: '14.0.0',
    
    // Version changelog
    changelog: {
      [PROXY_VERSION]: [
        'Initial release',
        'Multi-instance support',
        'Terminal UI with beautiful tables',
        'Auto-update checking',
        'Cross-platform support (macOS, Linux, Windows)'
      ]
    }
  };
});
