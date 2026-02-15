const formatPostsForPersona = (posts) => {
  if (!posts || posts.length === 0) return "No posts available for analysis.";

  return posts
    .map((post, index) => {
      // We use textContent from your model
      const content = post.textContent || "No text content";
      const stats = `[Stats: ${post.numLikes} Likes, ${post.numComments} Comments, ${post.numShares} Shares]`;
      const mediaType =
        post.media?.type !== "none"
          ? `[Media: ${post.media.type}]`
          : "[Text Only]";

      return `--- POST ${index + 1} ${mediaType} ${stats} ---\n${content.trim()}\n`;
    })
    .join("\n");
};

const generatePersonaSystemPrompt = (stats, formattedPosts) => {
  return `
USER CONTENT DNA:
Total Historical Impressions: ${stats.totalImpressions}
Total Historical Engagement: ${stats.totalLikes + stats.totalComments} interactions.

CORE WRITING SAMPLES:
${formattedPosts}

AI INSTRUCTIONS:
1. Identify the user's "Hook" style (e.g., question, bold statement, or storytelling).
2. Note sentence length and paragraph spacing (e.g., punchy one-liners vs. detailed blocks).
3. Observe emoji density and placement.
4. Detect recurring themes or professional keywords.
5. Create new content that is indistinguishable from the samples provided above.
`.trim();
};

export { formatPostsForPersona, generatePersonaSystemPrompt };
