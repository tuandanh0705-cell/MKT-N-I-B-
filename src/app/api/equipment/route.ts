import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMediaProductionUser } from "@/lib/constants";
import type {
  EquipmentCategory,
  EquipmentCondition,
} from "@/generated/prisma/client";

async function ensureDefaultEquipment() {
  const count = await prisma.equipmentItem.count();
  if (count > 0) return;

  await prisma.equipmentItem.createMany({
    data: [
      {
        code: "CAM-01",
        name: "Máy quay Sony ZV-E10 #1",
        category: "CAMCORDER",
        description: "Gắn kèm lens Sigma 16mm f1.4 quay Video TikTok / Reels",
      },
      {
        code: "CAM-02",
        name: "Máy ảnh Canon EOS R50 Studio",
        category: "CAMERA",
        description: "Chụp ảnh sản phẩm, Thumbnail, ảnh sự kiện",
      },
      {
        code: "PHN-01",
        name: "iPhone 15 Pro Max (Quay Reels)",
        category: "PHONE",
        description: "Máy quay dựng nhanh ngoài hiện trường + Livestream",
      },
      {
        code: "PHN-02",
        name: "iPhone 14 Pro (Livestream Bàn)",
        category: "PHONE",
        description: "Gắn cố định hoặc mượn quay góc phụ Livestream",
      },
      {
        code: "MIC-01",
        name: "Bộ Mic DJI Mic 2 + Đèn Godox SL60",
        category: "MIC_LIGHT",
        description: "Thu âm phỏng vấn & chiếu sáng trong phòng Studio",
      },
    ],
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  await ensureDefaultEquipment();

  const items = await prisma.equipmentItem.findMany({
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  return NextResponse.json({ items });
}

function inferEquipmentCategory(name: string, code: string): EquipmentCategory {
  const s = `${name} ${code}`.toLowerCase();
  if (s.includes("iphone") || s.includes("điện thoại") || s.includes("phone") || s.includes("phn")) {
    return "PHONE";
  }
  if (s.includes("máy quay") || s.includes("camcorder") || s.includes("zv-") || s.includes("fx3")) {
    return "CAMCORDER";
  }
  if (s.includes("máy ảnh") || s.includes("camera") || s.includes("canon") || s.includes("sony")) {
    return "CAMERA";
  }
  if (s.includes("mic") || s.includes("đèn") || s.includes("light") || s.includes("godox")) {
    return "MIC_LIGHT";
  }
  return "OTHER";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const code =
      String(body.code ?? "").trim().toUpperCase() ||
      `EQ-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const managerName = body.managerName
      ? String(body.managerName).trim().slice(0, 80)
      : null;

    if (!name) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên thiết bị." },
        { status: 400 }
      );
    }

    const created = await prisma.equipmentItem.create({
      data: {
        name,
        code,
        category:
          (body.category as EquipmentCategory) ||
          inferEquipmentCategory(name, code),
        managerName,
        status: (body.status as EquipmentCondition) || "AVAILABLE",
        description: body.description ? String(body.description).trim() : null,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err) {
    console.error("Create equipment error:", err);
    return NextResponse.json(
      { error: "Không thể thêm thiết bị (mã code có thể bị trùng)." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (
    user.role !== "LEADER" &&
    !isMediaProductionUser(user.role, user.departmentScope)
  ) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc đội ngũ Media mới có quyền chỉnh sửa danh mục thiết bị." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const updated = await prisma.equipmentItem.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        code: body.code ? String(body.code).trim().toUpperCase() : undefined,
        category: (body.category as EquipmentCategory) || undefined,
        managerName:
          body.managerName !== undefined
            ? body.managerName
              ? String(body.managerName).trim().slice(0, 80)
              : null
            : undefined,
        status: (body.status as EquipmentCondition) || undefined,
        description:
          body.description !== undefined
            ? body.description
              ? String(body.description).trim()
              : null
            : undefined,
      },
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("Update equipment error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật thiết bị (mã code có thể bị trùng)." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (
    user.role !== "LEADER" &&
    !isMediaProductionUser(user.role, user.departmentScope)
  ) {
    return NextResponse.json(
      { error: "Chỉ Leader hoặc đội ngũ Media mới có quyền xóa thiết bị khỏi kho." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "Thiếu id thiết bị." }, { status: 400 });
  }
  await prisma.equipmentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
