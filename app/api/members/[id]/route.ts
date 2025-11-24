// app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";

// Dashboard / members sayfasıyla aynı VIP seviye aralıkları
const LEVELS = [
  { id: "iron", name: "Demir", min: 10_000, max: 49_999 },
  { id: "bronze", name: "Bronz", min: 50_000, max: 99_999 },
  { id: "silver", name: "Gümüş", min: 100_000, max: 199_999 },
  { id: "gold", name: "Altın", min: 200_000, max: 499_999 },
  { id: "plat", name: "Platin", min: 500_000, max: 1_999_999 },
  { id: "diamond", name: "Elmas", min: 2_000_000, max: null as number | null },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }, // <-- params Promise
) {
  try {
    // ---- ID parsing (params Promise olduğu için await) ----
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, message: "Invalid id" },
        { status: 400 },
      );
    }

    // ---- QUERY PARAMS: lossPage ----
    const { searchParams } = new URL(req.url);
    const lossPage = Number(searchParams.get("lossPage") ?? "1");
    const page = Number.isFinite(lossPage) && lossPage > 0 ? lossPage : 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    // --------------------------------------------------
    // 1) PLAYER TEMEL VERİLERİ
    // --------------------------------------------------
    const playerResult = await db.execute(
      sql`
        SELECT
          p.id,
          p.username,
          p.backoffice_id                   AS "backofficeId",
          p.vip_status                      AS "vipStatus",
          p.iron_vip_reward_claimed_at      AS "ironRewardAt",
          p.bronze_vip_reward_claimed_at    AS "bronzeRewardAt",
          p.silver_vip_reward_claimed_at    AS "silverRewardAt",
          p.gold_vip_reward_claimed_at      AS "goldRewardAt",
          p.plat_vip_reward_claimed_at      AS "platRewardAt",
          p.diamond_vip_reward_claimed_at   AS "diamondRewardAt",
          p.created_at                      AS "createdAt",
          p.deposit_amount_last_90d         AS "deposit90d"
        FROM ${players} AS p
        WHERE p.id = ${id}
        LIMIT 1
      `,
    );

    const raw = (playerResult.rows as any[])[0];
    if (!raw) {
      return NextResponse.json(
        { ok: false, message: "Member not found" },
        { status: 404 },
      );
    }

    const deposit90d: number = Number(raw.deposit90d ?? 0);

    // Aktif level
    const level =
      LEVELS.find(
        (l) =>
          deposit90d >= l.min &&
          (l.max === null || deposit90d <= (l.max as number)),
      ) ?? null;

    // VIP ödülleri ve history
    const rewards: Record<LevelId, string | null> = {
      iron: raw.ironRewardAt,
      bronze: raw.bronzeRewardAt,
      silver: raw.silverRewardAt,
      gold: raw.goldRewardAt,
      plat: raw.platRewardAt,
      diamond: raw.diamondRewardAt,
    };

    const history = LEVELS.reduce<
      { id: LevelId; name: string; rewardAt: string }[]
    >((acc, lvl) => {
      const rewardAt = rewards[lvl.id];
      if (rewardAt) {
        acc.push({
          id: lvl.id,
          name: lvl.name,
          rewardAt,
        });
      }
      return acc;
    }, []).sort((a, b) => a.rewardAt.localeCompare(b.rewardAt));

    // --------------------------------------------------
    // 2) LOSS BONUS ÖZETİ (APPROVED)
    // --------------------------------------------------
    const lossSummaryResult = await db.execute(
      sql`
        SELECT
          COALESCE(SUM(l.loss), 0)              AS "totalLoss",
          COALESCE(SUM(l.added_cash), 0)        AS "totalBonusCash",
          COALESCE(SUM(l.added_freespin), 0)    AS "totalBonusFreespin",
          COALESCE(SUM(l.added_freebet), 0)     AS "totalBonusFreebet",
          COUNT(*)                              AS "count"
        FROM public.loss_bonus_requests AS l
        WHERE l.player_id = ${id}
          AND l.status = 'APPROVED'
      `,
    );

    let lossSummaryRow: any = (lossSummaryResult.rows as any[])[0];
    if (!lossSummaryRow) {
      lossSummaryRow = {
        totalLoss: 0,
        totalBonusCash: 0,
        totalBonusFreespin: 0,
        totalBonusFreebet: 0,
        count: 0,
      };
    }

    const lossSummary = {
      totalLoss: Number(lossSummaryRow.totalLoss ?? 0),
      totalBonusCash: Number(lossSummaryRow.totalBonusCash ?? 0),
      totalBonusFreespin: Number(lossSummaryRow.totalBonusFreespin ?? 0),
      totalBonusFreebet: Number(lossSummaryRow.totalBonusFreebet ?? 0),
      count: Number(lossSummaryRow.count ?? 0),
    };

    // --------------------------------------------------
    // 3) LOSS BONUS LİSTESİ (PAGINATION, APPROVED)
    // --------------------------------------------------
    const lossHistoryResult = await db.execute(
      sql`
        SELECT
          l.id,
          l.loss                 AS "loss",
          l.added_cash           AS "addedCash",
          l.added_freespin       AS "addedFreespin",
          l.added_freebet        AS "addedFreebet",
          l.requested_vip_status AS "requestedVipStatus",
          l.created_at           AS "createdAt",
          l.status               AS "status",
          l.preferred_bonus_type AS "preferredBonusType",
          l.message              AS "message"
        FROM public.loss_bonus_requests AS l
        WHERE l.player_id = ${id}
          AND l.status = 'APPROVED'
        ORDER BY l.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
    );

    const lossHistory = (lossHistoryResult.rows as any[]).map((row) => ({
      id: row.id,
      loss: Number(row.loss ?? 0),
      addedCash: Number(row.addedCash ?? 0),
      addedFreespin:
        row.addedFreespin === null ? null : Number(row.addedFreespin),
      addedFreebet:
        row.addedFreebet === null ? null : Number(row.addedFreebet),
      requestedVipStatus: row.requestedVipStatus,
      createdAt: row.createdAt,
      status: row.status,
      preferredBonusType: row.preferredBonusType,
      message: row.message ?? "",
    }));

    const lossCountResult = await db.execute(
      sql`
        SELECT
          COUNT(*) AS "total"
        FROM public.loss_bonus_requests AS l
        WHERE l.player_id = ${id}
          AND l.status = 'APPROVED'
      `,
    );

    const totalLossCount = Number(
      (lossCountResult.rows as any[])[0]?.total ?? 0,
    );
    const totalLossPages =
      totalLossCount === 0 ? 1 : Math.ceil(totalLossCount / pageSize);

    // --------------------------------------------------
    // 4) RESPONSE
    // --------------------------------------------------
    return NextResponse.json({
      ok: true,
      member: {
        id: raw.id,
        username: raw.username,
        backofficeId: raw.backofficeId,
        vipStatus: raw.vipStatus,
        createdAt: raw.createdAt,
        deposit90d,
        level,
        rewards,
        history,
        lossSummary,
        lossHistory,
        lossHistoryPage: page,
        lossHistoryPageSize: pageSize,
        lossHistoryTotal: totalLossCount,
        lossHistoryTotalPages: totalLossPages,
      },
    });
  } catch (err: any) {
    console.error("member detail api error", err);
    return NextResponse.json(
      {
        ok: false,
        message: err?.message ?? "Unexpected error",
      },
      { status: 500 },
    );
  }
}