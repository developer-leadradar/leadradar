import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'leadradar.cim-edge.com'],
    },
  },
  // Twilio uses Node.js modules, exclude from edge runtime
  serverExternalPackages: ['twilio'],
}

export default nextConfig
