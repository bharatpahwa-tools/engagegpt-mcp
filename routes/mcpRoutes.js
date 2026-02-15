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
      methods: ["oauth2"],
      oauth: {
        authorization_endpoint: `${req.protocol}://${req.get("host")}/mcp/oauth/authorize`,
        token_endpoint: `${req.protocol}://${req.get("host")}/mcp/oauth/token`,
      },
    },
  });
});

router.post(
  "/",
  validateMcpProtocol,
  verifyMcpToken,
  mcpController.handleHttpMcp,
);

router.get(
  "/sse",
  validateMcpProtocol,
  verifyMcpToken,
  mcpController.handleSse,
);

router.post(
  "/message",
  validateMcpProtocol,
  verifyMcpToken,
  mcpController.handleSseMessage,
);

router.delete("/", mcpController.handleMcpDelete);

export default router;
