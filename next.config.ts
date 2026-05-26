import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
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
};

export default nextConfig;

