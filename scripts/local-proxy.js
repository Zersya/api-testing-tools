#!/usr/bin/env node

/**
 * Local Development Proxy for Mock API Service
 * 
 * This script allows backend engineers to test their local APIs
 * when using a Mock API Service.
 * 
 * Problem: The production server often runs in Docker or a different network
 * and cannot access engineers' local machines (localhost/127.0.0.1).
 * 
 * Solution: This proxy runs on the engineer's machine and creates
 * a bridge between the production app and their local API.
 * 
 * Usage:
 *   npx mock-api-local-proxy
 *   
 * Or install globally:
 *   npm install -g mock-api-local-proxy
 *   mock-api-local-proxy
 */

const http = require('http');
const https = require('https');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.mock-api-proxy.json');

// Default configuration
let config = {
  localPort: 8765,  // Port for this proxy server
  targetPort: 8080, // Default local API port
  targetHost: 'localhost',
  verbose: false
};

// Load config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config = { ...config, ...saved };
    console.log('📄 Loaded config from', CONFIG_FILE);
  } catch (e) {
    console.warn('⚠️  Could not load config file');
  }
}

// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 Mock API Local Proxy

Usage: mock-api-local-proxy [options]

Options:
  --port, -p <number>     Proxy server port (default: ${config.localPort})
  --target, -t <url>     Target local API (default: http://${config.targetHost}:${config.targetPort})
  --verbose, -v          Show detailed logs
  --save, -s             Save config for future runs
  --help, -h             Show this help

Examples:
  # Use default settings (proxy :8765 → localhost:8080)
  mock-api-local-proxy

  # Custom target port
  mock-api-local-proxy --target http://localhost:3000

  # Different proxy port
  mock-api-local-proxy --port 9999

  # Save settings for next time
  mock-api-local-proxy --target http://localhost:3000 --save

Setup in Mock API Service:
  1. Run this proxy on your machine
  2. In the app, use this URL for your local API:
     http://YOUR_IP:${config.localPort}
     
     (Replace YOUR_IP with your machine's local IP, e.g., 192.168.1.100)
`);
  process.exit(0);
}

// Parse args
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if ((arg === '--port' || arg === '-p') && args[i + 1]) {
    config.localPort = parseInt(args[i + 1]);
    i++;
  } else if ((arg === '--target' || arg === '-t') && args[i + 1]) {
    const target = args[i + 1];
    const match = target.match(/http:\/\/([^:]+):(\d+)/);
    if (match) {
      config.targetHost = match[1];
      config.targetPort = parseInt(match[2]);
    }
    i++;
  } else if (arg === '--verbose' || arg === '-v') {
    config.verbose = true;
  } else if (arg === '--save' || arg === '-s') {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('💾 Config saved to', CONFIG_FILE);
  }
}

// Get local IP addresses
function getLocalIPs() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// Create proxy server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Get the target path from the URL
  const targetPath = req.url || '/';
  
  // Build target URL
  const targetUrl = `http://${config.targetHost}:${config.targetPort}${targetPath}`;
  
  if (config.verbose) {
    console.log(`${new Date().toISOString()} → ${req.method} ${targetUrl}`);
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  
  req.on('end', () => {
    // Parse target URL
    const parsed = parse(targetUrl);
    
    // Prepare request options
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${config.targetHost}:${config.targetPort}`
      }
    };
    
    // Remove problematic headers
    delete options.headers.origin;
    delete options.headers['access-control-request-private-network'];
    
    // Make request to local API
    const proxyReq = http.request(options, (proxyRes) => {
      // Copy response headers
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      
      if (config.verbose) {
        console.log(`${new Date().toISOString()} ← ${proxyRes.statusCode} ${targetUrl}`);
      }
      
      // Stream response back
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error(`❌ Error proxying to ${targetUrl}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway',
        message: `Cannot connect to ${config.targetHost}:${config.targetPort}`,
        details: err.message
      }));
    });
    
    // Send body if present
    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(config.localPort, () => {
  const ips = getLocalIPs();
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Mock API Local Proxy Running                            ║
╠════════════════════════════════════════════════════════════╣
║  Proxy Port:    ${config.localPort.toString().padEnd(45)}║
║  Target:         http://${config.targetHost}:${config.targetPort}${''.padEnd(34)}║
╠════════════════════════════════════════════════════════════╣
║  Use this URL in Mock API Service:                          ║`);

  ips.forEach(ip => {
    console.log(`║  http://${ip}:${config.localPort}${''.padEnd(52)}║`);
  });
  
  console.log(`╠════════════════════════════════════════════════════════════╣
║  Instructions:                                              ║
║  1. Keep this running                                       ║
║  2. In Mock API Service, use your IP address above          ║
║  3. Example: http://192.168.1.100:${config.localPort}/api    ║
╠════════════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop                                       ║
╚════════════════════════════════════════════════════════════╝
`);

  if (!ips.length) {
    console.log('⚠️  No local network IPs found. Make sure you\'re connected to a network.');
  }
  
  if (config.verbose) {
    console.log('📝 Verbose logging enabled');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.localPort} is already in use.`);
    console.log('   Try: mock-api-local-proxy --port ' + (config.localPort + 1));
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down proxy server...');
  server.close(() => {
    process.exit(0);
  });
});
