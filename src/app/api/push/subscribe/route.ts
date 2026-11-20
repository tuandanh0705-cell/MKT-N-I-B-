import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVapidKeys, sendWebPushToUser } from "@/lib/webpush";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const [keys, subsCount] = await Promise.all([
    getVapidKeys(),
    prisma.pushSubscription.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    publicKey: keys.publicKey,
    subscribedCount: subsCount,
    envConfigured: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === "TEST_PUSH") {
      const res = await sendWebPushToUser(user.id, {
        title: "🔔 Test Thông Báo Điện Thoại Thành Công!",
        body: `Chào ${user.name}, chuông báo việc Meta Ecom MKT Hub đã kết nối sẵn sàng.`,
        url: user.role === "LEADER" ? "/leader" : "/my-work",
        tag: `test-push-${user.id}`,
      });
      return NextResponse.json({ ok: true, ...res });
    }

    const subscription = body.subscription as
      | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      | undefined;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Thiếu thông tin PushSubscription hợp lệ." },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent") || null,
        lastUsedAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    const subscribedCount = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });

    return NextResponse.json({ ok: true, subscribedCount });
  } catch (err) {
    console.error("Subscribe push error:", err);
    return NextResponse.json(
      { error: "Không thể đăng ký nhận thông báo Web Push." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint: body.endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({ ok: true, subscribedCount: 0 });
}
