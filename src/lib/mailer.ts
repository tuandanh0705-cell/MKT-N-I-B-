import nodemailer from "nodemailer";

export interface SendMailInput {
  to: string;
  subject: string;
  title: string;
  bodyLines: string[];
  actionLabel?: string;
  actionUrl?: string;
}

export interface SendMailResult {
  sent: boolean;
  dryRun: boolean;
  error?: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildHtmlEmail(input: SendMailInput): string {
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const fullActionUrl = input.actionUrl
    ? input.actionUrl.startsWith("http")
      ? input.actionUrl
      : `${baseUrl}${input.actionUrl}`
    : baseUrl;

  const linesHtml = input.bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(line)}</p>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="vi">
    <body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:#0f172a;padding:18px 24px;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#38bdf8;font-weight:700;">Meta Ecom MKT Hub</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;">${escapeHtml(input.title)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            ${linesHtml}
            ${
              input.actionLabel
                ? `<div style="margin-top:20px;">
                    <a href="${escapeHtml(fullActionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;">
                      ${escapeHtml(input.actionLabel)}
                    </a>
                  </div>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            Email tự động từ hệ thống quản lý công việc nội bộ Team Marketing.
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Gửi email qua Gmail SMTP của Team MKT.
 * Nếu chưa cấu hình SMTP_USER/SMTP_PASS (môi trường test local), tự động chạy ở chế độ dry-run
 * để không làm gián đoạn luồng test công việc.
 */
export async function sendMktEmail(input: SendMailInput): Promise<SendMailResult> {
  if (!isSmtpConfigured()) {
    console.log(`[MKT Mail Dry-Run] To: ${input.to} | Subject: ${input.subject}`);
    return { sent: false, dryRun: true };
  }

  try {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromName = process.env.SMTP_FROM_NAME || "Meta Ecom MKT Hub";
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to: input.to,
      subject: input.subject,
      html: buildHtmlEmail(input),
    });

    return { sent: true, dryRun: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi gửi SMTP";
    console.error("[MKT Mail Error]", message);
    return { sent: false, dryRun: false, error: message };
  }
}
