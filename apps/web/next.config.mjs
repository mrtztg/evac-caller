import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {import('next').NextConfig} */
export default {
  // packages/core is TypeScript source in the workspace, so Next must compile it.
  transpilePackages: ["@evac/core"],
  // The dev badge sits on top of the replay timeline.
  devIndicators: false,
  // The fixtures are read from disk at request time with a path found from pnpm-workspace.yaml.
  // Next cannot see that by itself, so the files are listed here or the deployed server has no data.
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/**": ["../../pnpm-workspace.yaml", "../../data/fixtures/**"],
  },
  webpack: (config) => {
    // packages/core imports "./danger.js" (Node ESM style); the file on disk is danger.ts.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};
