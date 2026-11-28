import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTask } from "@/lib/permissions";

const DATA_IMAGE_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu mã ảnh." }, { status: 400 });
  }

  const asset = await prisma.assetLink.findUnique({
    where: { id },
    select: { id: true, taskId: true, url: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Không tìm thấy tệp ảnh." }, { status: 404 });
  }

  const allowed = await canAccessTask(user, asset.taskId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Bạn không có quyền truy cập tệp này." },
      { status: 403 }
    );
  }

  const trimmed = asset.url.trim();
  const match = trimmed.match(DATA_IMAGE_RE);
  if (match) {
    const mimeType = match[1].toLowerCase();
    // Chặn inline SVG để tránh XSS khi mở trực tiếp trên trình duyệt
    if (mimeType.includes("svg")) {
      return NextResponse.json(
        { error: "Định dạng ảnh không được hỗ trợ." },
        { status: 415 }
      );
    }
    const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return NextResponse.redirect(trimmed, 302);
  }

  return NextResponse.json({ error: "Đường dẫn tệp không hợp lệ." }, { status: 404 });
}
