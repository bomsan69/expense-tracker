import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // AGENTS.md here is the project's hand-authored agent canon; don't let
  // `next dev` append its own generated block to it on every run.
  agentRules: false,
  experimental: {
    serverActions: {
      // Next's own default (1 MB) is well under the 10 MB receipt-upload
      // limit this app already validates in parseReceiptAction — without
      // this, every phone photo past 1 MB fails with "Body exceeded 1 MB
      // limit" before that validation ever runs.
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
