import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Let the client router reuse a just-visited page for 30s instead of
    // refetching on every back/forward hop. Server actions still bust this
    // via revalidatePath, so your own edits always show immediately.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
