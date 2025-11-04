/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle Prisma and Node.js built-in modules
    config.externals.push('@prisma/client')
    
    // Handle Node.js built-in modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'node:async_hooks': false,
        'node:crypto': false,
        'node:fs': false,
        'node:net': false,
        'node:tls': false,
        'node:util': false,
        'node:path': false,
        'node:stream': false,
        'node:buffer': false,
      }
    }
    
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    esmExternals: 'loose',
  },
}

export default nextConfig
