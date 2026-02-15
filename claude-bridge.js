import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
async function main() {
  try {
    console.error("[Bridge] Starting EngageGPT MCP bridge...");

    // Create stdio transport for Claude Desktop
    const transport = new StdioClientTransport();

    // Create client
    const client = new Client(
      {
        name: "engagegpt-bridge",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    // Connect to stdio
    await client.connect(transport);

    console.error("[Bridge] Connected successfully");

    // Keep the process running
    process.on("SIGINT", () => {
      console.error("[Bridge] Shutting down...");
      process.exit(0);
    });
  } catch (error) {
    console.error("[Bridge] Error:", error);
    process.exit(1);
  }
}

main();
