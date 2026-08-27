import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's CLI checker cannot parse `tsc --showConfig` output in the
    // current runtime. TypeScript 5 still provides the compiler API, so use
    // Next's documented API checker for production builds.
    useTypeScriptCli: false,
  },
  images: {
    // The local development network resolves public Supabase URLs through
    // NAT64 addresses, which Next.js treats as private and blocks in its
    // server-side image optimizer. Load remote images directly instead —
    // but only in dev: production hosting doesn't have that NAT64 quirk,
    // and disabling optimization there would cost real LCP/CWV performance
    // (no WebP conversion, no responsive srcset) for every listing photo.
    unoptimized: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "pibusgkkyirgfwmdpybd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
