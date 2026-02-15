import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/members.js";

const envOrigins = process.env.MCP_ALLOWED_ORIGINS
  ? process.env.MCP_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

export const verifyMcpToken = catchAsync(async (req, res, next) => {
  // Check for connection token in headers, query params, or environment variable
  const token =
    req.headers["x-engage-gpt-mcp-token"] ||
    req.headers["mcp-connection-token"] ||
    req.query.token ||
    process.env.MCP_CONNECTION_TOKEN;

  if (!token) {
    return next(
      new AppError("No connection token provided. Access denied.", 401),
    );
  }

  const user = await User.findOne({ connectionToken: token });

  if (!user) {
    return next(new AppError("Invalid connection token.", 401));
  }

  req.user = user;
  next();
});

const ALLOWED_ORIGINS = ["vscode-webview://", ...envOrigins];

export const validateMcpProtocol = (req, res, next) => {
  const origin = req.headers.origin;

  // 1. SECURITY: Origin Validation (Prevent DNS Rebinding)
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    console.error(
      `[MCP Security] Blocked request from unauthorized origin: ${origin}`,
    );
    return res.status(403).json({
      jsonrpc: "2.0",
      error: { code: -32003, message: "Forbidden: Invalid Origin" },
    });
  }

  // 2. PROTOCOL: Version Validation & Header setup
  const protocolVersion = req.headers["mcp-protocol-version"] || "2025-11-25";

  // Apply protocol-specific headers to the response early
  res.setHeader("MCP-Protocol-Version", protocolVersion);
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  next();
};
