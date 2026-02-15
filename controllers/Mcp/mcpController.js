import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../../config/mcpConfig.js";

export const handleHttpMcp = async (req, res) => {
  console.log(
    `[MCP] Request: ${req.method} ${req.path} from ${req.user?.email || "anonymous"}`,
  );

  try {
    // Create a new MCP server instance with user context
    const mcp = createMcpServer({
      user: req.user,
    });

    // Create transport with user context
    const transport = new StreamableHTTPServerTransport({
      context: {
        user: req.user,
      },
    });

    // Connect transport to MCP server
    await mcp.connect(transport);

    // Handle the HTTP request with pre-parsed body (Express already parsed it)
    await transport.handleRequest(req, res, req.body);

    console.log(`[MCP] Request handled successfully`);
  } catch (error) {
    console.error("[MCP] Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: error.message || "MCP server error",
        },
      });
    }
  }
};
