import type { NextConfig } from "next";

// Static export for free hosting (GitHub Pages / Cloudflare Pages / any static host).
// basePath is only applied when NEXT_BASE_PATH is set (e.g. "/gridon-web" for a
// GitHub Pages project site). Local dev/build stays at root.
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
