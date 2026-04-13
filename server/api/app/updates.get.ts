// Update server endpoint for Tauri auto-updater
// Returns update information in the format expected by tauri-plugin-updater
// Reference: https://tauri.app/plugin/updater/

export default defineEventHandler(async (event) => {
  const headers = getRequestHeaders(event);
  const userAgent = headers['user-agent'] || '';

  // Detect platform from User-Agent
  // Tauri sends something like: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Mock Service/0.2.1"
  const isMac = userAgent.includes('Macintosh') || userAgent.includes('Mac OS X');
  const isWindows = userAgent.includes('Windows');
  const isLinux = userAgent.includes('Linux');

  // Get current version from User-Agent or use latest
  // Format: "AppName/1.0.0"
  const versionMatch = userAgent.match(/Mock Service\/(\d+\.\d+\.\d+)/);
  const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';

  console.log(`[Updater] Check from version ${currentVersion}, platform: ${isMac ? 'macOS' : isWindows ? 'Windows' : isLinux ? 'Linux' : 'unknown'}`);

  // Latest version info
  const latestVersion = '0.2.2'; // Increment this when releasing updates
  const releaseDate = new Date().toISOString();

  // Compare versions (simple semver comparison)
  const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;

  if (!needsUpdate) {
    console.log('[Updater] No update needed');
    return {
      version: latestVersion,
      notes: 'You are up to date!',
      pub_date: releaseDate,
      signature: '',
      url: ''
    };
  }

  // Build update info for the requesting platform
  const baseUrl = 'https://postrack.transtrack.co/updates';

  let updateInfo: any = {
    version: latestVersion,
    notes: `## What's New in v${latestVersion}\n\n- Auto-update feature added\n- Bug fixes and improvements\n- Performance enhancements`,
    pub_date: releaseDate,
  };

  // Platform-specific update file
  if (isMac) {
    // For macOS, provide .tar.gz update bundle
    updateInfo = {
      ...updateInfo,
      url: `${baseUrl}/mock-service_${latestVersion}_aarch64.app.tar.gz`,
      signature: 'YOUR_SIGNATURE_HERE' // Generated during build
    };
  } else if (isWindows) {
    updateInfo = {
      ...updateInfo,
      url: `${baseUrl}/mock-service_${latestVersion}_x64-setup.nsis.zip`,
      signature: 'YOUR_SIGNATURE_HERE'
    };
  } else if (isLinux) {
    updateInfo = {
      ...updateInfo,
      url: `${baseUrl}/mock-service_${latestVersion}_amd64.AppImage.tar.gz`,
      signature: 'YOUR_SIGNATURE_HERE'
    };
  }

  console.log('[Updater] Update available:', updateInfo.version);

  return updateInfo;
});

/**
 * Simple semver version comparison
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;

    if (a < b) return -1;
    if (a > b) return 1;
  }

  return 0;
}
