import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.g100.in",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "g100.in",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "ckkxgzugovqvfsyaahvr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/content/:slug*",
        destination: "/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
