import { NextResponse } from "next/server";
import { db } from "eskisrc/db/client";
import { members } from "eskisrc/db/schema/members";
import { deposits, withdrawals, bonuses } from "eskisrc/db/schema/money";
import { vipStatusHistory } from "eskisrc/db/schema/vipStatus";
import { vipLevels } from "@/db/schema/viplevels";
import { sql } from "drizzle-orm";

// DİKKAT: Date döndürüyoruz (string değil)
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

export async function GET() {
  try {
    // 0) VIP seviyeleri yoksa ekle
    const hasLevels = await db.select({ id: vipLevels.id }).from(vipLevels).limit(1);
    if (hasLevels.length === 0) {
      await db.insert(vipLevels).values([
        { name: 'Demir',  minAmount: '10000',   maxAmount: '24999',  color: '#4b5563', sortOrder: 1, isActive: true },
        { name: 'Bronz',  minAmount: '25000',   maxAmount: '49999',  color: '#b45309', sortOrder: 2, isActive: true },
        { name: 'Gümüş',  minAmount: '50000',   maxAmount: '99999',  color: '#9ca3af', sortOrder: 3, isActive: true },
        { name: 'Altın',  minAmount: '100000',  maxAmount: '249999', color: '#f59e0b', sortOrder: 4, isActive: true },
        { name: 'Platin', minAmount: '250000',  maxAmount: '999999', color: '#10b981', sortOrder: 5, isActive: true },
        { name: 'Elmas',  minAmount: '1000000', maxAmount: null,     color: '#6366f1', sortOrder: 6, isActive: true },
      ]);
    }

    // 1) Demo üye
    const [m] = await db.insert(members).values({
      fullName: "Ali Demo",
      phone: "+905551112233",
      isActive: true,
    }).returning();

    // 2) Son 90 günde yatırımlar (toplam 120.000)
    await db.insert(deposits).values([
      { memberId: m.id, amount: "40000", happenedAt: daysAgo(60) },
      { memberId: m.id, amount: "30000", happenedAt: daysAgo(30) },
      { memberId: m.id, amount: "50000", happenedAt: daysAgo(5)  },
    ]);

    // 3) "Altın" seviye id’sini bul
    const [altin] = await db.select({ id: vipLevels.id })
      .from(vipLevels)
      .where(sql`${vipLevels.name} = 'Altın'`)
      .limit(1);

    // 4) VIP status ve bonus
    if (altin?.id) {
      await db.insert(vipStatusHistory).values({
        memberId: m.id,
        levelId: altin.id,
        status: "granted",
        happenedAt: daysAgo(2),
      });
    }

    await db.insert(bonuses).values({
      memberId: m.id,
      type: "upgrade_reward",
      amount: "1000",
      happenedAt: daysAgo(1),
    });

    return NextResponse.json({ ok: true, memberId: m.id });
  } catch (e: any) {
    console.error("seed-members error:", e);
    return NextResponse.json({ ok: false, message: e?.message ?? String(e) }, { status: 500 });
  }
}