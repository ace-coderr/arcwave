/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@react-native-async-storage/async-storage",
      "@farcaster/mini-app-solana"
    );
    return config;
  },
};
module.exports = nextConfig;