/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Bundle everything into .next/standalone - no external node_modules needed
  env: {
    NEXT_PUBLIC_AUTH_URL:
      process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081",
    NEXT_PUBLIC_AGENT_URL:
      process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082",
    NEXT_PUBLIC_CHAT_URL:
      process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:8083",
  },
};

module.exports = nextConfig;
