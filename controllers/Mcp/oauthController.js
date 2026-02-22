import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OAuthToken from "../../models/oauthToken.js";
import User from "../../models/members.js";

const generateToken = () => {
  return crypto.randomBytes(32).toString("base64url");
};

const sendSuccessPage = (res, callbackUrl) => {
  const redirectHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecting | EngageGPT</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Ovo&display=swap" rel="stylesheet">
      <style>
        :root {
            --primary: #004182;
            --bg: #f8fafc;
            --text: #1e293b;
            --text-muted: #64748b;
        }
        body { 
            font-family: 'Geist', sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
            background-color: var(--bg);
            color: var(--text);
        }
        .card { 
            background: white; 
            padding: 48px; 
            border-radius: 24px; 
            box-shadow: 0 20px 50px rgba(0, 65, 130, 0.08); 
            text-align: center; 
            max-width: 480px; 
            width: 90%;
            animation: fadeIn 0.6s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo-text {
            font-family: 'Ovo', serif;
            font-size: 24px;
            color: var(--primary);
            font-weight: bold;
            margin-bottom: 24px;
        }
        .loader-container {
            position: relative;
            width: 60px;
            height: 60px;
            margin: 0 auto 24px;
        }
        .loader {
            width: 100%;
            height: 100%;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #10b981;
            font-size: 24px;
        }
        h1 { font-size: 24px; margin-bottom: 12px; color: var(--text); letter-spacing: -0.5px; }
        p { color: var(--text-muted); font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
        .btn { 
            background: var(--primary); 
            color: white; 
            padding: 16px 32px; 
            border-radius: 14px; 
            text-decoration: none; 
            font-weight: 600; 
            display: inline-block;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 65, 130, 0.2);
            font-size: 15px;
        }
        .btn:hover {
            background: #003366;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 65, 130, 0.3);
        }
        .btn:active {
            transform: translateY(0);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-text">EngageGPT MCP</div>
        <div class="loader-container">
            <div class="loader"></div>
        </div>
        <h1>Authorization Successful!</h1>
        <p>Connecting you back to Claude Desktop. We'll be ready in a moment.</p>
        <a href="${callbackUrl.toString()}" id="redirectBtn" class="btn">Connect Now &rarr;</a>
        <script>
          const url = "${callbackUrl.toString()}";
          // Attempt automatic redirect after a short animations
          setTimeout(() => {
            window.location.href = url;
          }, 1500);
        </script>
      </div>
    </body>
    </html>
  `;
  return res.send(redirectHtml);
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

      console.log("[OAuth] 🔀 Redirecting to success page...");
      return sendSuccessPage(res, callbackUrl);
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

    // Read the HTML file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const htmlPath = path.join(__dirname, "../../public/authorize.html");

    try {
      let html = await fs.readFile(htmlPath, "utf8");

      // Generate hidden inputs from query params
      const hiddenInputs = Object.entries(req.query)
        .filter(([key]) => key !== "connectionToken") // Exclude connectionToken as it has visible input
        .map(
          ([key, value]) =>
            `<input type="hidden" name="${key}" value="${value}">`,
        )
        .join("\n");

      // Inject hidden inputs into the form
      // We use a regex to match the <form id="authForm" ...> tag flexibly
      html = html.replace(
        /<form\s+id="authForm"[^>]*>/i,
        (match) => `${match}\n${hiddenInputs}`,
      );

      console.log("[OAuth] 📝 Injected hidden inputs:", hiddenInputs);
      return res.send(html);
    } catch (error) {
      console.error("[OAuth] ❌ Error reading authorize.html:", error);
      return res.status(500).send("Internal Server Error");
    }
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
    console.log("[OAuth] 🔀 Redirecting to success page...");
    return sendSuccessPage(res, callbackUrl);
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
    if (grant_type === "refresh_token") {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "Missing refresh_token",
        });
      }

      console.log("[OAuth] 🔄 Refreshing token...");
      const tokenRecord = await OAuthToken.findOne({
        refreshToken: refresh_token,
        isRevoked: false,
      }).populate("userId");

      if (!tokenRecord) {
        console.log("[OAuth] ❌ Invalid or revoked refresh_token");
        return res.status(400).json({
          error: "invalid_grant",
          error_description: "Invalid refresh_token",
        });
      }

      // Generate new tokens
      const accessToken = generateToken();
      const newRefreshToken = generateToken();
      const expiresIn = 30 * 24 * 3600; // 30 days

      // Save new token
      await OAuthToken.create({
        userId: tokenRecord.userId._id,
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: "Bearer",
        scope: tokenRecord.scope,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        clientId: client_id,
        clientName: "Claude Desktop",
      });

      // Optionally revoke old token (Refresh Token Rotation)
      tokenRecord.isRevoked = true;
      await tokenRecord.save();

      console.log("[OAuth] ✅ Token refreshed successfully");
      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        refresh_token: newRefreshToken,
        scope: tokenRecord.scope,
      });
    }

    if (grant_type !== "authorization_code") {
      console.log("[OAuth] ❌ Unsupported grant type:", grant_type);
      return res.status(400).json({
        error: "unsupported_grant_type",
        error_description:
          "Only authorization_code and refresh_token grant types are supported",
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
