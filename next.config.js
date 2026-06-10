/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
