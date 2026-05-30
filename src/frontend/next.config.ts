import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
    // Disable server-side image optimization in environments without internet egress.
    // Images are already served via CloudFront with caching — optimization adds no value.
    unoptimized: process.env.NODE_ENV === 'production',
  },
  allowedDevOrigins: ['192.168.0.*'],
};

export default nextConfig;
