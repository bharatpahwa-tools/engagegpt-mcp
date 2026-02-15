import express from "express";
import * as mcpController from "../controllers/Mcp/mcpController.js";
import {
  verifyMcpToken,
  validateMcpProtocol,
} from "../middlewares/verifyMcpToken.js";

const router = express.Router();

// Single endpoint handles all MCP requests (GET and POST)
router.all(
  "/",
  validateMcpProtocol,
  verifyMcpToken,
  mcpController.handleHttpMcp,
);

export default router;
