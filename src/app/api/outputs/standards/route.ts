import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  getIncludeDefaultQcSetting,
  listAllQcStandardDocsForLeader,
  normalizeStandardCategory,
  normalizeStandardSourceType,
  setIncludeDefaultQcSetting,
  tryFetchExternalStandardText,
} from "@/lib/qc-standard-docs";

const MAX_BASE64_LENGTH = 5_200_000; // ~3.8 MB file limit

function sanitizeBase64Payload(raw: unknown): string | null {
  const val = typeof raw === "string" ? raw.trim() : "";
  if (!val) return null;
  const cleaned = val.includes(",") ? val.split(",").pop() || "" : val;
  if (cleaned.length > MAX_BASE64_LENGTH) {
    throw new Error(
      "File đính kèm vượt quá 3.5 MB. Hãy nén nhẹ hơn hoặc dán trực tiếp nội dung văn bản."
    );
  }
  return cleaned;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền xem & quản lý Tài liệu Tiêu chuẩn QC." },
      { status: 403 }
    );
  }

  const [docs, includeDefaultQc] = await Promise.all([
    listAllQcStandardDocsForLeader(),
    getIncludeDefaultQcSetting(),
  ]);

  return NextResponse.json({ docs, includeDefaultQc });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền thêm hoặc sửa Tài liệu Tiêu chuẩn QC." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (body.action === "SET_INCLUDE_DEFAULT") {
      const enabled = await setIncludeDefaultQcSetting(
        Boolean(body.includeDefaultQc)
      );
      return NextResponse.json({ includeDefaultQc: enabled });
    }

    if (body.action === "SYNC_LINK" && body.id) {
      const existing = await prisma.qcStandardDoc.findUnique({
        where: { id: String(body.id) },
      });
      if (!existing || !existing.sourceUrl) {
        return NextResponse.json(
          { error: "Không tìm thấy tài liệu hoặc link để đồng bộ." },
          { status: 404 }
        );
      }
      const synced = await tryFetchExternalStandardText(existing.sourceUrl);
      if (synced.text) {
        await prisma.qcStandardDoc.update({
          where: { id: existing.id },
          data: { contentText: synced.text, updatedById: user.id },
        });
      }
      const docs = await listAllQcStandardDocsForLeader();
      return NextResponse.json({ docs, syncWarning: synced.warning });
    }

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { error: "Vui lòng nhập Tên tài liệu tiêu chuẩn." },
        { status: 400 }
      );
    }

    const category = normalizeStandardCategory(body.category);
    const sourceType = normalizeStandardSourceType(body.sourceType);
    const projectId =
      typeof body.projectId === "string" && body.projectId.trim() && body.projectId !== "ALL"
        ? body.projectId.trim()
        : null;

    let contentText =
      typeof body.contentText === "string" && body.contentText.trim()
        ? body.contentText.trim()
        : null;
    const sourceUrl =
      typeof body.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : null;
    const fileName =
      typeof body.fileName === "string" && body.fileName.trim()
        ? body.fileName.trim()
        : null;
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.trim()
        ? body.mimeType.trim()
        : null;
    const fileDataBase64 = sanitizeBase64Payload(body.fileDataBase64);

    let syncWarning: string | null = null;
    if (sourceType === "LINK") {
      if (!sourceUrl) {
        return NextResponse.json(
          { error: "Vui lòng dán đường dẫn tài liệu (Google Docs / Link)." },
          { status: 400 }
        );
      }
      if (!contentText) {
        const fetched = await tryFetchExternalStandardText(sourceUrl);
        if (fetched.text) contentText = fetched.text;
        syncWarning = fetched.warning;
      }
    }

    if (!contentText && !fileDataBase64 && !sourceUrl) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung tiêu chí, tải file hoặc gắn link tài liệu." },
        { status: 400 }
      );
    }

    await prisma.qcStandardDoc.create({
      data: {
        title,
        category,
        sourceType,
        projectId,
        contentText,
        sourceUrl,
        fileName,
        mimeType,
        fileDataBase64,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        updatedById: user.id,
      },
    });

    const docs = await listAllQcStandardDocsForLeader();
    return NextResponse.json({ docs, syncWarning }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể lưu Tài liệu Tiêu chuẩn QC.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền chỉnh sửa Tài liệu Tiêu chuẩn QC." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { error: "Thiếu mã tài liệu (id)." },
        { status: 400 }
      );
    }

    const existing = await prisma.qcStandardDoc.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy tài liệu tiêu chuẩn." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = { updatedById: user.id };
    if (body.title !== undefined && String(body.title).trim()) {
      updateData.title = String(body.title).trim();
    }
    if (body.category !== undefined) {
      updateData.category = normalizeStandardCategory(body.category);
    }
    if (body.sourceType !== undefined) {
      updateData.sourceType = normalizeStandardSourceType(body.sourceType);
    }
    if (body.projectId !== undefined) {
      updateData.projectId =
        typeof body.projectId === "string" && body.projectId.trim() && body.projectId !== "ALL"
          ? body.projectId.trim()
          : null;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.contentText !== undefined) {
      updateData.contentText =
        typeof body.contentText === "string" && body.contentText.trim()
          ? body.contentText.trim()
          : null;
    }
    if (body.sourceUrl !== undefined) {
      updateData.sourceUrl =
        typeof body.sourceUrl === "string" && body.sourceUrl.trim()
          ? body.sourceUrl.trim()
          : null;
    }
    if (body.fileName !== undefined) {
      updateData.fileName = body.fileName ? String(body.fileName) : null;
    }
    if (body.mimeType !== undefined) {
      updateData.mimeType = body.mimeType ? String(body.mimeType) : null;
    }
    if (body.fileDataBase64 !== undefined) {
      updateData.fileDataBase64 = sanitizeBase64Payload(body.fileDataBase64);
    }

    let syncWarning: string | null = null;
    if (body.resyncLink && (updateData.sourceUrl || existing.sourceUrl)) {
      const targetUrl = String(updateData.sourceUrl ?? existing.sourceUrl);
      const fetched = await tryFetchExternalStandardText(targetUrl);
      if (fetched.text) updateData.contentText = fetched.text;
      syncWarning = fetched.warning;
    }

    await prisma.qcStandardDoc.update({
      where: { id },
      data: updateData,
    });

    const docs = await listAllQcStandardDocsForLeader();
    return NextResponse.json({ docs, syncWarning });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật Tài liệu Tiêu chuẩn QC.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền xóa Tài liệu Tiêu chuẩn QC." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id") || "";
  if (!id) {
    try {
      const body = await request.json();
      id = String(body.id ?? "").trim();
    } catch {
      // ignore empty body
    }
  }

  if (!id) {
    return NextResponse.json(
      { error: "Thiếu mã tài liệu cần xóa." },
      { status: 400 }
    );
  }

  await prisma.qcStandardDoc.deleteMany({ where: { id } });
  const docs = await listAllQcStandardDocsForLeader();
  return NextResponse.json({ docs });
}
