/**
 * Copy Nuxt server output to Tauri resources
 * This bundles the server with the Tauri app
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync, statSync, readFileSync } from 'fs'
import { join } from 'path'

const sourceDir = join(process.cwd(), '.output')
const targetDir = join(process.cwd(), 'src-tauri', 'resources', 'server')
const projectRoot = process.cwd()

console.log('📦 Starting Tauri server build...')
console.log('📂 Source:', sourceDir)
console.log('📂 Target:', targetDir)

// Clean and create target directory
if (existsSync(targetDir)) {
  console.log('🗑️  Cleaning old server files...')
  readdirSync(targetDir).forEach(file => {
    const filePath = join(targetDir, file)
    try {
      if (file !== '.gitkeep') {
        cpSync(filePath, join('/tmp/tauri-server-backup', file), { recursive: true })
      }
    } catch (e) {
      // Ignore errors when backing up
    }
  })
  readdirSync(targetDir).forEach(file => {
    const filePath = join(targetDir, file)
    try {
      if (file !== '.gitkeep') {
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
          require('fs').rmdirSync(filePath, { recursive: true })
        } else {
          require('fs').unlinkSync(filePath)
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  })
}

mkdirSync(targetDir, { recursive: true })

// Copy .output/server directory
console.log('📋 Copying .output/server directory...')
const serverSourceDir = join(sourceDir, 'server')
if (existsSync(serverSourceDir)) {
  cpSync(serverSourceDir, targetDir, { recursive: true })
  console.log('✅ Server files copied')
  
  // CRITICAL: Copy node_modules if they exist in the server output
  const nodeModulesSource = join(serverSourceDir, 'node_modules')
  if (existsSync(nodeModulesSource)) {
    console.log('📦 Copying server dependencies...')
    cpSync(nodeModulesSource, join(targetDir, 'node_modules'), { recursive: true })
  }
} else {
  console.error('❌ .output/server directory not found!')
  console.error('   Run "npx nuxi build --preset node-server" first')
  process.exit(1)
}

// Copy public assets (SPA frontend) - index.html and _nuxt
console.log('📋 Copying public assets...')
const publicSourceDir = join(sourceDir, 'public')
const publicTargetDir = join(targetDir, 'public')
mkdirSync(publicTargetDir, { recursive: true })
if (existsSync(publicSourceDir)) {
  // Copy all files from public
  readdirSync(publicSourceDir).forEach(file => {
    const srcPath = join(publicSourceDir, file)
    const destPath = join(publicTargetDir, file)
    
    // Skip index.html - we'll generate a proper one for SPA
    if (file === 'index.html') {
      console.log('⏭️  Skipping index.html (generating SPA entry)')
      return
    }
    
    if (statSync(srcPath).isDirectory()) {
      // Always copy recursively - overwrite existing dirs
      cpSync(srcPath, destPath, { recursive: true })
    } else {
      cpSync(srcPath, destPath)
    }
  })
  
  // Generate proper index.html for SPA (Tauri needs this at root)
  console.log('📋 Patching Nuxt-generated index.html for Tauri...')
  
  // Try to find index.html in several possible locations
  const possiblePaths = [
    join(publicSourceDir, 'index.html'),
    join(sourceDir, 'public', 'index.html'),
    join(sourceDir, 'server', 'public', 'index.html')
  ]
  
  let originalIndexPath = null
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      originalIndexPath = path
      break
    }
  }

  if (originalIndexPath) {
    console.log(`✅ Found index.html at: ${originalIndexPath}`)
    let html = readFileSync(originalIndexPath, 'utf-8')
    
    // Inject the Tauri configuration
    const configInjection = `
  <script>
    window.__NUXT__ = {};
    window.__NUXT__.config = {
      public: {
        apiUrl: "http://127.0.0.1:3001",
        isTauri: true
      },
      app: {
        baseURL: "./",
        buildAssetsDir: "./_nuxt/",
        cdnURL: ""
      }
    };
  </script>`
    
    // Insert config before the first script tag or at the end of head
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${configInjection}`)
    } else {
      html = configInjection + html
    }

    // Ensure base href is relative for Tauri's local serving
    html = html.replace(/<base href="[^"]*">/g, '<base href="./">')
    if (!html.includes('<base href="./">')) {
      html = html.replace('<head>', '<head><base href="./">')
    }
    
    // Fix asset paths to be relative
    html = html.replace(/src="\//g, 'src="./')
    html = html.replace(/href="\//g, 'href="./')
    
    writeFileSync(join(publicTargetDir, 'index.html'), html)
    console.log('✅ index.html patched successfully')
  } else {
    console.warn('⚠️  Original index.html not found. Creating a fallback SPA entry...')
    // Fallback if prerendering failed to produce an index.html
    const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mock Service</title>
  <base href="./">
  <script>
    window.__NUXT__ = { config: { public: { apiUrl: "http://127.0.0.1:3001", isTauri: true }, app: { baseURL: "./", buildAssetsDir: "./_nuxt/" } } };
  </script>
</head>
<body>
  <div id="__nuxt"></div>
  <script type="module" src="./_nuxt/entry.js"></script>
</body>
</html>`
    writeFileSync(join(publicTargetDir, 'index.html'), fallbackHtml)
  }
}

// Copy database initialization script
console.log('📋 Copying database initialization script...')
const initDbScript = join(projectRoot, 'scripts', 'init-db.js')
if (existsSync(initDbScript)) {
  cpSync(initDbScript, join(targetDir, 'init-db.js'))
}

// Update nitro.json to ensure SSR is disabled for SPA mode
console.log('📋 Updating Nitro configuration for SPA mode...')
const nitroJsonSrc = join(sourceDir, 'nitro.json')
const nitroJsonDest = join(targetDir, 'nitro.json')
if (existsSync(nitroJsonSrc)) {
  const nitroConfig = JSON.parse(readFileSync(nitroJsonSrc, 'utf-8'))
  nitroConfig.ssr = false
  writeFileSync(nitroJsonDest, JSON.stringify(nitroConfig, null, 2))
}

// We will use the original Nuxt index.mjs instead of a custom wrapper
// But we need to make sure it has execution permissions
console.log('✅ Using Nuxt native entry point')

// Copy .env file
const envContent = `# Tauri Environment Variables
TAURI=true
TAURI_ENV_DEV=false
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
NITRO_PORT=3001
NITRO_HOST=127.0.0.1

# Database (will be overridden by Tauri with app data path)
SQLITE_DB_PATH=sqlite.db

# JWT Secret
JWT_SECRET=super-secret-jwt-key-change-me

# Admin credentials
ADMIN_EMAIL=admin@mock.com
ADMIN_PASSWORD=admin123
`
writeFileSync(join(targetDir, '.env'), envContent)

console.log('✅ Server copied to Tauri resources:', targetDir)
console.log('📋 Server entry point:', join(targetDir, 'index.mjs'))
console.log('📋 Run "bun run tauri:build" to build the Tauri app')
