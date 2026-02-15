import crypto from "crypto";
import OAuthToken from "../../models/oauthToken.js";
import User from "../../models/members.js";

const generateToken = () => {
  return crypto.randomBytes(32).toString("base64url");
};

export const authorize = async (req, res) => {
  try {
    console.log("\n[OAuth] 🔐 AUTHORIZE endpoint called");
    console.log(`[OAuth] URL: ${req.originalUrl}`);
    const {
      client_id,
      redirect_uri,
      state,
      scope,
      code_challenge,
      code_challenge_method,
      connectionToken,
    } = req.query;
    console.log("[OAuth] Request parameters:", {
      client_id,
      redirect_uri,
      state,
      scope,
      code_challenge: code_challenge ? "present" : "missing",
      code_challenge_method,
      connectionToken: connectionToken ? "present (hidden)" : "missing",
    });

    // Check if this is a direct authorization with connection token
    if (connectionToken) {
      console.log("[OAuth] 🔄 Direct authorization flow detected");
      if (!client_id || !redirect_uri || !state) {
        console.log("[OAuth] ❌ Missing required OAuth parameters");
        return res.status(400).json({
          error: "invalid_request",
          error_description:
            "Missing required parameters: client_id, redirect_uri, state",
        });
      }

      console.log("[OAuth] 🔍 Verifying connection token...");
      const user = await User.findOne({ connectionToken });
      console.log(
        "[OAuth] User lookup result:",
        user ? `Found user: ${user.email || user._id}` : "User not found",
      );

      if (!user) {
        console.log("[OAuth] ❌ Invalid connection token");
        return res.status(401).json({
          error: "access_denied",
          error_description: "Invalid connection token",
        });
      }

      console.log("[OAuth] ✅ Connection token verified");
      // Generate authorization code
      const authCode = generateToken();
      console.log(
        "[OAuth] 🎫 Generated authorization code:",
        authCode.substring(0, 10) + "...",
      );

      console.log("[OAuth] 💾 Storing authorization code in database...");
      // Store authorization code with PKCE challenge (expires in 10 minutes)
      await OAuthToken.create({
        userId: user._id,
        accessToken: authCode,
        tokenType: "authorization_code",
        scope: scope || "mcp:tools mcp:prompts",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        clientId: client_id,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
      });
      console.log("[OAuth] ✅ Authorization code stored successfully");

      // Redirect back to client with authorization code
      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", authCode);
      callbackUrl.searchParams.set("state", state);
      console.log("[OAuth] 🔀 Redirecting to:", callbackUrl.toString());

      return res.redirect(callbackUrl.toString());
    }

    console.log("[OAuth] 📝 Standard OAuth flow - serving HTML form");
    // Standard OAuth flow - validate parameters and serve HTML form
    if (!client_id || !redirect_uri || !state) {
      console.log("[OAuth] ❌ Missing required OAuth parameters");
      return res.status(400).json({
        error: "invalid_request",
        error_description:
          "Missing required parameters: client_id, redirect_uri, state",
      });
    }

    console.log("[OAuth] 🔍 Validating redirect URI...");
    // Validate redirect URI (must be HTTPS or localhost)
    const redirectUrl = new URL(redirect_uri);
    if (
      redirectUrl.protocol !== "https:" &&
      !redirectUrl.hostname.includes("localhost")
    ) {
      console.log(
        "[OAuth] ❌ Invalid redirect URI protocol:",
        redirectUrl.protocol,
      );
      return res.status(400).json({
        error: "invalid_request",
        error_description: "redirect_uri must use HTTPS or localhost",
      });
    }
    console.log("[OAuth] ✅ Redirect URI validated");

    // PKCE is optional but recommended
    // If provided, validate that it uses S256
    if (code_challenge && code_challenge_method !== "S256") {
      console.log("[OAuth] ❌ Invalid PKCE method:", code_challenge_method);
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Only S256 code_challenge_method is supported",
      });
    }

    console.log("[OAuth] 📄 Serving authorize.html form");
    // Serve the custom authorization page
    // User will enter their connection token here
    res.sendFile("authorize.html", { root: "./public" });
  } catch (error) {
    console.error("[OAuth] Authorization error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
};

export const callback = async (req, res) => {
  try {
    console.log("\n[OAuth] 📞 CALLBACK endpoint called");
    const {
      connectionToken,
      code_challenge,
      code_challenge_method,
      state,
      redirect_uri,
      client_id,
    } = req.query;
    console.log("[OAuth] Callback parameters:", {
      connectionToken: connectionToken ? "present (hidden)" : "missing",
      code_challenge: code_challenge ? "present" : "missing",
      code_challenge_method,
      state,
      redirect_uri,
      client_id,
    });

    if (!connectionToken) {
      console.log("[OAuth] ❌ Missing connection token");
      return res.status(400).send("Missing connection token");
    }

    console.log("[OAuth] 🔍 Verifying connection token...");
    // Verify the connection token
    const user = await User.findOne({ connectionToken });
    console.log(
      "[OAuth] User lookup result:",
      user ? `Found user: ${user.email || user._id}` : "User not found",
    );

    if (!user) {
      console.log("[OAuth] ❌ Invalid connection token");
      return res.status(401).send("Invalid connection token");
    }

    console.log("[OAuth] ✅ Connection token verified");
    // Generate authorization code
    const authCode = generateToken();
    console.log(
      "[OAuth] 🎫 Generated authorization code:",
      authCode.substring(0, 10) + "...",
    );

    console.log("[OAuth] 💾 Storing authorization code in database...");
    // Store authorization code with PKCE challenge (expires in 10 minutes)
    await OAuthToken.create({
      userId: user._id,
      accessToken: authCode,
      tokenType: "authorization_code",
      scope: "mcp:tools mcp:prompts",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      clientId: client_id,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    });
    console.log("[OAuth] ✅ Authorization code stored successfully");

    // Redirect back to client with authorization code
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", authCode);
    callbackUrl.searchParams.set("state", state);
    console.log("[OAuth] 🔀 Redirecting to:", callbackUrl.toString());

    res.redirect(callbackUrl.toString());
  } catch (error) {
    console.error("[OAuth] Callback error:", error);
    res.status(500).send("Internal server error");
  }
};

export const token = async (req, res) => {
  try {
    console.log("\n[OAuth] 🎟️  TOKEN endpoint called");
    const { grant_type, code, redirect_uri, client_id, code_verifier } =
      req.body;
    console.log("[OAuth] Token request parameters:", {
      grant_type,
      code: code ? code.substring(0, 10) + "..." : "missing",
      redirect_uri,
      client_id,
      code_verifier: code_verifier ? "present (hidden)" : "missing",
    });

    // Validate grant type
    if (grant_type !== "authorization_code") {
      console.log("[OAuth] ❌ Unsupported grant type:", grant_type);
      return res.status(400).json({
        error: "unsupported_grant_type",
        error_description: "Only authorization_code grant type is supported",
      });
    }

    // Validate required parameters
    if (!code || !redirect_uri || !client_id || !code_verifier) {
      console.log("[OAuth] ❌ Missing required parameters");
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing required parameters",
      });
    }

    console.log("[OAuth] 🔍 Looking up authorization code...");
    // Find authorization code
    const authCodeRecord = await OAuthToken.findOne({
      accessToken: code,
      tokenType: "authorization_code",
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!authCodeRecord) {
      console.log("[OAuth] ❌ Authorization code not found or expired");
      return res.status(400).json({
        error: "invalid_grant",
        error_description: "Invalid or expired authorization code",
      });
    }
    console.log(
      "[OAuth] ✅ Authorization code found for user:",
      authCodeRecord.userId?.email || authCodeRecord.userId?._id,
    );

    // Verify PKCE code_verifier
    if (authCodeRecord.codeChallenge) {
      console.log("[OAuth] 🔐 Verifying PKCE code_verifier...");
      const hash = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest("base64url");

      if (hash !== authCodeRecord.codeChallenge) {
        console.log("[OAuth] ❌ PKCE verification failed");
        return res.status(401).json({
          error: "invalid_grant",
          error_description: "Invalid code_verifier",
        });
      }
      console.log("[OAuth] ✅ PKCE verification successful");
    }

    console.log("[OAuth] 🗑️  Revoking authorization code (one-time use)...");
    // Revoke the authorization code (one-time use)
    authCodeRecord.isRevoked = true;
    await authCodeRecord.save();
    console.log("[OAuth] ✅ Authorization code revoked");

    console.log("[OAuth] 🎫 Generating access and refresh tokens...");
    // Generate access token
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const expiresIn = 30 * 24 * 3600; // 30 days
    console.log("[OAuth] Access token:", accessToken.substring(0, 10) + "...");
    console.log(
      "[OAuth] Refresh token:",
      refreshToken.substring(0, 10) + "...",
    );

    console.log("[OAuth] 💾 Saving access token to database...");
    // Save access token to database
    await OAuthToken.create({
      userId: authCodeRecord.userId._id,
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      scope: "mcp:tools mcp:prompts",
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      clientId: client_id,
      clientName: "Claude Desktop",
    });
    console.log("[OAuth] ✅ Access token saved successfully");

    console.log("[OAuth] 🎉 Token exchange complete - sending response");
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: "mcp:tools mcp:prompts",
    });
  } catch (error) {
    console.error("[OAuth] Token error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
};

export const revoke = async (req, res) => {
  try {
    console.log("\n[OAuth] 🚫 REVOKE endpoint called");
    const { token: tokenToRevoke } = req.body;
    console.log(
      "[OAuth] Token to revoke:",
      tokenToRevoke ? tokenToRevoke.substring(0, 10) + "..." : "missing",
    );

    if (!tokenToRevoke) {
      console.log("[OAuth] ❌ Missing token parameter");
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing token parameter",
      });
    }

    console.log("[OAuth] 🗑️  Revoking token...");
    // Revoke the token
    const result = await OAuthToken.updateOne(
      {
        $or: [{ accessToken: tokenToRevoke }, { refreshToken: tokenToRevoke }],
      },
      { isRevoked: true },
    );
    console.log(
      "[OAuth] Revoke result:",
      result.modifiedCount > 0 ? "Token revoked" : "Token not found",
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[OAuth] Revoke error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
};

export const resourceMetadata = (req, res) => {
  console.log("\n[OAuth] 📋 RESOURCE METADATA endpoint called");
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [`${baseUrl}/mcp/oauth`],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256"],
    resource_documentation: "https://docs.engagegpt.in/mcp",
    resource_policy_uri: "https://engagegpt.in/privacy",
  });
};

