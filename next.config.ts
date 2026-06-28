import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 uses node-postgres (`pg`) at runtime. Next.js 16 / Turbopack must
  // treat these as external server packages, or the generated Prisma client
  // fails to resolve (".prisma/client/default" module error). See Prisma 7 +
  // Next.js 16 upgrade notes.
  serverExternalPackages: ["@prisma/client", "pg", "argon2", "sanitize-html"],
};

export default nextConfig;
