import { NextRequest, NextResponse } from "next/server";

// Giriş sistemini devre dışı bıraktık.
// Artık tüm isteklere doğrudan izin veriliyor.
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Matcher kalsa bile fonksiyon hep next() döndüğü için sorun olmaz.
    "/dashboard/:path*",
    "/members/:path*",
    "/api/dashboard",
    "/api/members/:path*",
    "/api/vip-members/:path*",
  ],
};