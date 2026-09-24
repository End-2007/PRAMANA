/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Air gap: the console must never reach a CDN at runtime. Fonts are system-stack,
  // there are no remote images, and every asset is bundled.
  images: { unoptimized: true },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${process.env.PRAMANA_API ?? "http://localhost:8000"}/api/:path*` },
    ];
  },
};
export default nextConfig;
