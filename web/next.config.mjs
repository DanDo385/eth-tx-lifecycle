// web/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },

  // proxy frontend /api/* to your Go API backend
  async rewrites() {
    const goApiOrigin = process.env.GOAPI_ORIGIN || 'http://localhost:8080';
    console.log('Next.js rewrites: GOAPI_ORIGIN =', goApiOrigin);
    
    return [
      {
        source: '/api/:path*',
        destination: `${goApiOrigin}/api/:path*`,
      },
    ];
  },

  // CSP headers for both development and production
  async headers() {
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

