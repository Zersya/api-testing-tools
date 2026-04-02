#!/usr/bin/env node

/**
 * Mock API Local Proxy - Enhanced with TUI
 * 
 * A beautiful terminal UI proxy for connecting Mock API Service
 * to local development APIs.
 * 
 * Usage:
 *   mock-api-proxy                    # Start with defaults
 *   mock-api-proxy --port 9999        # Custom port
 *   mock-api-proxy --target 3000      # Target localhost:3000
 *   mock-api-proxy --name api1        # Named instance
 *   mock-api-proxy --list             # Show all instances
 *   mock-api-proxy --stop api1        # Stop named instance
 *   mock-api-proxy --update           # Check for updates
 *   mock-api-proxy --uninstall        # Remove from system
 */

const http = require('http');
const https = require('https');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const readline = require('readline');

const VERSION = '1.0.0';
const UPDATE_CHECK_URL = 'https://api-mock.transtrack.id/api/proxy/info';

// ANSI color codes for TUI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

// Paths
const HOME = os.homedir();
const PROXY_DIR = path.join(HOME, '.mock-api-proxy');
const CONFIG_FILE = path.join(PROXY_DIR, 'config.json');
const INSTANCES_FILE = path.join(PROXY_DIR, 'instances.json');
const PID_DIR = path.join(PROXY_DIR, 'pids');

// Ensure directories exist
[PROXY_DIR, PID_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Default configuration
let config = {
  defaultPort: 8765,
  defaultTargetPort: 8080,
  defaultTargetHost: 'localhost',
  autoCheckUpdates: true,
  lastUpdateCheck: null
};

// Load config
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {
    console.error('Warning: Could not load config');
  }
}

// Load instances
let instances = [];
if (fs.existsSync(INSTANCES_FILE)) {
  try {
    instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
  } catch (e) {
    instances = [];
  }
}

// Utility functions
const box = (text, width = 60) => {
  const line = '─'.repeat(width);
  const paddedText = text.padEnd(width - 2);
  return `${colors.cyan}┌${line}┐${colors.reset}
${colors.cyan}│${colors.reset} ${paddedText}${colors.cyan}│${colors.reset}
${colors.cyan}└${line}┘${colors.reset}`;
};

const title = (text) => {
  return `\n${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.cyan}║${colors.reset}  ${text.padEnd(56)}${colors.bright}${colors.cyan}║${colors.reset}
${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`;
};

const success = (msg) => `${colors.green}✓${colors.reset} ${msg}`;
const error = (msg) => `${colors.red}✗${colors.reset} ${msg}`;
const info = (msg) => `${colors.blue}ℹ${colors.reset} ${msg}`;
const warn = (msg) => `${colors.yellow}⚠${colors.reset} ${msg}`;

// Get local IPs
const getLocalIPs = () => {
  const nets = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, address: net.address });
      }
    }
  }
  return ips;
};

// Check for updates
const checkForUpdates = async () => {
  if (!config.autoCheckUpdates) return null;
  
  // Only check once per day
  const now = new Date();
  if (config.lastUpdateCheck) {
    const lastCheck = new Date(config.lastUpdateCheck);
    const hoursSince = (now - lastCheck) / (1000 * 60 * 60);
    if (hoursSince < 24) return null;
  }
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.get(UPDATE_CHECK_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
    
    const remote = JSON.parse(response);
    config.lastUpdateCheck = now.toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    if (remote.version && remote.version !== VERSION) {
      return {
        current: VERSION,
        latest: remote.version,
        url: remote.downloadUrl
      };
    }
  } catch (e) {
    // Silently fail on update check error
  }
  
  return null;
};

// Show update prompt
const promptUpdate = async (updateInfo) => {
  console.log(`\n${colors.yellow}┌─────────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.yellow}│${colors.reset}  ${'Update Available!'.padEnd(57)}${colors.yellow}│${colors.reset}`);
  console.log(`${colors.yellow}├─────────────────────────────────────────────────────────────┤${colors.reset}`);
  console.log(`${colors.yellow}│${colors.reset}  Current: ${updateInfo.current.padEnd(50)}${colors.yellow}│${colors.reset}`);
  console.log(`${colors.yellow}│${colors.reset}  Latest:  ${updateInfo.latest.padEnd(50)}${colors.yellow}│${colors.reset}`);
  console.log(`${colors.yellow}└─────────────────────────────────────────────────────────────┘${colors.reset}\n`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Would you like to update now? (Y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() !== 'n');
    });
  });
};

