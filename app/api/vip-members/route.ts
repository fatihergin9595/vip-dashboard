// app/api/vip-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql, gte, lte, desc, asc, and } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";

// Önbelleklemeyi kapat
export const dynamic = 'force-dynamic';

// VIP seviye aralıkları – TL cinsinden
const LEVELS = [
  { id: "iron", name: "Demir", min: 10_000, max: 49_999 },
  { id: "bronze", name: "Bronz", min: 50_000, max: 99_999 },
  { id: "silver", name: "Gümüş", min: 100_000, max: 199_999 },
  { id: "gold", name: "Altın", min: 200_000, max: 499_999 },
  { id: "plat", name: "Platin", min: 500_000, max: 1_999_999 },
  { id: "diamond", name: "Elmas", min: 2_000_000, max: null as number | null },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

type SortOption =
  | "deposit_desc"
  | "deposit_asc"
  | "created_desc"
  | "created_asc";

type QuickFilter = "none" | "new" | "dropping" | "near_next_level";

// DB’den gelen ham satır tipi
type VipMemberRow = {
  id: number;
  username: string;
  backofficeId: number;
  vipStatus: string | null;
  deposit90d: number | null;
  createdAt: Date | null;
};

// API’nin döndüğü item
type VipMemberApiItem = {
  id: number;
  username: string;
  backofficeId: number;
  vipStatus: string | null;
  deposit90d: number; // TL
  createdAt: string;
  levelId: LevelId | null;
  levelName: string | null;

  lossBonusCount: number;
  lossTotal: number;
  lossBonusCash: number;
  lossBonusFreebet: number;
  lossBonusFreespin: number;
};

type ApiResponse = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: VipMemberApiItem[];
};

// DÜZELTME: Veritabanında yatırım "TL" olarak tutuluyor, "Kuruş" değil.
// Bu yüzden çarpanı 1 yapıyoruz.
const DEPOSIT_SCALE = 1;

