import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agent skill files (skills/<agent>/SKILL.md) are read from disk at request
  // time (see src/lib/agents/skill.ts) — without this they'd be dropped from
  // the traced serverless bundle since no import statement references them.
  outputFileTracingIncludes: {
    "/**": ["./skills/**/*"],
  },
};

export default nextConfig;
