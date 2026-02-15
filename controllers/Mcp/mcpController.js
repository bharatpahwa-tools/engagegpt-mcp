import { createMcpServer } from "../../config/mcpConfig.js";
import {
  createAndConnectTransport,
  generateSessionId,
  getTransport,
  cleanupSession,
  createSseSession,
} from "../../utils/sessionManager.js";
import {
  createBadRequestError,
  createInternalError,
  extractRpcId,
} from "../../utils/mcpErrors.js";

export const handleHttpMcp = async (req, res) => {
  console.error(`[DEBUG] handleHttpMcp called: ${req.method} ${req.path}`);
  const body = req.body;
  const rpcId = extractRpcId(body);
  console.log("INSIDE HANDLING REQUEST - ", req.body);

  console.log(
    `[MCP] Request: ${req.method} ${req.path} from ${req.user?.email || "anonymous"}`,
  );

  try {
    const clientSessionIdHeader = req.headers["mcp-session-id"];
    const actualClientSessionId = Array.isArray(clientSessionIdHeader)
      ? clientSessionIdHeader[0]
      : clientSessionIdHeader;

    let transport;
    let effectiveSessionId;

    const isInitRequest = body && body.method === "initialize";

    if (isInitRequest) {
      effectiveSessionId = generateSessionId();
      console.log(`[MCP] 🆕 Creating new session: ${effectiveSessionId}`);
      const mcp = createMcpServer({
        user: req.user,
      });

      transport = await createAndConnectTransport(effectiveSessionId, mcp);
      res.setHeader("Mcp-Session-Id", effectiveSessionId);
    } else if (actualClientSessionId && getTransport(actualClientSessionId)) {
      transport = getTransport(actualClientSessionId);
      effectiveSessionId = actualClientSessionId;
      console.log(`[MCP] ♻️  Reusing session: ${effectiveSessionId}`);
    } else {
      console.error(`[MCP] ❌ No valid session ID for non-initialize request`);
      return res
        .status(400)
        .json(
          createBadRequestError(
            "Bad Request: No valid session ID for non-initialize request.",
            rpcId,
          ),
        );
    }

    req.headers["mcp-session-id"] = effectiveSessionId;
    res.setHeader("Mcp-Session-Id", effectiveSessionId);
    await transport.handleRequest(req, res, body);
    console.log(`[MCP] ✅ Request handled successfully`);
  } catch (error) {
    console.error("[MCP] ❌ Error:", error);

    if (!res.headersSent) {
      res
        .status(500)
        .json(
          createInternalError(
            "Internal server error during MCP request handling",
            rpcId,
          ),
        );
    }
  }
};

export const handleMcpDelete = async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (!sessionId) {
    return res.status(400).json({
      error: "Missing Mcp-Session-Id header",
    });
  }

  if (getTransport(sessionId)) {
    console.log(`[MCP] 🗑️  Deleting session: ${sessionId}`);
    cleanupSession(sessionId);
    return res.status(204).end();
  } else {
    console.log(`[MCP] ❌ Session not found: ${sessionId}`);
    return res.status(404).json({
      error: "Session not found",
    });
  }
};

export const handleSse = async (req, res) => {
  console.log(`[SSE] 🔌 New SSE connection request from ${req.ip}`);
  try {
    const mcp = createMcpServer({ user: req.user });
    const { sessionId } = await createSseSession(res, mcp);
    console.log(`[SSE] ✅ SSE Session established: ${sessionId}`);
  } catch (error) {
    console.error(`[SSE] ❌ Failed to establish SSE session:`, error);
    if (!res.headersSent) res.status(500).end();
  }
};

export const handleSseMessage = async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log(`[SSE] 📨 Message received for session: ${sessionId}`);

  if (!sessionId) {
    return res.status(400).send("Missing sessionId parameter");
  }

  const transport = getTransport(sessionId);
  if (!transport) {
    console.log(`[SSE] ❌ Session not found: ${sessionId}`);
    return res.status(404).send("Session not found");
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
    console.log(`[SSE] ✅ Message handled for session: ${sessionId}`);
  } catch (error) {
    console.error(`[SSE] ❌ Error handling message:`, error);
    if (!res.headersSent) res.status(500).send(error.message);
  }
};
