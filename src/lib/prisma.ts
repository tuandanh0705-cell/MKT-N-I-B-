import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL chưa được cấu hình trong biến môi trường.");
  }

  // `prisma dev` (PGlite local TCP proxy) chạy ổn định nhất với max=1 tránh nghẽn concurrent sockets,
  // còn PostgreSQL thật (Neon/VPS) dùng pool max=10.
  const isLocalPrismaDev =
    connectionString.includes("localhost:51214") ||
    connectionString.includes("127.0.0.1:51214");

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: isLocalPrismaDev ? 1 : 10,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });

  pool.on("error", (err) => {
    console.error("[pg.Pool idle error]", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
