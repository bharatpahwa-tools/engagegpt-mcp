import * as postRepository from "../../repositories/postRepository.js";
import * as organizationRepository from "../../repositories/organizationRepository.js";
import * as mcpHelper from "./mcpHelper.js";
import { logActivity, logTransaction } from "../../utils/activityLogger.js";
import AppError from "../../utils/appError.js";
import Member from "../../models/members.js";

const getPersonaContext = async (connectionToken) => {
  if (!connectionToken) {
    throw new AppError("Connection token is required", 400);
  }

  // 1. Parse IDs from the connection token
  const tokenParts = connectionToken.split("-");
  if (tokenParts.length < 2) {
    throw new AppError("Invalid connection token format", 400);
  }

  const organizationId = tokenParts[0];
  const memberId = tokenParts[1];

  const posts = await postRepository.getHighEngagementPosts(
    organizationId,
    memberId,
    25,
  );

  console.log("CREATING USER ACTIVITY");
  await logActivity(organizationId, "mcp_tool_usage", {
    tool: "get_my_persona",
    memberId,
    creditsUsed: 0,
    timestamp: new Date(),
  });

  // Log organization transaction properly using the repository
  try {
    const org =
      await organizationRepository.findOrganizationById(organizationId);
    const member = await Member.findById(memberId);
    const currentBalance = org?.credits?.balance || 0;

    await organizationRepository.updateOrganizationCredits(organizationId, {
      balance: currentBalance, // No deduction for now as per requirement
      totalUsed: org?.credits?.totalUsed || 0,
      transaction: {
        type: "usage",
        amount: 0,
        balance: currentBalance,
        description: `Credits used by ${member?.name || "Member"} for fetching writing persona using EngageGPT MCP`,
        metadata: { tool: "get_my_persona", memberId },
        createdAt: new Date(),
      },
    });
    console.log("Logged MCP transaction via repository");
  } catch (error) {
    console.error("Failed to log MCP transaction:", error);
  }

  if (!posts || posts.length === 0) {
    return "No LinkedIn post history found for this profile. Please ensure posts are synced in EngageGPT before using the persona feature.";
  }

  const stats = postRepository.calculateStats(posts);

  const formattedPosts = mcpHelper.formatPostsForPersona(posts);

  return mcpHelper.generatePersonaSystemPrompt(stats, formattedPosts);
};

const getEngagementInsights = async (connectionToken) => {
  const [organizationId, memberId] = connectionToken.split("-");
  const posts = await postRepository.findByMemberAndOrganization(
    organizationId,
    memberId,
  );
  console.log("CREATING USER ACTIVITY");
  await logActivity(organizationId, "mcp_tool_usage", {
    tool: "get_engagement_insights",
    memberId,
    creditsUsed: 0,
    timestamp: new Date(),
  });

  // Log organization transaction properly using the repository
  try {
    const org =
      await organizationRepository.findOrganizationById(organizationId);
    const member = await Member.findById(memberId);
    const currentBalance = org?.credits?.balance || 0;

    await organizationRepository.updateOrganizationCredits(organizationId, {
      balance: currentBalance, // No deduction for now as per requirement
      totalUsed: org?.credits?.totalUsed || 0,
      transaction: {
        type: "usage",
        amount: 0,
        balance: currentBalance,
        description: `Credits used by ${member?.name || "Member"} for posts engagement insights using EngageGPT MCP`,
        metadata: { tool: "get_engagement_insights", memberId },
        createdAt: new Date(),
      },
    });
    console.log("Logged MCP transaction via repository");
  } catch (error) {
    console.error("Failed to log MCP transaction:", error);
  }

  if (!posts || posts.length === 0) return "No data found.";

  const stats = postRepository.calculateStats(posts);

  return `
Engagement Insights:
- Total Impressions: ${stats.totalImpressions}
- Avg Likes per Post: ${(stats.totalLikes / posts.length).toFixed(1)}
- Top Media Type: ${postRepository.getTopPosts(posts, 1)[0]?.media?.type || "Text"}
`.trim();
};

export { getPersonaContext, getEngagementInsights };
