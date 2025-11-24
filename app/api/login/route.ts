// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // boş geçerse
  }

  const { username, password } = body;

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "supersecret";

  if (username === adminUser && password === adminPass) {
    const res = NextResponse.json({ ok: true });

    res.cookies.set("vip_auth", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 saat
    });

    return res;
  }

  return NextResponse.json(
    { ok: false, message: "Geçersiz kullanıcı adı veya şifre" },
    { status: 401 }
  );
}