// Perform update
const performUpdate = async (updateInfo) => {
  console.log('\n' + info('Downloading update...'));
  
  try {
    // Download new version
    const proxyScriptPath = path.join(__dirname, 'proxy.js');
    
    await new Promise((resolve, reject) => {
      https.get(updateInfo.url, (res) => {
        if (res.statusCode === 200) {
          const file = fs.createWriteStream(proxyScriptPath + '.tmp');
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            fs.renameSync(proxyScriptPath + '.tmp', proxyScriptPath);
            fs.chmodSync(proxyScriptPath, 0o755);
            resolve();
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      }).on('error', reject);
    });
    
    console.log(success('Update installed successfully!'));
    console.log(info('Please restart the proxy to use the new version.\n'));
    return true;
  } catch (e) {
    console.log(error(`Update failed: ${e.message}`));
    return false;
  }
};

// Create proxy server
const createProxy = (port, targetHost, targetPort, name) => {
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const targetPath = req.url || '/';
    const targetUrl = `http://${targetHost}:${targetPort}${targetPath}`;
    
    // Log request
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${req.method} ${colors.cyan}${targetUrl}${colors.reset}`);
    
    // Collect body
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      const parsed = parse(targetUrl);
      
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.path,
        method: req.method,
        headers: { ...req.headers }
      };
      
      delete options.headers.origin;
      delete options.headers['access-control-request-private-network'];
      
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        const statusColor = proxyRes.statusCode < 400 ? colors.green : colors.red;
        console.log(`${colors.dim}[${timestamp}]${colors.reset} ${statusColor}← ${proxyRes.statusCode}${colors.reset}`);
        
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (err) => {
        console.log(`${colors.red}✗ Error: ${err.message}${colors.reset}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Bad Gateway',
          message: `Cannot connect to ${targetHost}:${targetPort}`,
          details: err.message
        }));
      });
      
      if (body) proxyReq.write(body);
      proxyReq.end();
    });
  });
  
  return server;
};

