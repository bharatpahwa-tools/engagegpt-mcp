import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { v4 as uuidv4 } from "uuid";

export const transports = new Map();
export const pendingTransports = new Map();

// Helper to store SSE transports specifically if needed,
// though we can share the main 'transports' map if IDs don't collide.
// SSEServerTransport generates UUIDs, so collision is unlikely.

export async function createSseSession(res, mcpServer) {
  // 1. Create Transport
  // The first argument is the endpoint where clients should POST messages
  const transport = new SSEServerTransport("/mcp/message", res);
  const sessionId = transport.sessionId;

  console.log(`[Session] Creating new SSE transport: ${sessionId}`);

  // 2. Setup cleanup
  transport.onclose = () => {
    console.log(`[Session] SSE Transport closed: ${sessionId}`);
    cleanupSession(sessionId);
  };

  // 3. Store transport
  transports.set(sessionId, transport);

  // 4. Connect to MCP Server
  try {
    await mcpServer.connect(transport);
    console.log(`[Session] SSE Transport connected successfully: ${sessionId}`);
  } catch (error) {
    console.error(
      `[Session] Failed to connect SSE transport: ${sessionId}`,
      error,
    );
    transports.delete(sessionId);
    throw error;
  }

  return { sessionId, transport };
}

export async function createAndConnectTransport(sessionId, mcpServer) {
  // Check if transport already exists or is being created
  if (pendingTransports.has(sessionId) || transports.has(sessionId)) {
    console.log(
      `[Session] Reusing existing transport for session: ${sessionId}`,
    );
    return pendingTransports.get(sessionId) || transports.get(sessionId);
  }

  console.log(`[Session] Creating new transport for session: ${sessionId}`);

  // Create new transport
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
    eventSourceEnabled: true,
    onsessioninitialized: (actualId) => {
      console.log(`[Session] Transport initialized: ${actualId}`);
      pendingTransports.delete(actualId);
    },
  });

  // Set cleanup handler
  transport.onclose = () => {
    console.log(`[Session] Transport closed for session: ${sessionId}`);
    cleanupSession(sessionId);
  };

  // Track pending transport
  pendingTransports.set(sessionId, transport);
  transports.set(sessionId, transport);

  // Connect to MCP server
  try {
    await mcpServer.connect(transport);
    console.log(`[Session] Transport connected successfully: ${sessionId}`);
  } catch (error) {
    console.error(`[Session] Failed to connect transport: ${sessionId}`, error);
    pendingTransports.delete(sessionId);
    transports.delete(sessionId);
    throw error;
  }

  return transport;
}

export function cleanupSession(sessionId) {
  if (transports.has(sessionId)) {
    console.log(`[Session] Cleaning up session: ${sessionId}`);
    transports.delete(sessionId);
  }
  if (pendingTransports.has(sessionId)) {
    pendingTransports.delete(sessionId);
  }
}

export function getActiveSessionCount() {
  return transports.size;
}

export function getTransport(sessionId) {
  return transports.get(sessionId);
}

export function generateSessionId() {
  return uuidv4();
}
