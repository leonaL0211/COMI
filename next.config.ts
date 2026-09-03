import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate",
  },
];

const revalidateHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=0, must-revalidate",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Default is 10mb. proxy.ts runs as middleware on every path
    // (matcher: "/:path*"), so it enforces this cap on /api/chat too —
    // raised to fit the Image Input MVP's base64 image payload (up to
    // ~15MB raw upload => ~20MB base64, see server/attachments/
    // image-processing.ts's maxUploadBytes) with headroom for JSON
    // overhead. This is the current (non-deprecated) Next.js 16 config
    // key — `middlewareClientMaxBodySize` was renamed to this.
    proxyClientMaxBodySize: "24mb",
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          ...noStoreHeaders,
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: revalidateHeaders,
      },
      {
        source: "/comi/:path*",
        headers: revalidateHeaders,
      },
      {
        source: "/icon-192.png",
        headers: revalidateHeaders,
      },
      {
        source: "/icon-512.png",
        headers: revalidateHeaders,
      },
      {
        source: "/icon-maskable-512.png",
        headers: revalidateHeaders,
      },
      {
        source: "/apple-touch-icon.png",
        headers: revalidateHeaders,
      },
    ];
  },
};

export default nextConfig;
