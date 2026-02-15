import mongoose from "mongoose";

const oauthTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    tokenType: {
      type: String,
      default: "Bearer",
    },
    scope: {
      type: String,
      default: "mcp:tools mcp:prompts",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    // PKCE fields for authorization codes
    codeChallenge: {
      type: String,
    },
    codeChallengeMethod: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient token lookup and cleanup
oauthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
oauthTokenSchema.index({ accessToken: 1, isRevoked: 1 });

// Method to check if token is valid
oauthTokenSchema.methods.isValid = function () {
  return !this.isRevoked && this.expiresAt > new Date();
};

// Static method to find valid token
oauthTokenSchema.statics.findValidToken = async function (accessToken) {
  return this.findOne({
    accessToken,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).populate("userId");
};

import { newDBConnection } from "../config/db.js";
const OAuthToken = newDBConnection.model("OAuthToken", oauthTokenSchema);

export default OAuthToken;
