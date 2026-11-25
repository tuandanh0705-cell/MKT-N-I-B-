import { execFileSync } from "node:child_process";
import path from "node:path";

const isVercel = process.env.VERCEL === "1";
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!isVercel) {
  console.log(
    "[sync-db] Local build detected — skipping automatic prisma db push."
  );
  process.exit(0);
}

if (!directUrl) {
  console.warn(
    "[sync-db] VERCEL=1 but DATABASE_URL is missing — skipping prisma db push."
  );
  process.exit(0);
}

console.log("[sync-db] Vercel build detected — syncing Prisma schema to DB...");

const prismaCli = path.resolve("node_modules/prisma/build/index.js");
execFileSync(process.execPath, [prismaCli, "db", "push"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: directUrl,
  },
});

console.log("[sync-db] Prisma schema synced successfully.");
