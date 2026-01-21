# Self-Hosted Sync Server

This document describes how to set up and configure a self-hosted sync server for Mock Services.

## Overview

The cloud sync feature allows you to synchronize your mock services data across multiple devices and keep backups in the cloud. By hosting your own sync server, you maintain full control over your data.

## Features

- **Real-time sync**: Changes are automatically synced when online
- **Conflict resolution**: Manual, local-preferred, or remote-preferred conflict resolution
- **Offline support**: Works fully offline; changes sync when back online
- **API key authentication**: Secure access with API keys
- **Self-hosted**: Keep your data on your own infrastructure

## Quick Start with Docker

The easiest way to run a sync server is using Docker:

```bash
# Create a directory for your sync data
mkdir -p /path/to/sync-data

# Run the sync server
docker run -d \
  --name mock-sync-server \
  -p 3001:3001 \
  -v /path/to/sync-data:/app/data \
  -e DATA_DIR=/app/data \
  -e API_KEYS=your-api-key-1,your-api-key-2 \
  -e PORT=3001 \
  ghcr.io/your-org/mock-sync-server:latest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATA_DIR` | Directory to store sync data | `/app/data` |
| `API_KEYS` | Comma-separated list of allowed API keys | (none) |
| `PORT` | Port to listen on | `3001` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## Docker Compose Example

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  sync-server:
    image: ghcr.io/your-org/mock-sync-server:latest
    container_name: mock-sync-server
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - sync-data:/app/data
    environment:
      - DATA_DIR=/app/data
      - API_KEYS=your-api-key-1,your-api-key-2
      - PORT=3001
      - LOG_LEVEL=info

volumes:
  sync-data:
```

Start the server:

```bash
docker-compose up -d
```

## Manual Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the sync server repository
git clone https://github.com/your-org/mock-sync-server.git
cd mock-sync-server

# Install dependencies
npm install

# Build the server
npm run build

# Set environment variables
export DATA_DIR=/path/to/sync-data
export API_KEYS=your-api-key-1,your-api-key-2
export PORT=3001

# Start the server
npm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T00:00:00.000Z"
}
```

### Sync Data

```
POST /api/sync
Headers:
  Authorization: Bearer <api-key>
Content-Type: application/json

{
  "clientId": "unique-client-id",
  "data": {
    "workspaces": [...],
    "projects": [...],
    "collections": [...],
    "folders": [...],
    "requests": [...]
  },
  "lastSyncAt": "2026-01-20T23:00:00.000Z"
}
```

### Get Changes

```
GET /api/sync/changes
Headers:
  Authorization: Bearer <api-key>
Query Parameters:
  since: ISO timestamp (optional)
```

Returns changes since the last sync timestamp.

### Conflict Detection

```
POST /api/sync/resolve
Headers:
  Authorization: Bearer <api-key>
Content-Type: application/json

{
  "conflictId": "conflict-uuid",
  "resolution": "local" | "remote",
  "data": {
    // Resolved data if resolution is "local"
  }
}
```

## Client Configuration

In your Mock Services application, navigate to **Admin > Cloud Sync** and configure:

1. **Server URL**: Your sync server URL (e.g., `https://sync.yourdomain.com`)
2. **API Key**: One of the API keys configured on the server
3. **Auto Sync**: Enable automatic background syncing
4. **Sync Interval**: How often to check for changes (15s - 15min)
5. **Conflict Resolution**: How to handle conflicts

## Security Considerations

1. **Use HTTPS**: Always use HTTPS in production to encrypt data in transit
2. **API Key Management**: Keep API keys secure and rotate them periodically
3. **Firewall**: Only expose the sync port to necessary networks
4. **Rate Limiting**: Configure rate limiting to prevent abuse
5. **Data Backup**: Regularly backup the sync data directory

## Troubleshooting

### Connection Failed

- Verify the server URL is correct and accessible
- Check that the API key matches one configured on the server
- Ensure the server is running and listening on the correct port

### Sync Not Working

- Check if the application is online (navigator.onLine)
- Verify sync is enabled in settings
- Check the sync status in the UI for error messages

### Conflicts Not Resolving

- Navigate to **Admin > Cloud Sync** to resolve conflicts manually
- Ensure you're using the correct conflict resolution strategy

## Data Structure

The sync server stores the following data:

```
/data
├── clients/
│   └── {clientId}.json
├── changes/
│   └── {timestamp}-{clientId}.json
└── conflicts/
    └── {conflictId}.json
```

## Monitoring

Check server health:

```bash
curl http://localhost:3001/api/health
```

View logs:

```bash
docker logs mock-sync-server -f
```

## Production Deployment

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name sync.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Systemd Service

Create `/etc/systemd/system/mock-sync.service`:

```ini
[Unit]
Description=Mock Sync Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mock-sync-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=API_KEYS=your-api-key
Environment=DATA_DIR=/var/lib/mock-sync

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mock-sync
sudo systemctl start mock-sync
```

## Support

- GitHub Issues: https://github.com/your-org/mock-services/issues
- Documentation: https://docs.mock-services.io
