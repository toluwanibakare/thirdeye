/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['thirdeye-api', '@thirdeye/shared'],
  serverExternalPackages: ['express', 'cors'],
};

export default nextConfig;
