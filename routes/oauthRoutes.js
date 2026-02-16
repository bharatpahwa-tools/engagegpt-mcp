import express from "express";
import * as oauthController from "../controllers/Mcp/oauthController.js";

const router = express.Router();

// OAuth 2.1 endpoints
router.get("/authorize", oauthController.authorize);
router.get("/callback", oauthController.callback);
router.post("/token", oauthController.token);
router.post("/revoke", oauthController.revoke);
router.post("/register", oauthController.register);
router.get(
  "/.well-known/oauth-protected-resource*",
  oauthController.resourceMetadata,
);
router.get(
  "/.well-known/oauth-protected-resource/mcp",
  oauthController.resourceMetadata,
);

router.get(
  "/.well-known/oauth-authorization-server",
  oauthController.authorizationServerMetadata,
);
router.get(
  "/.well-known/oauth-authorization-server/mcp/oauth",
  oauthController.authorizationServerMetadata,
);

router.get(
  "/.well-known/openid-configuration",
  oauthController.authorizationServerMetadata,
);
router.get(
  "/.well-known/openid-configuration/mcp/oauth",
  oauthController.authorizationServerMetadata,
);

export default router;
