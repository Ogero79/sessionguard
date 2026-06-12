/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@sessionguard/shared-types",
    "@sessionguard/behavioural-sdk",
  ],
};

export default nextConfig;

