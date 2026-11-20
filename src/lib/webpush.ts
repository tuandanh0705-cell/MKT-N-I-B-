import crypto from "node:crypto";
import {
  generateVAPIDKeys,
  sendNotification,
  setVapidDetails,
} from "web-push";
import { prisma } from "@/lib/prisma";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cachedVapidKeys: VapidKeys | null = null;

/**
 * Lấy VAPID keys từ ENV hoặc tự động sinh 1 lần & lưu vào AppSetting trong PostgreSQL
 * để Web Push PWA chạy ngay ở cả localhost và Vercel không cần cấu hình phức tạp.
 */
export async function getVapidKeys(): Promise<VapidKeys> {
  const envPublic =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:marketing@metaecom.vn";

  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate, subject };
  }

  if (cachedVapidKeys) return cachedVapidKeys;

  const [pubRow, privRow] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "vapid_public_key" } }),
    prisma.appSetting.findUnique({ where: { key: "vapid_private_key" } }),
  ]);

  if (pubRow?.value && privRow?.value) {
    cachedVapidKeys = {
      publicKey: pubRow.value,
      privateKey: privRow.value,
      subject,
    };
    return cachedVapidKeys;
  }

  const generated = generateVAPIDKeys();
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "vapid_public_key" },
      update: { value: generated.publicKey },
      create: { key: "vapid_public_key", value: generated.publicKey },
    }),
    prisma.appSetting.upsert({
      where: { key: "vapid_private_key" },
      update: { value: generated.privateKey },
      create: { key: "vapid_private_key", value: generated.privateKey },
    }),
  ]);

  cachedVapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  };
  return cachedVapidKeys;
}

export async function getOrCreateAppSecret(
  settingKey: string,
  envKey?: string
): Promise<string> {
  if (envKey && process.env[envKey]) {
    return String(process.env[envKey]);
  }
  const existing = await prisma.appSetting.findUnique({
    where: { key: settingKey },
  });
  if (existing?.value) return existing.value;

  const generated = crypto.randomBytes(20).toString("hex");
  await prisma.appSetting.upsert({
    where: { key: settingKey },
    update: { value: generated },
    create: { key: settingKey, value: generated },
  });
  return generated;
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; failed: number }> {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subs.length === 0) return { sent: 0, failed: 0 };

    const keys = await getVapidKeys();
    setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag || `mkt-hub-${Date.now()}`,
      icon: "/icon.svg",
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            data
          );
          sent++;
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (err: unknown) {
          failed++;
          const statusCode =
            typeof err === "object" &&
            err !== null &&
            "statusCode" in err &&
            typeof (err as { statusCode?: number }).statusCode === "number"
              ? (err as { statusCode: number }).statusCode
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          }
        }
      })
    );

    return { sent, failed };
  } catch (err) {
    console.error("Web push dispatch error:", err);
    return { sent: 0, failed: 1 };
  }
}
