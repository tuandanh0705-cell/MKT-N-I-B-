import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getCurrentUser,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CHARACTER_IDS = new Set([
  "luffy",
  "zoro",
  "nami",
  "robin",
  "sanji",
  "franky",
  "chopper",
  "usopp",
  "mai",
  "jinbe",
  "brook",
  "ace",
  "sabo",
  "law",
  "shanks",
]);
const VALID_TONES = new Set(["PIRATE", "GENZ", "OFFICE"]);
const ACCOUNT_REGEX = /^[a-z0-9._%+-]+(@[a-z0-9.-]+\.[a-z]{2,})?$/i;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const updateData: {
      name?: string;
      email?: string;
      title?: string;
      birthDate?: string | null;
      personalMotto?: string | null;
      preferredTone?: string;
      preferredIcon?: string | null;
      pirateCharacter?: string | null;
      avatarColor?: string;
    } = {};

    // 1. Tên hiển thị
    if (body.name !== undefined) {
      const cleanedName = String(body.name ?? "").trim();
      if (cleanedName.length < 2 || cleanedName.length > 60) {
        return NextResponse.json(
          { error: "Tên hiển thị phải từ 2 đến 60 ký tự." },
          { status: 400 }
        );
      }
      updateData.name = cleanedName;
    }

    // 2. Tài khoản đăng nhập / Email
    let isChangingAccount = false;
    if (body.email !== undefined) {
      const cleanedAccount = String(body.email ?? "").trim().toLowerCase();
      if (cleanedAccount.length < 3 || cleanedAccount.length > 100) {
        return NextResponse.json(
          { error: "Tài khoản / Email phải từ 3 đến 100 ký tự." },
          { status: 400 }
        );
      }
      if (!ACCOUNT_REGEX.test(cleanedAccount)) {
        return NextResponse.json(
          {
            error:
              "Tài khoản / Email không được chứa dấu cách hoặc ký tự đặc biệt không hợp lệ.",
          },
          { status: 400 }
        );
      }

      if (cleanedAccount !== user.email.toLowerCase()) {
        isChangingAccount = true;
        const currentPassword = String(body.currentPassword ?? "");
        if (!currentPassword) {
          return NextResponse.json(
            {
              error:
                "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi tài khoản đăng nhập.",
            },
            { status: 400 }
          );
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordHash: true },
        });
        if (!dbUser) {
          return NextResponse.json(
            { error: "Tài khoản không tồn tại." },
            { status: 404 }
          );
        }

        const passwordValid = await verifyPassword(
          currentPassword,
          dbUser.passwordHash
        );
        if (!passwordValid) {
          return NextResponse.json(
            { error: "Mật khẩu hiện tại không chính xác." },
            { status: 400 }
          );
        }

        const duplicate = await prisma.user.findFirst({
          where: {
            email: cleanedAccount,
            id: { not: user.id },
          },
          select: { id: true },
        });
        if (duplicate) {
          return NextResponse.json(
            {
              error:
                "Tài khoản / Email này đã được thành viên khác sử dụng. Hãy chọn tên khác.",
            },
            { status: 400 }
          );
        }

        updateData.email = cleanedAccount;
      }
    }

    // 3. Chức danh hiển thị
    if (body.title !== undefined) {
      const cleanedTitle = String(body.title ?? "").trim();
      if (cleanedTitle.length > 80) {
        return NextResponse.json(
          { error: "Chức danh không được vượt quá 80 ký tự." },
          { status: 400 }
        );
      }
      if (cleanedTitle.length > 0) {
        updateData.title = cleanedTitle;
      }
    }

    // 4. Ngày sinh nhật
    if (body.birthDate !== undefined) {
      const cleanedBirth = body.birthDate ? String(body.birthDate).trim() : "";
      if (cleanedBirth && !/^\d{4}-\d{2}-\d{2}$/.test(cleanedBirth)) {
        return NextResponse.json(
          { error: "Ngày sinh nhật cần đúng định dạng YYYY-MM-DD." },
          { status: 400 }
        );
      }
      updateData.birthDate = cleanedBirth || null;
    }

    // 5. Khẩu hiệu cá nhân
    if (body.personalMotto !== undefined) {
      updateData.personalMotto = body.personalMotto
        ? String(body.personalMotto).trim().slice(0, 140)
        : null;
    }

    // 6. Giọng điệu hệ thống
    if (body.preferredTone !== undefined) {
      const tone = String(body.preferredTone);
      if (VALID_TONES.has(tone)) {
        updateData.preferredTone = tone;
      }
    }

    // 7. Icon cá nhân
    if (body.preferredIcon !== undefined) {
      updateData.preferredIcon = body.preferredIcon
        ? String(body.preferredIcon).trim().slice(0, 8)
        : null;
    }

    // 8. Nhân vật 3D
    if (body.pirateCharacter !== undefined) {
      const rawChar = body.pirateCharacter
        ? String(body.pirateCharacter).trim()
        : "";
      if (!rawChar) {
        updateData.pirateCharacter = null;
      } else if (VALID_CHARACTER_IDS.has(rawChar)) {
        updateData.pirateCharacter = rawChar;
      } else {
        return NextResponse.json(
          { error: "Nhân vật đại diện không hợp lệ." },
          { status: 400 }
        );
      }
    }

    // 9. Màu đại diện
    if (body.avatarColor !== undefined) {
      const color = String(body.avatarColor ?? "").trim();
      if (HEX_COLOR_REGEX.test(color)) {
        updateData.avatarColor = color;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ user, unchanged: true });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentScope: true,
        employmentType: true,
        title: true,
        avatarColor: true,
        pirateCharacter: true,
        preferredTone: true,
        preferredIcon: true,
        personalMotto: true,
        birthDate: true,
        weeklyImageLimit: true,
        dailyVideoLimit: true,
        isActive: true,
      },
    });

    const response = NextResponse.json({
      user: updated,
      accountChanged: isChangingAccount,
    });

    // Làm mới JWT session cookie ngay khi đổi Tên hoặc Tài khoản đăng nhập
    if (updateData.name !== undefined || updateData.email !== undefined) {
      const newToken = await signSessionToken({
        userId: updated.id,
        role: updated.role,
        name: updated.name,
        email: updated.email,
      });
      response.cookies.set(SESSION_COOKIE_NAME, newToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }

    return response;
  } catch (err) {
    console.error("Update personal account error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin tài khoản." },
      { status: 500 }
    );
  }
}
