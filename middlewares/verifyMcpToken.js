import catchAsync from "../utils/catchAsync.js";
import User from "../models/members.js";
import OAuthToken from "../models/oauthToken.js";
import {
  createMissingTokenError,
  createInvalidTokenError,
  createDatabaseError,
  extractRpcId,
} from "../utils/mcpErrors.js";

const envOrigins = process.env.MCP_ALLOWED_ORIGINS
  ? process.env.MCP_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

export const verifyMcpToken = catchAsync(async (req, res, next) => {
  console.error(`[DEBUG] verifyMcpToken called: ${req.method} ${req.path}`);
  const authHeader = req.headers.authorization;
  const rpcId = extractRpcId(req.body);
  const baseUrl = getBaseUrl(req);
  let user;
  console.log("HEADERS - ", req.headers);
  console.log("BODY - ", req.body);

  // Check for Bearer token in Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.split(" ")[1];
    try {
      // Find valid access token
      const tokenRecord = await OAuthToken.findOne({
        accessToken,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      }).populate("userId");

      if (tokenRecord) {
        req.auth = {
          token: accessToken,
          clientId: tokenRecord.clientId,
          scopes: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
          userId: tokenRecord.userId._id,
        };
        req.user = tokenRecord.userId;
        console.log("AUTH DETAILS - ", req.auth);
        console.log(
          "OAUTH TOKEN VALIDATED - ",
          req.user.name || req.user.email,
        );
        return next();
      }
    } catch (error) {
      console.error("[Auth] Error validating OAuth token:", error);
    }
  }

  // Fallback to connection token (legacy/direct method)
  const token =
    req.headers["x-engage-gpt-mcp-token"] ||
    req.headers["mcp-connection-token"] ||
    req.query.token ||
    process.env.MCP_CONNECTION_TOKEN;

  if (!token) {
    const wwwAuthHeader = `Bearer realm="MCP Server", resource_metadata_uri="${baseUrl}/.well-known/oauth-protected-resource"`;
    return res
      .status(401)
      .header("WWW-Authenticate", wwwAuthHeader)
      .json(createMissingTokenError(rpcId));
  }

  try {
    user = await User.findOne({ connectionToken: token });

    if (!user) {
      return res.status(401).json(createInvalidTokenError(rpcId));
    }

    req.auth = {
      token: token,
      clientId: "connection-token",
      scopes: ["mcp:tools", "mcp:prompts"],
      userId: user._id,
    };
  } catch (dbError) {
    console.error(
      "[Auth] Database error during connection token validation:",
      dbError,
    );
    return res.status(500).json(createDatabaseError(rpcId));
  }

  req.user = user;
  console.log("AUTH DETAILS - ", req.auth);
  console.log("CONNECTION TOKEN FOUND - ", req.user.name);
  next();
});

const ALLOWED_ORIGINS = ["vscode-webview://", ...envOrigins];

export const validateMcpProtocol = (req, res, next) => {
  const origin = req.headers.origin;
  console.log("ORIGIN - ", req.headers.origin);

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
