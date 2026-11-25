import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại hoặc đã tạm khóa." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentScope: user.departmentScope,
        title: user.title,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 ngày
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Lỗi đăng nhập hệ thống." },
      { status: 500 }
    );
  }
}
