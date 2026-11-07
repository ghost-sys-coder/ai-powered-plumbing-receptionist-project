import type { NextConfig } from "next";

// The public site lives at NEXT_PUBLIC_APP_URL (https://answersteady.com).
// Visitors on another hostname of this deployment are sent there. /api is left
// alone on every hostname: voice platforms, Stripe, Clerk and Google still call
// the old domain until their callback URLs are moved, and they don't follow
// redirects.
const OTHER_HOSTS = ["www.answersteady.com", "plumber.veilcode.studio"];

function canonicalOrigin(): URL | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  async redirects() {
    const canonical = canonicalOrigin();
    // No redirects while the app URL is unset or plain http (local dev).
    if (!canonical || canonical.protocol !== "https:") return [];
    return OTHER_HOSTS.filter((host) => host !== canonical.host).map((host) => ({
      source: "/:path((?!api/).*)",
      has: [{ type: "host" as const, value: host }],
      destination: `${canonical.origin}/:path`,
      permanent: true,
    }));
  },
  experimental: {
    // Cache dynamic page segments in the client Router Cache for 60s so quick
    // back-and-forth navigation (e.g. customer detail → customers list) doesn't
    // refetch on every bounce. Mutations (create/delete/edit) call
    // router.refresh() to invalidate this cache so lists never show stale data.
    staleTimes: { dynamic: 60 },
  },
};

export default nextConfig;
