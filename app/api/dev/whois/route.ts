import { NextRequest, NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const id = decodeURIComponent((req.nextUrl.searchParams.get("id") ?? "")).trim();

    const [row] = await db.execute(sql`
      SELECT m.id::text AS id, m.full_name AS "fullName", m.created_at AS "createdAt"
      FROM "app"."members" m
      WHERE m.id::text = ${id}
      LIMIT 1
    `);

    const sample: any[] = await db.execute(sql`
      SELECT m.id::text AS id, m.full_name AS "fullName"
      FROM "app"."members" m
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    return NextResponse.json({ ok: true, id, found: row ?? null, sample });
  } catch (e: any) {
    console.error("whois error", e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}