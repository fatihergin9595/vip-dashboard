// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";

export const dynamic = 'force-dynamic';

const LEVELS = [
  { id: "iron", name: "Demir", min: 10_000, max: 49_999 },
  { id: "bronze", name: "Bronz", min: 50_000, max: 99_999 },
  { id: "silver", name: "Gümüş", min: 100_000, max: 199_999 },
  { id: "gold", name: "Altın", min: 200_000, max: 499_999 },
  { id: "plat", name: "Platin", min: 500_000, max: 1_999_999 },
  { id: "diamond", name: "Elmas", min: 2_000_000, max: null },
];

const DEPOSIT_SCALE = 1;

export async function GET() {
  try {
    const minVipDeposit = LEVELS[0].min * DEPOSIT_SCALE;

    // Özet İstatistikler
    const totalVipRes = await db.execute(
      sql`SELECT COUNT(*) as "count" FROM ${players} WHERE ${players.deposit90d} >= ${minVipDeposit}`
    );
    const totalVipMembers = Number(totalVipRes.rows[0]?.count ?? 0);

    const newVipRes = await db.execute(
      sql`
        SELECT COUNT(*) as "count" 
        FROM ${players} 
        WHERE ${players.deposit90d} >= ${minVipDeposit}
          AND ${players.createdAt} >= NOW() - INTERVAL '15 days'
      `
    );
    const newVipMembers = Number(newVipRes.rows[0]?.count ?? 0);

    const totalDepositRes = await db.execute(
      sql`SELECT COALESCE(SUM(${players.deposit90d}), 0) as "sum" FROM ${players} WHERE ${players.deposit90d} >= ${minVipDeposit}`
    );
    const last90dDeposit = Number(totalDepositRes.rows[0]?.sum ?? 0) / DEPOSIT_SCALE;

    // Loss Bonus Toplamı (Sadece 'added_cash' yani Nakit)
    const totalLossRes = await db.execute(
      sql`SELECT COALESCE(SUM(added_cash), 0) as "sum" FROM public.loss_bonus_requests WHERE status = 'APPROVED'`
    );
    const lossBonusTotal = Number(totalLossRes.rows[0]?.sum ?? 0);

    const summary = {
      totalVipMembers,
      newVipMembers,
      last90dDeposit,
      lossBonusTotal,
      // promoBonusTotal KANLDITIRILDI
    };

    // Seviye Dağılımı
    const levels = [];
    for (const lvl of LEVELS) {
      const min = lvl.min * DEPOSIT_SCALE;
      const max = lvl.max ? lvl.max * DEPOSIT_SCALE : null;
      
      let query;
      if (max) {
        query = sql`
          SELECT 
            COUNT(*) as "memberCount", 
            COALESCE(SUM(${players.deposit90d}), 0) as "totalDeposit" 
          FROM ${players} 
          WHERE ${players.deposit90d} >= ${min} AND ${players.deposit90d} <= ${max}
        `;
      } else {
        query = sql`
          SELECT 
            COUNT(*) as "memberCount", 
            COALESCE(SUM(${players.deposit90d}), 0) as "totalDeposit" 
          FROM ${players} 
          WHERE ${players.deposit90d} >= ${min}
        `;
      }

      const res = await db.execute(query);
      const row = res.rows[0] as any;
      const count = Number(row.memberCount ?? 0);
      const deposit = Number(row.totalDeposit ?? 0) / DEPOSIT_SCALE;

      levels.push({
        id: lvl.id,
        name: lvl.name,
        min: lvl.min,
        max: lvl.max,
        memberCount: count,
        totalDeposit: deposit,
      });
    }

    return NextResponse.json({
      ok: true,
      summary,
      levels
    }, { status: 200 });

  } catch (err: any) {
    console.error("dashboard API error", err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status: 500 }
    );
  }
}