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
