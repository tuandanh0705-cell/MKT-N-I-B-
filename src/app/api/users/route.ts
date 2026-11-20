import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { joinPinnedChatRooms } from "@/lib/chat";
import { normalizeDailyKpiList } from "@/lib/daily-kpi";
import type { DepartmentScope, EmploymentType, UserRole } from "@/generated/prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Member chỉ nhận danh sách nhân sự tối giản để chọn người giao/nhận Order
  const users = await prisma.user.findMany({
    where: user.role === "LEADER" ? {} : { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: user.role === "LEADER",
      role: true,
      departmentScope: true,
      employmentType: true,
      title: true,
      avatarColor: true,
      pirateCharacter: true,
      birthDate: true,
      weeklyImageLimit: true,
      dailyVideoLimit: true,
      dailyKpiJson: true,
      isActive: true,
      projectMemberships:
        user.role === "LEADER"
          ? {
              include: {
                project: { select: { id: true, name: true, slug: true } },
              },
            }
          : false,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền tạo tài khoản nhân sự." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "123456");

    if (!name || !email) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên và email nhân sự." },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Email này đã tồn tại trên hệ thống." },
        { status: 400 }
      );
    }

    const parsedDailyKpi =
      body.dailyKpiJson !== undefined && body.dailyKpiJson !== null
        ? normalizeDailyKpiList(body.dailyKpiJson)
        : null;
    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: (body.role as UserRole) || "MEMBER",
        departmentScope: (body.departmentScope as DepartmentScope) || "CONTENT",
        employmentType: (body.employmentType as EmploymentType) || "FULL_TIME",
        title: String(body.title || "Nhân viên Marketing"),
        avatarColor: String(body.avatarColor || "#2563eb"),
        pirateCharacter: body.pirateCharacter
          ? String(body.pirateCharacter).trim()
          : null,
        birthDate: body.birthDate ? String(body.birthDate).trim() : null,
        weeklyImageLimit: body.weeklyImageLimit ? Number(body.weeklyImageLimit) : null,
        dailyVideoLimit: body.dailyVideoLimit ? Number(body.dailyVideoLimit) : null,
        ...(parsedDailyKpi !== null
          ? { dailyKpiJson: parsedDailyKpi as unknown as Prisma.InputJsonValue }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentScope: true,
        employmentType: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        birthDate: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        dailyKpiJson: true,
        isActive: true,
      },
    });

    await joinPinnedChatRooms(created.id);

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Không thể tạo tài khoản." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới được chỉnh sửa thông tin nhân sự." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Thiếu id nhân sự." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.role !== undefined) data.role = body.role as UserRole;
    if (body.departmentScope !== undefined) {
      data.departmentScope = body.departmentScope as DepartmentScope;
    }
    if (body.employmentType !== undefined) {
      data.employmentType = body.employmentType as EmploymentType;
    }
    if (body.title !== undefined) data.title = String(body.title);
    if (body.avatarColor !== undefined) data.avatarColor = String(body.avatarColor);
    if (body.pirateCharacter !== undefined) {
      data.pirateCharacter = body.pirateCharacter
        ? String(body.pirateCharacter).trim()
        : null;
    }
    if (body.birthDate !== undefined) {
      data.birthDate = body.birthDate ? String(body.birthDate).trim() : null;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.weeklyImageLimit !== undefined) {
      data.weeklyImageLimit = body.weeklyImageLimit ? Number(body.weeklyImageLimit) : null;
    }
    if (body.dailyVideoLimit !== undefined) {
      data.dailyVideoLimit = body.dailyVideoLimit ? Number(body.dailyVideoLimit) : null;
    }
    if (body.dailyKpiJson !== undefined) {
      data.dailyKpiJson =
        body.dailyKpiJson === null
          ? Prisma.JsonNull
          : (normalizeDailyKpiList(body.dailyKpiJson) as unknown as Prisma.InputJsonValue);
      data.lastKpiSyncDate = null;
    }
    if (body.newPassword && String(body.newPassword).trim().length >= 4) {
      data.passwordHash = await hashPassword(String(body.newPassword).trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentScope: true,
        employmentType: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        birthDate: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        dailyKpiJson: true,
        isActive: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật nhân sự." },
      { status: 500 }
    );
  }
}
