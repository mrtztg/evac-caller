/** @type {import('next').NextConfig} */
export default {
  // packages/core is TypeScript source in the workspace, so Next must compile it.
  transpilePackages: ["@evac/core"],
  webpack: (config) => {
    // packages/core imports "./danger.js" (Node ESM style); the file on disk is danger.ts.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};
