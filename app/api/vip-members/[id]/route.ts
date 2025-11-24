// app/api/vip-members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";

const VIP_LEVELS = [
  { id: "iron", name: "Demir", min: 10_000, max: 24_999 },
  { id: "bronze", name: "Bronz", min: 25_000, max: 49_999 },
  { id: "silver", name: "Gümüş", min: 50_000, max: 99_999 },
  { id: "gold", name: "Altın", min: 100_000, max: 249_999 },
  { id: "plat", name: "Platin", min: 250_000, max: 999_999 },
  { id: "diamond", name: "Elmas", min: 1_000_000, max: null as number | null },
];

function getLevelByDeposit(amount: number | null) {
  const val = amount ?? 0;
  const found =
    VIP_LEVELS.find(
      (l) =>
        val >= l.min &&
        (l.max === null || val <= l.max)
    ) ?? null;
  return found;
}

export async function GET(req: NextRequest, ctx: any) {
  try {
    // Hem Promise hem normal obje durumunu destekle
    const rawParams = ctx?.params;
    const params =
      rawParams && typeof rawParams.then === "function"
        ? await rawParams
        : rawParams;

    const idStr = decodeURIComponent(params?.id ?? "").trim();
    const numericId = Number(idStr);

    if (!idStr || !Number.isFinite(numericId)) {
      return NextResponse.json(
        { ok: false, message: "Invalid id" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(players)
      .where(eq(players.id, numericId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Member not found" },
        { status: 404 }
      );
    }

    const level = getLevelByDeposit(row.deposit90d);

    const history = [
      { id: "iron", name: "Demir", rewardAt: row.ironRewardAt },
      { id: "bronze", name: "Bronz", rewardAt: row.bronzeRewardAt },
      { id: "silver", name: "Gümüş", rewardAt: row.silverRewardAt },
      { id: "gold", name: "Altın", rewardAt: row.goldRewardAt },
      { id: "plat", name: "Platin", rewardAt: row.platRewardAt },
      { id: "diamond", name: "Elmas", rewardAt: row.diamondRewardAt },
    ].filter((h) => h.rewardAt);

    return NextResponse.json({
      ok: true,
      member: {
        id: row.id,
        username: row.username,
        backofficeId: row.backofficeId,
        vipStatus: row.vipStatus,
        createdAt: row.createdAt,
        deposit90d: row.deposit90d ?? 0,
        level: level
          ? {
              id: level.id,
              name: level.name,
              min: level.min,
              max: level.max,
            }
          : null,
        rewards: {
          iron: row.ironRewardAt,
          bronze: row.bronzeRewardAt,
          silver: row.silverRewardAt,
          gold: row.goldRewardAt,
          plat: row.platRewardAt,
          diamond: row.diamondRewardAt,
        },
        history,
      },
    });
  } catch (err: any) {
    console.error("vip-member detail error", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err?.message ?? "Internal error while loading VIP member detail",
      },
      { status: 500 }
    );
  }
}