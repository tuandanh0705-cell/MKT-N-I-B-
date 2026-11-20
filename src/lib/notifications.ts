import { prisma } from "@/lib/prisma";
import { sendMktEmail } from "@/lib/mailer";
import { sendWebPushToUser } from "@/lib/webpush";
import type { NotificationType } from "@/generated/prisma/client";

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  sendEmailNow?: boolean;
  sendPushNow?: boolean;
  actionLabel?: string;
}

/**
 * Tạo thông báo trong Web App, tự động bắn Web Push PWA ra điện thoại,
 * và tùy chọn gửi Gmail ngay lập tức cho các sự kiện quan trọng.
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  linkUrl,
  sendEmailNow = false,
  sendPushNow = true,
  actionLabel = "Mở xem chi tiết",
}: NotifyOptions) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  let emailSent = false;
  let emailError: string | null = null;

  const [created] = await Promise.all([
    prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title,
        message,
        linkUrl,
        emailSent: false,
      },
    }),
    sendPushNow
      ? sendWebPushToUser(user.id, {
          title: `[MKT Hub] ${title}`,
          body: message,
          url: linkUrl || "/",
          tag: `mkt-${type}-${user.id}`,
        })
      : Promise.resolve({ sent: 0, failed: 0 }),
  ]);

  if (sendEmailNow) {
    const mailRes = await sendMktEmail({
      to: user.email,
      subject: `[MKT Hub] ${title}`,
      title,
      bodyLines: [`Xin chào ${user.name},`, message],
      actionLabel,
      actionUrl: linkUrl || "/",
    });
    emailSent = mailRes.sent;
    emailError = mailRes.error ?? null;
    if (emailSent || emailError) {
      return prisma.notification.update({
        where: { id: created.id },
        data: { emailSent, emailError },
      });
    }
  }

  return created;
}
