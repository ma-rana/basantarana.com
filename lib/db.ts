// lib/db.ts — Prisma singleton (Prisma 7, driver-adapter architecture).
//
// Prisma 7 removed the bundled query engine: PrismaClient now REQUIRES a driver
// adapter, and `new PrismaClient()` with no args throws. For Postgres that
// means @prisma/adapter-pg wrapping a node-postgres Pool.
//
// REQUIRED singleton: without caching, Next.js hot reload creates a new client
// (and a new connection Pool) on every file change and exhausts Postgres's
// connection limit. We cache BOTH the pool and the client on globalThis — the
// pool matters as much as the client, since each pool holds real connections.

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = db;
}
