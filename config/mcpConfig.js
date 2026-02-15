import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as mcpService from "../services/Mcp/mcpService.js";

const sessionContextMap = new Map();
const activeTransports = new Map();

export function createMcpServer({ user } = {}) {
  const mcp = new McpServer({
    name: "EngageGPT",
    version: "1.0.0",
  });

  mcp.registerTool(
    "get_my_persona",
    {
      description:
        "Fetches your LinkedIn post history and analysis to help Claude write in your specific style.",
      inputSchema: {},
    },
    async (_args, context) => {
      // Works for BOTH:
      // - SSE (sessionId)
      // - HTTP (context.user)
      // - Stdio (environment variable)
      const userFromSession = sessionContextMap.get(context.sessionId)?.user;

      const effectiveUser = userFromSession || context.user || user;

      try {
        // For stdio mode (Claude Desktop), use environment variable
        const connectionToken =
          effectiveUser?.connectionToken || process.env.MCP_CONNECTION_TOKEN;

        if (!connectionToken) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "MCP Connection Token not found. Please sync your LinkedIn account or set MCP_CONNECTION_TOKEN environment variable.",
              },
            ],
          };
        }

        const personaData = await mcpService.getPersonaContext(connectionToken);

        return {
          content: [{ type: "text", text: personaData }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    },
  );

  mcp.registerTool(
    "get_engagement_insights",
    {
      description:
        "Provides high-level statistics and insights about your LinkedIn engagement history.",
      inputSchema: {},
    },
    async (_args, context) => {
      const userFromSession = sessionContextMap.get(context.sessionId)?.user;

      const effectiveUser = userFromSession || context.user || user;

      try {
        // For stdio mode (Claude Desktop), use environment variable
        const connectionToken =
          effectiveUser?.connectionToken || process.env.MCP_CONNECTION_TOKEN;

        if (!connectionToken) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "No connection token found. Please set MCP_CONNECTION_TOKEN environment variable.",
              },
            ],
          };
        }

        const insights =
          await mcpService.getEngagementInsights(connectionToken);

        return {
          content: [{ type: "text", text: insights }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error.message,
            },
          ],
        };
      }
    },
  );

  mcp.registerPrompt(
    "draft-linkedin-post",
    {
      topic: z
        .string()
        .describe("The specific topic or news you want to post about"),
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please draft a LinkedIn post about "${args.topic}". Use my writing style found in my persona resource.`,
          },
        },
      ],
    }),
  );

  return mcp;
}
export { sessionContextMap, activeTransports };
