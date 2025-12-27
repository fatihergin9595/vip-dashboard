// middleware.ts
import { NextRequest, NextResponse } from "next/server";

function isValidAdminCookie(req: NextRequest) {
  const cookie = req.cookies.get("vip_admin")?.value;
  if (!cookie) return false;

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  if (!adminUser || !adminPass) return false;

  const expected = Buffer.from(`${adminUser}:${adminPass}`).toString("base64");
  return cookie === expected;
}

function isValidBotToken(req: NextRequest) {
  const token = process.env.PANEL_BOT_API_TOKEN;
  if (!token) return false;

  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const isProtectedApi =
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/members") ||
    pathname.startsWith("/api/vip-members");

  const isProtectedPage =
    pathname.startsWith("/dashboard") || pathname.startsWith("/members");

  // Auth endpoints serbest
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // Korumalı API: cookie veya bot token şart
  if (isApi && isProtectedApi) {
    if (isValidAdminCookie(req) || isValidBotToken(req)) {
      return NextResponse.next();
    }
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // Korumalı sayfalar: cookie şart (bot buraya girmez zaten)
  if (isProtectedPage) {
    if (isValidAdminCookie(req)) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/members/:path*",
    "/api/dashboard",
    "/api/members/:path*",
    "/api/vip-members/:path*",
    "/api/auth/:path*"
  ]
};