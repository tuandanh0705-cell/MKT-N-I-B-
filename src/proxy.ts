import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/cron/reminders",
  "/api/intake/google-form",
  "/api/fanpages/ingest",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon.svg",
  "/avatars",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/avatars/") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|js)$/i.test(pathname) && pathname === "/sw.js" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname) ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    if (pathname === "/login") {
      const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        const session = await verifySessionToken(token);
        if (session) {
          const target = session.role === "LEADER" ? "/leader" : "/my-work";
          return NextResponse.redirect(new URL(target, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    (pathname.startsWith("/leader") || pathname.startsWith("/team")) &&
    session.role !== "LEADER"
  ) {
    return NextResponse.redirect(new URL("/my-work", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|avatars/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
