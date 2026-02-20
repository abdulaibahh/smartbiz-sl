/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:5000",
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
