/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
