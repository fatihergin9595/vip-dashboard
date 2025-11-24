import { NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { vipLevels } from "@/db/schema/viplevels";
import { sql } from "drizzle-orm";

export async function GET() {
  const rows = await db.execute(sql`
    SELECT id, name, min_amount AS "min", max_amount AS "max"
    FROM ${vipLevels}
    WHERE is_active = true
    ORDER BY sort_order
  `);
  return NextResponse.json({ ok: true, items: rows });
}