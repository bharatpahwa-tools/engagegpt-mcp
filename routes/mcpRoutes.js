import express from "express";
import * as mcpController from "../controllers/Mcp/mcpController.js";
import {
  verifyMcpToken,
  validateMcpProtocol,
} from "../middlewares/verifyMcpToken.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    protocol: "mcp",
    server: "EngageGPT MCP Server",
    capabilities: {
      tools: ["get_my_persona", "get_engagement_insights"],
      prompts: ["draft-linkedin-post"],
    },
    authentication: {
      methods: ["connection_token"],
      description: "Use MCP_CONNECTION_TOKEN environment variable",
    },
  });
});

router.post(
  "/",
  validateMcpProtocol,
  verifyMcpToken,
  mcpController.handleHttpMcp,
);

export default router;
