import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: "standalone",

  reactStrictMode: true,

  // Development only: lets phones/tablets on the same Wi-Fi open the dev
  // server by the PC's local IP (e.g. http://192.168.100.245:3000) with
  // working buttons and live reload. Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