// TL değer üzerinden seviye hesaplama
function getLevelFromDeposit(depositTl: number | null | undefined) {
  if (!depositTl || depositTl < LEVELS[0].min) {
    return { levelId: null, levelName: null };
  }

  for (const lvl of LEVELS) {
    if (lvl.max == null) {
      if (depositTl >= lvl.min) {
        return { levelId: lvl.id, levelName: lvl.name };
      }
    } else if (depositTl >= lvl.min && depositTl <= lvl.max) {
      return { levelId: lvl.id, levelName: lvl.name };
    }
  }

  return { levelId: null, levelName: null };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") ?? "";
    const vipLevel = searchParams.get("level") ?? searchParams.get("vipLevel") ?? "all";
    const sort = (searchParams.get("sort") as SortOption) ?? "deposit_desc";
    const minDeposit = searchParams.get("minDeposit");
    const maxDeposit = searchParams.get("maxDeposit");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const quickFilter = (searchParams.get("filter") ?? searchParams.get("quickFilter") ?? "none") as QuickFilter;

    const page = Number(searchParams.get("page") || "1") || 1;
    const pageSize = Number(searchParams.get("pageSize") || "50") || 50;
    const offset = (page - 1) * pageSize;

    // --- KOŞULLARI TOPLUYORUZ (AND Mantığı için) ---
    const conditions: any[] = [];

    // 1. Taban Koşul: Min 10.000 TL yatırım
    const MIN_VIP_TL = LEVELS[0].min; 
    conditions.push(
      sql`${players.deposit90d} >= ${MIN_VIP_TL * DEPOSIT_SCALE}`
    );

    // 2. Arama (İsim veya ID) - Büyük/Küçük harf duyarsız
    if (search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(lower(${players.username}) LIKE ${s} OR ${players.backofficeId}::text LIKE ${s})`
      );
    }

    // 3. VIP Seviye Filtresi
    if (vipLevel !== "all") {
      const lvl = LEVELS.find((l) => l.id === vipLevel);
      if (lvl) {
        const minVal = lvl.min * DEPOSIT_SCALE;
        if (lvl.max == null) {
          conditions.push(gte(players.deposit90d, minVal));
        } else {
          const maxVal = lvl.max * DEPOSIT_SCALE;
          conditions.push(
            sql`${players.deposit90d} BETWEEN ${minVal} AND ${maxVal}`
          );
        }
      }
    }

    // 4. Yatırım Aralığı
    if (minDeposit && !Number.isNaN(Number(minDeposit))) {
      const valTl = Number(minDeposit);
      conditions.push(gte(players.deposit90d, valTl * DEPOSIT_SCALE));
    }
    if (maxDeposit && !Number.isNaN(Number(maxDeposit))) {
      const valTl = Number(maxDeposit);
      conditions.push(lte(players.deposit90d, valTl * DEPOSIT_SCALE));
    }

    // 5. Kayıt Tarihi
    if (createdFrom) {
      conditions.push(sql`${players.createdAt} >= ${createdFrom}::date`);
    }
    if (createdTo) {
      conditions.push(sql`${players.createdAt} <= ${createdTo}::date`);
    }

    // 6. Hızlı Filtreler
    if (quickFilter === "new") {
      conditions.push(
        sql`${players.createdAt} >= NOW() - INTERVAL '15 days'`
      );
    }
    else if (quickFilter === "dropping") {
      conditions.push(sql`
        CASE UPPER(${players.vipStatus})
          WHEN 'IRON'    THEN 1
          WHEN 'BRONZE'  THEN 2
          WHEN 'SILVER'  THEN 3
          WHEN 'GOLD'    THEN 4
          WHEN 'PLAT'    THEN 5
          WHEN 'DIAMOND' THEN 6
          ELSE 0
        END
        >
        CASE
          WHEN ${players.deposit90d} BETWEEN ${10_000 * DEPOSIT_SCALE}  AND ${49_999 * DEPOSIT_SCALE}   THEN 1
          WHEN ${players.deposit90d} BETWEEN ${50_000 * DEPOSIT_SCALE}  AND ${99_999 * DEPOSIT_SCALE}   THEN 2
          WHEN ${players.deposit90d} BETWEEN ${100_000 * DEPOSIT_SCALE} AND ${199_999 * DEPOSIT_SCALE}  THEN 3
          WHEN ${players.deposit90d} BETWEEN ${200_000 * DEPOSIT_SCALE} AND ${499_999 * DEPOSIT_SCALE}  THEN 4
          WHEN ${players.deposit90d} BETWEEN ${500_000 * DEPOSIT_SCALE} AND ${1_999_999 * DEPOSIT_SCALE} THEN 5
          WHEN ${players.deposit90d} >= ${2_000_000 * DEPOSIT_SCALE}                                   THEN 6
          ELSE 0
        END
      `);
    }
    else if (quickFilter === "near_next_level") {
      conditions.push(sql`
        CASE
          WHEN ${players.deposit90d} BETWEEN ${10_000 * DEPOSIT_SCALE} AND ${49_999 * DEPOSIT_SCALE} THEN
            (${49_999 * DEPOSIT_SCALE} - ${players.deposit90d}) > 0 AND (${49_999 * DEPOSIT_SCALE} - ${players.deposit90d}) <= ((${49_999 * DEPOSIT_SCALE} - ${10_000 * DEPOSIT_SCALE}) * 0.15)
          WHEN ${players.deposit90d} BETWEEN ${50_000 * DEPOSIT_SCALE} AND ${99_999 * DEPOSIT_SCALE} THEN
            (${99_999 * DEPOSIT_SCALE} - ${players.deposit90d}) > 0 AND (${99_999 * DEPOSIT_SCALE} - ${players.deposit90d}) <= ((${99_999 * DEPOSIT_SCALE} - ${50_000 * DEPOSIT_SCALE}) * 0.15)
          WHEN ${players.deposit90d} BETWEEN ${100_000 * DEPOSIT_SCALE} AND ${199_999 * DEPOSIT_SCALE} THEN
            (${199_999 * DEPOSIT_SCALE} - ${players.deposit90d}) > 0 AND (${199_999 * DEPOSIT_SCALE} - ${players.deposit90d}) <= ((${199_999 * DEPOSIT_SCALE} - ${100_000 * DEPOSIT_SCALE}) * 0.15)
          WHEN ${players.deposit90d} BETWEEN ${200_000 * DEPOSIT_SCALE} AND ${499_999 * DEPOSIT_SCALE} THEN
            (${499_999 * DEPOSIT_SCALE} - ${players.deposit90d}) > 0 AND (${499_999 * DEPOSIT_SCALE} - ${players.deposit90d}) <= ((${499_999 * DEPOSIT_SCALE} - ${200_000 * DEPOSIT_SCALE}) * 0.15)
          WHEN ${players.deposit90d} BETWEEN ${500_000 * DEPOSIT_SCALE} AND ${1_999_999 * DEPOSIT_SCALE} THEN
            (${1_999_999 * DEPOSIT_SCALE} - ${players.deposit90d}) > 0 AND (${1_999_999 * DEPOSIT_SCALE} - ${players.deposit90d}) <= ((${1_999_999 * DEPOSIT_SCALE} - ${500_000 * DEPOSIT_SCALE}) * 0.15)
          ELSE false
        END
      `);
    }

    // --- SIRALAMA ---
    let orderByExpr: any = null;
    switch (sort) {
      case "deposit_asc":
        orderByExpr = asc(players.deposit90d);
        break;
      case "created_desc":
        orderByExpr = desc(players.createdAt);
        break;
      case "created_asc":
        orderByExpr = asc(players.createdAt);
        break;
      case "deposit_desc":
      default:
        orderByExpr = desc(players.deposit90d);
        break;
    }

    // --- SORGULARI OLUŞTUR ---
    // Önemli: `conditions` dizisi `and(...)` içine yayılarak tek bir filtre haline getirilir.
    
    // 1. Toplam Sayı Sorgusu
    let countQuery = db
      .select({ value: sql<number>`COUNT(*)` })
      .from(players)
      .$dynamic();

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const totalResult = await countQuery;
    const total = Number(totalResult[0]?.value ?? 0);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    // 2. Liste Sorgusu
    let itemsQuery = db
      .select({
        id: players.id,
        username: players.username,
        backofficeId: players.backofficeId,
        vipStatus: players.vipStatus,
        deposit90d: players.deposit90d,
        createdAt: players.createdAt,
      })
      .from(players)
      .$dynamic();

    if (conditions.length > 0) {
      itemsQuery = itemsQuery.where(and(...conditions));
    }
    
    if (orderByExpr) {
      itemsQuery = itemsQuery.orderBy(orderByExpr);
    }

    const rows = (await itemsQuery
      .limit(pageSize)
      .offset(offset)) as VipMemberRow[];

    // ---- LOSS BONUS VERİLERİ ----
    const playerIds = rows.map((r) => r.id);
    const lossMap = new Map();

    if (playerIds.length > 0) {
      const idsList = sql.join(
        playerIds.map((id) => sql`${id}`),
        sql`, `
      );

      const lossResult = await db.execute(
        sql`
          SELECT
            l.player_id AS "playerId",
            COUNT(*)::bigint                    AS "lossBonusCount",
            COALESCE(SUM(l.loss), 0)::bigint           AS "lossTotal",
            COALESCE(SUM(l.added_cash), 0)::bigint     AS "lossBonusCash",
            COALESCE(SUM(l.added_freebet), 0)::bigint  AS "lossBonusFreebet",
            COALESCE(SUM(l.added_freespin), 0)::bigint AS "lossBonusFreespin"
          FROM public.loss_bonus_requests AS l
          WHERE l.status = 'APPROVED'
            AND l.player_id IN (${idsList})
          GROUP BY l.player_id
        `
      );

      for (const row of lossResult.rows as any[]) {
        const pid = Number(row.playerId);
        lossMap.set(pid, {
          lossBonusCount: Number(row.lossBonusCount ?? 0),
          lossTotal: Number(row.lossTotal ?? 0),
          lossBonusCash: Number(row.lossBonusCash ?? 0),
          lossBonusFreebet: Number(row.lossBonusFreebet ?? 0),
          lossBonusFreespin: Number(row.lossBonusFreespin ?? 0),
        });
      }
    }

    // ---- SONUÇ FORMATLAMA ----
    const items: VipMemberApiItem[] = rows.map((r) => {
      const depositVal = Number(r.deposit90d ?? 0);
      // DEPOSIT_SCALE 1 olduğu için direkt alıyoruz (TL)
      const depositTl = depositVal / DEPOSIT_SCALE;

      const { levelId, levelName } = getLevelFromDeposit(depositTl);
      const loss = lossMap.get(r.id);

      const createdAtStr =
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : r.createdAt
          ? String(r.createdAt)
          : "";

      return {
        id: r.id,
        username: r.username,
        backofficeId: r.backofficeId,
        vipStatus: r.vipStatus,
        deposit90d: depositTl,
        createdAt: createdAtStr,
        levelId,
        levelName,
        lossBonusCount: loss?.lossBonusCount ?? 0,
        lossTotal: loss?.lossTotal ?? 0,
        lossBonusCash: loss?.lossBonusCash ?? 0,
        lossBonusFreebet: loss?.lossBonusFreebet ?? 0,
        lossBonusFreespin: loss?.lossBonusFreespin ?? 0,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        page,
        pageSize,
        total,
        totalPages,
        items,
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (err: any) {
    console.error("vip-members API error:", err);
    return NextResponse.json(
      {
        ok: false,
        message: err?.message ?? "Unexpected error",
      },
      { status: 500 }
    );
  }
}