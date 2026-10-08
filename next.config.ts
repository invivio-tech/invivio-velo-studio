import type { NextConfig } from 'next';
import { execSync } from 'child_process';

let gitSha = 'v1.00056';
try {
  gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.log('Could not fetch git sha');
}

console.log('--- LOADING NEXT.CONFIG.TS ---');
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: gitSha,
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.app',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
