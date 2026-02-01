import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",

  // Configure image domains for event sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.evbuc.com",
      },
      {
        protocol: "https",
        hostname: "secure.meetupstatic.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["@heroicons/react"],
  },
};

export default nextConfig;
