import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 otherwise auto-appends an "agent rules" block to CLAUDE.md on
  // every `next dev`/`next build`. CLAUDE.md is the user's own project
  // instructions file — don't let tooling silently modify it.
  agentRules: false,
};

export default nextConfig;
