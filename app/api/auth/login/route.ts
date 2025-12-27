// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      return NextResponse.json(
        { ok: false, message: "Sunucu yapılandırma hatası" },
        { status: 500 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, message: "Kullanıcı adı ve şifre gerekli" },
        { status: 400 }
      );
    }

    if (username !== adminUser || password !== adminPass) {
      return NextResponse.json(
        { ok: false, message: "Kullanıcı adı veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Basit token: ADMIN_USER + ADMIN_PASS ile karşılaştırmalı kontrol yapacağız (middleware)
    // Burada JWT'e gerek yok (istersen sonra yükseltiriz).
    const token = Buffer.from(`${adminUser}:${adminPass}`).toString("base64");

    const res = NextResponse.json(
      { ok: true, user: { username: adminUser } },
      { status: 200 }
    );

    res.cookies.set({
      name: "vip_admin",
      value: token,
      httpOnly: true,
      secure: true, // Netlify HTTPS'te çalışır
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 gün
    });

    return res;
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { ok: false, message: "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}