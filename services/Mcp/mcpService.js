import * as postRepository from "../../repositories/postRepository.js";
import * as mcpHelper from "./mcpHelper.js";
import AppError from "../../utils/appError.js";

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
