import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer", "pg", "bcryptjs"],
};

export default nextConfig;
