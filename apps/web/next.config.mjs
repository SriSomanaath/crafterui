import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev writes to .next-dev (set by the dev script) so a concurrent
  // `next build` can never clobber the running dev server's incremental
  // state - that collision silently kills Fast Refresh until a dev restart.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Trace from the monorepo root (silences the multi-lockfile heuristic).
  outputFileTracingRoot: path.join(appDir, "..", ".."),
  async rewrites() {
    return [
      {
        // The bucket holding the demo photography sends no
        // Access-Control-Allow-Origin, and the WebGL carousels must set
        // crossOrigin="anonymous" to use those pixels as a GL texture - without
        // it the atlas canvas is tainted and texImage2D throws. Proxying makes
        // the art same-origin, so CORS never enters the picture. Delete this and
        // point ART() back at the bucket once it has a CORS policy.
        source: "/art/:path*",
        destination:
          "https://pub-45c4a3d9611041d08fe82d52599b72b0.r2.dev/primary-showcase-assets/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Immutable media: browse-wall clips and the demo audio tracks.
        source: "/:dir(crafter|audio)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Registry payloads - CDN-cached, revalidated, CORS-open for the CLI.
        source: "/r/:path*.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