// Show running instances table
const showInstances = () => {
  console.log(title('Running Proxy Instances'));
  
  if (instances.length === 0) {
    console.log(info('No running instances.\n'));
    return;
  }
  
  // Header
  console.log(`${colors.bright}┌──────────────┬────────┬─────────────────────┬──────────┐${colors.reset}`);
  console.log(`${colors.bright}│${colors.reset} ${'Name'.padEnd(12)} ${colors.bright}│${colors.reset} ${'Port'.padEnd(6)} ${colors.bright}│${colors.reset} ${'Target'.padEnd(19)} ${colors.bright}│${colors.reset} ${'Status'.padEnd(8)} ${colors.bright}│${colors.reset}`);
  console.log(`${colors.bright}├──────────────┼────────┼─────────────────────┼──────────┤${colors.reset}`);
  
  // Rows
  instances.forEach(inst => {
    const status = inst.running ? 
      `${colors.green}Running${colors.reset}` : 
      `${colors.red}Stopped${colors.reset}`;
    console.log(`${colors.bright}│${colors.reset} ${inst.name.padEnd(12)} ${colors.bright}│${colors.reset} ${inst.port.toString().padEnd(6)} ${colors.bright}│${colors.reset} ${inst.target.padEnd(19)} ${colors.bright}│${colors.reset} ${status.padEnd(17)} ${colors.bright}│${colors.reset}`);
  });
  
  console.log(`${colors.bright}└──────────────┴────────┴─────────────────────┴──────────┘${colors.reset}\n`);
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let port = config.defaultPort;
  let targetPort = config.defaultTargetPort;
  let targetHost = config.defaultTargetHost;
  let name = 'default';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log(title('Mock API Local Proxy'));
      console.log(`Version: ${VERSION}\n`);
      console.log('Usage: mock-api-proxy [options]\n');
      console.log('Options:');
      console.log('  --port, -p <number>     Proxy server port (default: 8765)');
      console.log('  --target, -t <number>   Target local API port (default: 8080)');
      console.log('  --name, -n <name>       Instance name (default: default)');
      console.log('  --host <hostname>       Target host (default: localhost)');
      console.log('  --list, -l              Show running instances');
      console.log('  --stop <name>           Stop named instance');
      console.log('  --update, -u            Check for updates');
      console.log('  --no-update-check       Skip update check this time');
      console.log('  --uninstall             Remove from system');
      console.log('  --version, -v           Show version');
      console.log('  --help, -h              Show this help\n');
      console.log('Examples:');
      console.log('  mock-api-proxy                          # Default: localhost:8080 → :8765');
      console.log('  mock-api-proxy --target 3000            # Proxy to localhost:3000');
      console.log('  mock-api-proxy --port 9999 --name api1  # Custom port and name');
      console.log('  mock-api-proxy --list                   # Show all instances');
      console.log('  mock-api-proxy --stop api1              # Stop api1 instance\n');
      process.exit(0);
    }
    
    if (arg === '--version' || arg === '-v') {
      console.log(VERSION);
      process.exit(0);
    }
    
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      port = parseInt(args[i + 1]);
      i++;
    }
    
    if ((arg === '--target' || arg === '-t') && args[i + 1]) {
      targetPort = parseInt(args[i + 1]);
      i++;
    }
    
    if ((arg === '--host') && args[i + 1]) {
      targetHost = args[i + 1];
      i++;
    }
    
    if ((arg === '--name' || arg === '-n') && args[i + 1]) {
      name = args[i + 1];
      i++;
    }
    
    if (arg === '--list' || arg === '-l') {
      showInstances();
      process.exit(0);
    }
    
    if (arg === '--update' || arg === '-u') {
      const update = await checkForUpdates();
      if (update) {
        const shouldUpdate = await promptUpdate(update);
        if (shouldUpdate) {
          await performUpdate(update);
        }
      } else {
        console.log(success('You are running the latest version!'));
      }
      process.exit(0);
    }
    
    if (arg === '--no-update-check') {
      config.autoCheckUpdates = false;
    }
    
    if (arg === '--uninstall') {
      // Handled by separate uninstall script
      console.log(info('Please run: mock-api-proxy-uninstall'));
      process.exit(0);
    }
  }
  
  // Check for updates
  if (config.autoCheckUpdates) {
    const update = await checkForUpdates();
    if (update) {
      const shouldUpdate = await promptUpdate(update);
      if (shouldUpdate) {
        const updated = await performUpdate(update);
        if (updated) process.exit(0);
      }
    }
  }
  
  // Start proxy
  const server = createProxy(port, targetHost, targetPort, name);
  
  server.listen(port, () => {
    const ips = getLocalIPs();
    
    console.log(title('🚀 Mock API Local Proxy Running'));
    
    console.log(`${colors.bright}Configuration:${colors.reset}`);
    console.log(`  Name:    ${colors.cyan}${name}${colors.reset}`);
    console.log(`  Proxy:   ${colors.cyan}http://localhost:${port}${colors.reset}`);
    console.log(`  Target:  ${colors.cyan}http://${targetHost}:${targetPort}${colors.reset}\n`);
    
    console.log(`${colors.bright}Use this URL in Mock API Service:${colors.reset}`);
    if (ips.length > 0) {
      ips.forEach(ip => {
        console.log(`  ${colors.green}→ http://${ip.address}:${port}${colors.reset} (${ip.name})`);
      });
    } else {
      console.log(`  ${colors.yellow}⚠ No local network IPs found${colors.reset}`);
    }
    
    console.log(`\n${colors.dim}Press Ctrl+C to stop${colors.reset}\n`);
    
    // Save instance
    const existingIdx = instances.findIndex(i => i.name === name);
    const instanceInfo = {
      name,
      port,
      target: `${targetHost}:${targetPort}`,
      running: true,
      pid: process.pid,
      startedAt: new Date().toISOString()
    };
    
    if (existingIdx >= 0) {
      instances[existingIdx] = instanceInfo;
    } else {
      instances.push(instanceInfo);
    }
    
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(error(`Port ${port} is already in use.`));
      console.log(info(`Try: mock-api-proxy --port ${port + 1}`));
    } else {
      console.log(error(err.message));
    }
    process.exit(1);
  });
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log(`\n${info('Shutting down proxy...')}`);
    
    // Mark as stopped
    const idx = instances.findIndex(i => i.name === name);
    if (idx >= 0) {
      instances[idx].running = false;
      fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
    }
    
    server.close(() => {
      process.exit(0);
    });
  });
};

// Run main
main().catch(err => {
  console.error(error(err.message));
  process.exit(1);
});
