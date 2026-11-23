/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow isolated release checks to use a clean output directory when a
  // previous build artifact is locked, while keeping the normal .next path.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://telegram.org; connect-src 'self' https://api.razorpay.com https://api.telegram.org https://graph.facebook.com; frame-src https://api.razorpay.com https://checkout.razorpay.com https://telegram.org; upgrade-insecure-requests" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
        ],
      },
      {
        source: "/(logo-full.png|logo-horizontal.png|logo-mark.png|screenshots/:path*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" }],
      },
      {
        // Per-partner PWA manifests contain no private data and change only
        // with a deployment. Cache them at the edge so opening module pages
        // does not repeatedly invoke a route function for the same manifest.
        source: "/:path*/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800" }],
      },
      {
        source: "/(sw.js|field-force-sw.js|field-force-manifest.json|field-force-icon.svg|telecalling-icon.svg|llms.txt)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
  // The Designer's page-detail view (src/app/admin/(protected)/designer/[pageId]/page.tsx)
  // reads an arbitrary registered page's source file from disk at request time via
  // fs.readFileSync(page.sourceFile) — a dynamic path Next's default output tracing
  // can't detect as a dependency, so the serverless bundle omits it and every page
  // 404s with ENOENT in production. Force the whole src/app tree into that route's
  // trace so the Source panel works on Vercel, not just locally.
  experimental: {
    outputFileTracingIncludes: {
      "/admin/designer/[pageId]": ["./src/app/**/*.tsx", "./src/app/**/*.ts"],
    },
  },
};

export default nextConfig;