export const authorizationServerMetadata = (req, res) => {
  console.log("\n[OAuth] ℹ️  AUTHORIZATION SERVER METADATA endpoint called");
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  console.log("BASE URL", baseUrl);
  res.json({
    issuer: `${baseUrl}/mcp/oauth`,
    authorization_endpoint: `${baseUrl}/mcp/oauth/authorize`,
    token_endpoint: `${baseUrl}/mcp/oauth/token`,
    revocation_endpoint: `${baseUrl}/mcp/oauth/revoke`,
    registration_endpoint: `${baseUrl}/mcp/oauth/register`,
    scopes_supported: ["mcp:tools", "mcp:prompts"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: "https://docs.engagegpt.in/mcp/oauth",
  });
};

export const register = async (req, res) => {
  try {
    console.log("\n[OAuth] 📝 REGISTER endpoint called");
    const { client_name, redirect_uris = [] } = req.body;
    console.log("[OAuth] Registration request:", {
      client_name,
      redirect_uris,
    });

    // Generate a client ID
    const client_id = generateToken();
    console.log(
      "[OAuth] Generated client_id:",
      client_id.substring(0, 10) + "...",
    );

    console.log("[OAuth] ✅ Client registration successful");
    res.status(201).json({
      client_id,
      client_name: client_name || "MCP Client",
      redirect_uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    });
  } catch (error) {
    console.error("[OAuth] Registration error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
};
