import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-db262da1ef9140738af0ec8adade1c90.r2.dev",
        pathname: "/products/**",
      },
    ],
  },
};

export default nextConfig;
