// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      console.error("ADMIN_USER / ADMIN_PASS env değişkenleri tanımlı değil.");
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

    // Basit eşitlik kontrolü – bu proje için yeterli
    if (username === adminUser && password === adminPass) {
      // Burada gerçek bir projede JWT / session vs. üretirdin.
      return NextResponse.json(
        {
          ok: true,
          user: {
            username: adminUser,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Kullanıcı adı veya şifre hatalı" },
      { status: 401 }
    );
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { ok: false, message: "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}