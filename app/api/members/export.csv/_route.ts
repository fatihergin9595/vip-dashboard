// app/api/members/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";

type LevelId = "iron" | "bronze" | "silver" | "gold" | "plat" | "diamond";

const LEVELS: { id: LevelId; name: string; min: number; max: number | null }[] =
  [
    { id: "iron", name: "Demir", min: 10_000, max: 49_999 },
    { id: "bronze", name: "Bronz", min: 50_000, max: 99_999 },
    { id: "silver", name: "Gümüş", min: 100_000, max: 199_999 },
    { id: "gold", name: "Altın", min: 200_000, max: 499_999 },
    { id: "plat", name: "Platin", min: 500_000, max: 1_999_999 },
    { id: "diamond", name: "Elmas", min: 2_000_000, max: null },
  ];

function detectLevel(
  deposit90d: number | null
): { id: LevelId | null; name: string | null } {
  if (!deposit90d || deposit90d <= 0) return { id: null, name: null };
  const lvl = LEVELS.find(
    (l) =>
      deposit90d >= l.min &&
      (l.max == null || deposit90d <= (l.max as number))
  );
  if (!lvl) return { id: null, name: null };
  return { id: lvl.id, name: lvl.name };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR");
}

function diffInDays(from: Date, to: Date): number | null {
  const t1 = from.getTime();
  const t2 = to.getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = params?.id;
    const memberId = Number(rawId);

    if (!rawId || !Number.isInteger(memberId) || memberId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Invalid id" },
        { status: 400 }
      );
    }

    // 1) Oyuncu + reward tarihleri
    const playerResult = await db.execute(
      sql`
        SELECT
          p.id,
          p.username,
          p.backoffice_id AS "backofficeId",
          p.vip_status    AS "vipStatus",
          p.created_at    AS "createdAt",
          p.deposit_amount_last_90d AS "deposit90d",
          p.iron_vip_reward_claimed_at    AS "ironRewardAt",
          p.bronze_vip_reward_claimed_at  AS "bronzeRewardAt",
          p.silver_vip_reward_claimed_at  AS "silverRewardAt",
          p.gold_vip_reward_claimed_at    AS "goldRewardAt",
          p.plat_vip_reward_claimed_at    AS "platRewardAt",
          p.diamond_vip_reward_claimed_at AS "diamondRewardAt"
        FROM ${players} AS p
        WHERE p.id = ${memberId}
        LIMIT 1
      `
    );

    if (!playerResult.rows.length) {
      return NextResponse.json(
        { ok: false, message: "Member not found" },
        { status: 404 }
      );
    }

    const row = playerResult.rows[0] as any;

    // 2) Loss özet bilgisi
    const lossSummaryResult = await db.execute(
      sql`
        SELECT
          COALESCE(SUM(l.loss), 0)           AS "totalLoss",
          COALESCE(SUM(l.added_cash), 0)     AS "totalBonusCash",
          COALESCE(SUM(l.added_freespin), 0) AS "totalBonusFreespin",
          COALESCE(SUM(l.added_freebet), 0)  AS "totalBonusFreebet",
          COUNT(*)                           AS "count"
        FROM public.loss_bonus_requests AS l
        WHERE l.player_id = ${memberId}
          AND l.status = 'APPROVED'
      `
    );

    const loss = (lossSummaryResult.rows[0] ?? {}) as any;

    // 3) VIP seviye tespiti
    const deposit90d: number | null =
      row.deposit90d != null ? Number(row.deposit90d) : null;
    const levelInfo = detectLevel(deposit90d);

    // 4) İlk / son VIP ödülü & gün farkı (reward kolonlarından)
    const rewardDates: string[] = [
      row.ironRewardAt,
      row.bronzeRewardAt,
      row.silverRewardAt,
      row.goldRewardAt,
      row.platRewardAt,
      row.diamondRewardAt,
    ].filter(Boolean);

    let firstReward: string | null = null;
    let lastReward: string | null = null;
    let daysSinceLast: number | null = null;

    if (rewardDates.length > 0) {
      const asDates = rewardDates
        .map((v) => new Date(v))
        .filter((d) => !Number.isNaN(d.getTime()));
      if (asDates.length > 0) {
        asDates.sort((a, b) => a.getTime() - b.getTime());
        firstReward = asDates[0].toISOString();
        lastReward = asDates[asDates.length - 1].toISOString();
        daysSinceLast = diffInDays(asDates[asDates.length - 1], new Date());
      }
    }

    // 5) CSV satırı
    const headers = [
      "Kullanıcı ID",
      "Kullanıcı Adı",
      "Backoffice ID",
      "VIP Statüsü",
      "VIP Seviye",
      "Son 90 Gün Yatırım",
      "Toplam Loss",
      "Toplam Nakit Bonus",
      "Toplam Freespin",
      "Toplam Freebet",
      "Toplam VIP Kayıp Talep Sayısı",
      "Kayıt Tarihi",
      "İlk VIP Ödülü",
      "Son VIP Ödülü",
      "Son VIP Ödülünden Sonra Geçen Gün",
    ];

    const values = [
      String(row.id ?? ""),
      String(row.username ?? ""),
      String(row.backofficeId ?? ""),
      String(row.vipStatus ?? ""),
      levelInfo.name ?? "",
      deposit90d != null ? String(deposit90d) : "",
      loss.totalLoss != null ? String(loss.totalLoss) : "",
      loss.totalBonusCash != null ? String(loss.totalBonusCash) : "",
      loss.totalBonusFreespin != null ? String(loss.totalBonusFreespin) : "",
      loss.totalBonusFreebet != null ? String(loss.totalBonusFreebet) : "",
      loss.count != null ? String(loss.count) : "",
      formatDate(row.createdAt),
      formatDate(firstReward),
      formatDate(lastReward),
      daysSinceLast != null ? String(daysSinceLast) : "",
    ];

    const csv =
      headers.map(csvEscape).join(",") +
      "\n" +
      values.map(csvEscape).join(",") +
      "\n";

    const filename = `vip-member-${row.id ?? "member"}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("member export error", err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}