import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const RETRYABLE_READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  if (e.code === "P1017" || e.code === "P1001" || e.code === "P2024") {
    return true;
  }
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    msg.includes("Server has closed the connection") ||
    msg.includes("ConnectionClosed") ||
    msg.includes("Connection terminated unexpectedly") ||
    msg.includes("ECONNRESET")
  );
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL chưa được cấu hình trong biến môi trường.");
  }

  // `prisma dev` (PGlite local TCP proxy) chỉ ổn định với 1 kết nối tuần tự (max=1) và idleTimeoutMillis=1
  // để tránh mở >=2 socket song song gây P1017 ConnectionClosed; còn PostgreSQL thật (Neon/VPS) dùng max=10.
  const isLocalPrismaDev =
    connectionString.includes("localhost:51214") ||
    connectionString.includes("127.0.0.1:51214");

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: isLocalPrismaDev ? 1 : 10,
      idleTimeoutMillis: isLocalPrismaDev ? 1 : 10_000,
      connectionTimeoutMillis: isLocalPrismaDev ? 0 : 10_000,
      keepAlive: !isLocalPrismaDev,
    });

  pool.on("error", (err) => {
    console.error("[pg.Pool idle error]", err.message);
  });

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }) {
          try {
            return await query(args);
          } catch (err) {
            if (
              RETRYABLE_READ_OPS.has(operation) &&
              isTransientConnectionError(err)
            ) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              return await query(args);
            }
            throw err;
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
  pgPool: Pool | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
