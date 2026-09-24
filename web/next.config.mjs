/**
 * Static export: the whole site is plain files, served by Firebase Hosting.
 * Case files are precomputed JSON under /public/casefiles, so there is no server.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
