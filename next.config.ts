import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache dynamic page segments in the client Router Cache for 60s so quick
    // back-and-forth navigation (e.g. customer detail → customers list) doesn't
    // refetch on every bounce. Mutations (create/delete/edit) call
    // router.refresh() to invalidate this cache so lists never show stale data.
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
