// web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },

  // proxy frontend /api/* to your Go API backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.GOAPI_ORIGIN || 'http://localhost:8080'}/api/:path*`,
      },
    ];
  },

  // keep your dev-only CSP headers
  async headers() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: blob: https:; connect-src 'self' http: https: ws: wss:; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

