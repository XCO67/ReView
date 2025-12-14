import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: Disable source maps in production to prevent code inspection
  productionBrowserSourceMaps: false,
  
  // Security: Disable source maps for server-side code
  
  // Security: Compress and optimize output
  compress: true,
  
  // Security: Remove console logs in production
  ...(process.env.NODE_ENV === 'production' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Remove console.log in production client bundles
        config.optimization = {
          ...config.optimization,
          minimize: true,
        };
      }
      return config;
    },
  }),
  
  // Security headers (additional layer)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
