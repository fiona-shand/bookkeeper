import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: [
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-libsql",
    "better-sqlite3",
    "@libsql/client",
  ],
  images: {
    // Covers come straight from Open Library's cover store.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
    ],
  },
};

export default nextConfig;
