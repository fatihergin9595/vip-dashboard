import { NextRequest, NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS app;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app.vip_levels (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        min_amount numeric NOT NULL,
        max_amount numeric,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true
      );
    `);

    // Temiz demo kur (mevcutları bozmadan eklemek istersen önce truncate'ı kaldır)
    await db.execute(sql`DELETE FROM app.vip_levels;`);

    const rows = [
      { name: "Demir", min: 10000, max: 24999, order: 10 },
      { name: "Bronz", min: 25000, max: 49999, order: 20 },
      { name: "Gümüş", min: 50000, max: 99999, order: 30 },
      { name: "Altın", min: 100000, max: 249999, order: 40 },
      { name: "Platin", min: 250000, max: 999999, order: 50 },
      { name: "Elmas", min: 1000000, max: null, order: 60 },
    ];

    for (const r of rows) {
      await db.execute(sql`
        INSERT INTO app.vip_levels (name, min_amount, max_amount, sort_order, is_active)
        VALUES (${r.name}, ${r.min}, ${r.max}, ${r.order}, true)
      `);
    }

    const levels = await db.execute(sql`
      SELECT id::text, name, min_amount, max_amount, sort_order, is_active
      FROM app.vip_levels ORDER BY sort_order
    `);

    return NextResponse.json({ ok: true, levels });
  } catch (e: any) {
    console.error("seed-levels error", e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}