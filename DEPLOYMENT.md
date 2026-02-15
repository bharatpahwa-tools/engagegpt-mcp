# Production Deployment Guide

## Deploying to mcp.engagegpt.in

### Prerequisites

1. Server with Node.js installed
2. Domain `mcp.engagegpt.in` configured
3. SSL certificate for HTTPS
4. MongoDB and Redis accessible from server

### Environment Variables

Create `.env` file on production server:

```bash
# Server Configuration
PORT=8080
NODE_ENV=production
TZ=UTC

# CORS Configuration
CORS_ORIGINS=https://engagegpt.in,https://www.engagegpt.in
MCP_ALLOWED_ORIGINS=https://engagegpt.in,https://www.engagegpt.in
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,x-engage-gpt-mcp-token,mcp-protocol-version,mcp-connection-token

# Database Configuration
DATABASE=mongodb+srv://your-production-db-connection-string

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# DO NOT SET MCP_CONNECTION_TOKEN - users provide their own
```

### Deployment Steps

1. **Clone repository**:

   ```bash
   git clone https://github.com/your-org/engagegpt-mcp.git
   cd engagegpt-mcp
   ```

2. **Install dependencies**:

   ```bash
   npm install --production
   ```

3. **Create .env file** with production values

4. **Start server**:

   ```bash
   # Using PM2 (recommended)
   pm2 start server.js --name engagegpt-mcp
   pm2 save
   pm2 startup

   # Or using systemd
   sudo systemctl start engagegpt-mcp
   ```

5. **Configure Nginx** (reverse proxy):

   ```nginx
   server {
       listen 443 ssl http2;
       server_name mcp.engagegpt.in;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;

           # Important for SSE
           proxy_buffering off;
           proxy_read_timeout 86400;
       }
   }
   ```

6. **Test deployment**:
   ```bash
   curl https://mcp.engagegpt.in/api/v1/health
   ```

### User Configuration

Users configure Claude Desktop with:

```json
{
  "mcpServers": {
    "engagegpt": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-http",
        "https://mcp.engagegpt.in"
      ],
      "env": {
        "MCP_CONNECTION_TOKEN": "user-token-from-engagegpt-settings"
      }
    }
  }
}
```

### Monitoring

1. **Check logs**:

   ```bash
   pm2 logs engagegpt-mcp
   ```

2. **Monitor health**:

   ```bash
   curl https://mcp.engagegpt.in/api/v1/health
   ```

3. **Check connections**:
   - MongoDB: Verify connection in logs
   - Redis: Check Redis connection status

### Troubleshooting

#### Server won't start

- Check `.env` file exists and has correct values
- Verify MongoDB and Redis are accessible
- Check port 8080 is not in use

#### Users can't connect

- Verify SSL certificate is valid
- Check CORS settings in `.env`
- Verify user's connection token is valid

#### Tools not working

- Check MongoDB connection
- Verify user has LinkedIn synced
- Check server logs for errors

### Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (not in git)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] MongoDB connection uses authentication
- [ ] Redis connection uses password
- [ ] Server firewall configured
- [ ] Regular security updates applied

### Rollback Plan

If deployment fails:

1. **Stop new server**:

   ```bash
   pm2 stop engagegpt-mcp
   ```

2. **Restore previous version**:

   ```bash
   git checkout previous-stable-tag
   npm install
   pm2 restart engagegpt-mcp
   ```

3. **Notify users** of temporary downtime

---

## Local Testing Before Production

Before deploying, test locally with production-like setup:

1. **Test HTTP server**:

   ```bash
   npm start
   ```

2. **Test with curl**:

   ```bash
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -H "x-engage-gpt-mcp-token: your-test-token" \
     -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
   ```

3. **Test with MCP HTTP client**:
   Configure Claude Desktop to use `http://localhost:8080` first

4. **Verify all tools work** before deploying to production
