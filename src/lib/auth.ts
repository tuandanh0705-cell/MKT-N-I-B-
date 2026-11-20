import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";
import type {
  DepartmentScope,
  EmploymentType,
  UserRole,
} from "@/generated/prisma/client";

export { SESSION_COOKIE_NAME, signSessionToken, verifySessionToken };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentScope: DepartmentScope;
  employmentType: EmploymentType;
  title: string;
  avatarColor: string;
  pirateCharacter: string | null;
  preferredTone: string;
  preferredIcon: string | null;
  personalMotto: string | null;
  birthDate: string | null;
  weeklyImageLimit: number | null;
  dailyVideoLimit: number | null;
  dailyKpiJson: unknown;
  lastKpiSyncDate: string | null;
  isActive: boolean;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Lấy user hiện tại từ HTTP-only cookie và xác thực lại trên DB
 * (đảm bảo thay đổi role hoặc khóa tài khoản có hiệu lực ngay lập tức).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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
      dailyKpiJson: true,
      lastKpiSyncDate: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
}
