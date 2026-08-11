import type { NextConfig } from "next";

// Keep the build-time image optimizer aligned with the public R2 asset host.
// Cloudflare runtime vars are not available while Next config is evaluated.
const assetsUrl = process.env.NEXT_PUBLIC_ASSETS_URL || "https://assets.noratrim.com";
const assets = new URL(assetsUrl);

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingExcludes: {
    "*": [
      "./data/**/*.avif",
      "./data/**/*.jpeg",
      "./data/**/*.jpg",
      "./data/**/*.png",
      "./data/**/*.webp",
      "./public/products/**/*",
    ],
  },
  experimental: {
    // Next.js 16 can lose its request workStore when several internal pages
    // are prerendered in parallel. Keep static generation in one worker and
    // let Next retry an individual page before failing the whole build.
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
  async headers() {
    const languageHeaders = (["ru", "uk", "de", "en"] as const).map((locale) => ({
      source: `/${locale}/:path*`,
      headers: [{ key: "Content-Language", value: locale }],
    }));
    return [...languageHeaders, {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  images: {
    qualities: [75, 90, 95],
    remotePatterns: [{ protocol: assets.protocol.replace(":", "") as "http" | "https", hostname: assets.hostname, port: assets.port, pathname: "/**" }],
    localPatterns: [
      { pathname: "/products/**" },
      { pathname: "/brand/**" },
    ],
  },
};

export default nextConfig;
