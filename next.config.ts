import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/bess-layout-designer" : "";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: isGitHubPages ? "export" : undefined,
  basePath,
  assetPrefix: isGitHubPages ? `${basePath}/` : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  ...(isGitHubPages
    ? {}
    : {
        async redirects() {
          return [
            {
              source: "/DOCUMENTACION_APP_BESS/:path*",
              destination: "/404",
              permanent: false,
            },
            {
              source: "/DIRECTRICES_APP_BESS/:path*",
              destination: "/404",
              permanent: false,
            },
          ];
        },
      }),
};

export default nextConfig;
