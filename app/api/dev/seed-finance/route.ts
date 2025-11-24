import { NextRequest, NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { sql } from "drizzle-orm";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export async function GET(_req: NextRequest) {
  try {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS app;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app.members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name text NOT NULL,
        phone text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app.deposits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id uuid NOT NULL,
        amount numeric NOT NULL,
        happened_at timestamptz NOT NULL,
        CONSTRAINT fk_dep_member FOREIGN KEY (member_id) REFERENCES app.members(id) ON DELETE CASCADE
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app.bonuses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id uuid NOT NULL,
        amount numeric NOT NULL,
        happened_at timestamptz NOT NULL,
        type text,
        CONSTRAINT fk_bonus_member FOREIGN KEY (member_id) REFERENCES app.members(id) ON DELETE CASCADE
      );
    `);

    // En az 6 üye olsun
    let members = (await db.execute(sql`
      SELECT id::text AS id FROM app.members ORDER BY created_at DESC LIMIT 6;
    `)) as Array<{ id: string }>;

    if (members.length < 6) {
      const need = 6 - members.length;
      for (let i = 0; i < need; i++) {
        const inserted = (await db.execute(sql`
          INSERT INTO app.members (full_name, phone, is_active, created_at)
          VALUES ('Ali Demo', '+905551112233', true, now())
          RETURNING id::text AS id
        `)) as Array<{ id: string }>;

        const newId = inserted?.[0]?.id;
        if (newId) members.push({ id: newId });
      }
    }

    // DEMO için finans verisini temizle (gerçekte kaldır)
    await db.execute(sql`DELETE FROM app.deposits;`);
    await db.execute(sql`DELETE FROM app.bonuses;`);

    // Her üyeye 3–6 arası rastgele deposit (son 90 gün)
    for (const m of members) {
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const day = Math.floor(Math.random() * 85) + 1; // 1..86 gün önce
        const amt = [5000, 10000, 20000, 30000, 50000, 100000][Math.floor(Math.random() * 6)];
        await db.execute(sql`
          INSERT INTO app.deposits (member_id, amount, happened_at)
          VALUES (${m.id}, ${amt}, ${daysAgo(day)})
        `);
      }
      // Bonuslar
      await db.execute(sql`
        INSERT INTO app.bonuses (member_id, amount, happened_at, type)
        VALUES
          (${m.id},  5000, ${daysAgo(10)}, 'promotion'),
          (${m.id},  3000, ${daysAgo(25)}, 'loss_gift')
      `);
    }

    const depCnt = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM app.deposits;`)) as Array<{ c: number }>;
    const bonCnt = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM app.bonuses;`)) as Array<{ c: number }>;

    return NextResponse.json({
      ok: true,
      inserted: {
        deposits: Number(depCnt?.[0]?.c ?? 0),
        bonuses: Number(bonCnt?.[0]?.c ?? 0),
      },
    });
  } catch (e: any) {
    console.error("seed-finance error", e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}