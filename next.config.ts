/** @type {import('next').NextConfig} */
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
const environment = process.env.NODE_ENV || "production";

loadEnvConfig(projectDir);

const nextConfig = {
  // Use your existing .env for both dev and prod
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
  },

  images: {
    domains: [
      "localhost",
      "localhost:9000",
      "s3.hoyhub.net",
      // Add production domains here as needed
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // Ignore TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Development settings (when NODE_ENV=development)
  ...(environment === "development" && {
    // Still use production URLs but with dev features
    allowedDevOrigins: ["hoyhub.net", "www.hoyhub.net"],
  }),

  // Production settings (when NODE_ENV=production)
  ...(environment === "production" && {
    poweredByHeader: false,
    generateEtags: true,
    compress: true,
  }),
};

// Only log in development to avoid build noise
if (environment === "development") {
}

export default nextConfig;
