/**
 * MCP JSON-RPC Error Utilities
 *
 * Standardized error responses following JSON-RPC 2.0 specification.
 * Based on SimpleScraper's error handling patterns.
 */

// MCP Error Codes (following JSON-RPC 2.0 spec)
export const MCP_ERROR_CODES = {
  MISSING_TOKEN: -32000,
  INVALID_TOKEN: -32001,
  DATABASE_ERROR: -32002,
  BAD_REQUEST: -32003,
  INTERNAL_ERROR: -32603,
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
};

/**
 * Create a standardized MCP error response
 * @param {number} code - Error code (use MCP_ERROR_CODES constants)
 * @param {string} message - Human-readable error message
 * @param {any} id - JSON-RPC request ID (can be null)
 * @returns {object} JSON-RPC 2.0 error response
 */
export function createMcpError(code, message, id = null) {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
    },
    id,
  };
}

/**
 * Create a missing token error response
 * @param {any} id - JSON-RPC request ID
 * @returns {object} Error response
 */
export function createMissingTokenError(id = null) {
  return createMcpError(
    MCP_ERROR_CODES.MISSING_TOKEN,
    "Missing Bearer token",
    id,
  );
}

/**
 * Create an invalid token error response
 * @param {any} id - JSON-RPC request ID
 * @returns {object} Error response
 */
export function createInvalidTokenError(id = null) {
  return createMcpError(
    MCP_ERROR_CODES.INVALID_TOKEN,
    "Invalid or expired token",
    id,
  );
}

/**
 * Create a database error response
 * @param {any} id - JSON-RPC request ID
 * @returns {object} Error response
 */
export function createDatabaseError(id = null) {
  return createMcpError(
    MCP_ERROR_CODES.DATABASE_ERROR,
    "Database error during authentication",
    id,
  );
}

/**
 * Create a bad request error response
 * @param {string} message - Specific error message
 * @param {any} id - JSON-RPC request ID
 * @returns {object} Error response
 */
export function createBadRequestError(message, id = null) {
  return createMcpError(MCP_ERROR_CODES.BAD_REQUEST, message, id);
}

/**
 * Create an internal error response
 * @param {string} message - Specific error message
 * @param {any} id - JSON-RPC request ID
 * @returns {object} Error response
 */
export function createInternalError(message, id = null) {
  return createMcpError(
    MCP_ERROR_CODES.INTERNAL_ERROR,
    message || "Internal server error",
    id,
  );
}

/**
 * Extract RPC ID from request body
 * @param {object} body - Request body
 * @returns {any} RPC ID or null
 */
export function extractRpcId(body) {
  return body && body.id !== undefined ? body.id : null;
}
