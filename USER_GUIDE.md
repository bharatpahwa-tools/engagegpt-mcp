# EngageGPT MCP Server - User Guide

## For End Users: Connecting to EngageGPT MCP Server

### Prerequisites

1. You have a Claude Desktop account
2. You have an EngageGPT account with LinkedIn synced
3. You have your EngageGPT connection token

### Getting Your Connection Token

1. Log in to [EngageGPT](https://engagegpt.in)
2. Go to **Settings** → **API & Integrations**
3. Find your **MCP Connection Token**
4. Copy the token (it looks like: `697f89f77f39bdd36f3c3eda-697fb5b00298e1aabcd5d47a-ml433gtt4efl2r47xmi`)

### Configuring Claude Desktop

1. **Locate your Claude Desktop config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Edit the config file** and add:

```json
{
  "mcpServers": {
    "engagegpt": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-http",
        "https://mcp.engagegpt.in/api/v1/mcp"
      ],
      "env": {
        "MCP_CONNECTION_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

3. **Replace `YOUR_TOKEN_HERE`** with your actual connection token

4. **Restart Claude Desktop** (Cmd+Q on Mac, then reopen)

### Using EngageGPT Tools in Claude

Once configured, you can use these tools:

#### 1. **Get Your Writing Style**

```
Use the get_my_persona tool to analyze my LinkedIn writing style
```

#### 2. **Get Engagement Insights**

```
Show me my LinkedIn engagement statistics
```

#### 3. **Draft LinkedIn Posts**

```
Help me draft a LinkedIn post about AI in my writing style
```

### Troubleshooting

#### Tools Not Showing Up

1. Check that you restarted Claude Desktop completely
2. Verify your connection token is correct
3. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`

#### "Connection Token Not Found" Error

- Your token is missing or incorrect in the config
- Get a fresh token from EngageGPT settings

#### Server Connection Failed

- Check your internet connection
- Verify `mcp.engagegpt.in` is accessible
- Contact support if the server is down

### Security Notes

- **Never share your connection token** with anyone
- Your token is personal and tied to your EngageGPT account
- Regenerate your token if you suspect it's been compromised

---

## For Developers: Local Testing

### Local Development Setup

1. **Clone the repository**
2. **Copy `.env.example` to `.env`**
3. **Add your credentials** to `.env`:

   ```bash
   DATABASE=mongodb://...
   REDIS_HOST=...
   REDIS_PASSWORD=...
   MCP_CONNECTION_TOKEN=your-test-token
   ```

4. **Configure Claude Desktop for local testing**:

   ```json
   {
     "mcpServers": {
       "engagegpt-local": {
         "command": "node",
         "args": ["/path/to/EngageGPT MCP/mcp-stdio.js"]
       }
     }
   }
   ```

5. **Restart Claude Desktop**

### Production Deployment

1. **Deploy to server** (e.g., `mcp.engagegpt.in`)
2. **Set environment variables** (without `MCP_CONNECTION_TOKEN`)
3. **Start HTTP server**: `npm start`
4. **Users connect** via HTTP client with their own tokens

---

**Need Help?** Contact support@engagegpt.in
