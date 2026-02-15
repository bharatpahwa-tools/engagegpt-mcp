import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, ".env");
console.error(`[Stdio MCP] Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./config/mcpConfig.js";

async function main() {
  try {
    console.error(
      "[Stdio MCP] Starting EngageGPT MCP server for Claude Desktop...",
    );

    // Create MCP server instance (without user context for stdio mode)
    const mcp = createMcpServer();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect transport to MCP server
    await mcp.connect(transport);

    console.error("[Stdio MCP] Server started and connected successfully");
    console.error(
      "[Stdio MCP] Available tools: get_my_persona, get_engagement_insights",
    );
    console.error("[Stdio MCP] Available prompts: draft-linkedin-post");
  } catch (error) {
    console.error("[Stdio MCP] Fatal error:", error);
    process.exit(1);
  }
}

main();
