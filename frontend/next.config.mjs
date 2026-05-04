// frontend/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,

  // proxy frontend /api/* to your backend
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
    const isProduction = process.env.NODE_ENV === 'production';
    const connectSrc = isProduction ? "'self'" : "'self' http: https: ws: wss:";

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: blob: https:; connect-src ${connectSrc}; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
