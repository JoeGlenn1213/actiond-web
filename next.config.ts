import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export for ActionD backend
  // Emit directory-style pages (actions/index.html) instead of flat
  // actions.html — Go's http.FileServer then serves /actions/ correctly.
  // Without this, direct URL entry / refresh on sub-pages showed a raw
  // directory listing when served by ActionD's --web-dir.
  trailingSlash: true,
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
