// app/api/members/[id]/excel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import * as XLSX from "xlsx";

type RouteParams = { id: string };

// Basit tarih formatlayıcı (YYYY-MM-DD → DD.MM.YYYY)
function formatDate(value: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}.${month}.${year}`;
}

// Tarih + saat (DD.MM.YYYY HH:mm)
function formatDateTime(value: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params;
    const playerId = Number(id);

    if (!Number.isFinite(playerId)) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz ID" },
        { status: 400 }
      );
    }

    // 1) Üye ana bilgileri (public.players)
    const memberResult = await db.execute(
      sql`
        SELECT
          p.id,
          p.username,
          p.backoffice_id           AS "backofficeId",
          p.vip_status              AS "vipStatus",
          p.created_at              AS "createdAt",
          p.deposit_amount_last_90d AS "deposit90d"
        FROM public.players AS p
        WHERE p.id = ${playerId}
        LIMIT 1
      `
    );

    const member = memberResult.rows[0] as
      | {
          id: number;
          username: string;
          backofficeId: number;
          vipStatus: string;
          createdAt: string;
          deposit90d: number;
        }
      | undefined;

    if (!member) {
      return NextResponse.json(
        { ok: false, message: "Üye bulunamadı" },
        { status: 404 }
      );
    }

    // 2) Loss bonus özeti (sadece APPROVED kayıtlar)
    const lossSummaryResult = await db.execute(
      sql`
        SELECT
          COALESCE(SUM(loss), 0)           AS "totalLoss",
          COALESCE(SUM(added_cash), 0)     AS "totalBonusCash",
          COALESCE(SUM(added_freespin), 0) AS "totalBonusFreespin",
          COALESCE(SUM(added_freebet), 0)  AS "totalBonusFreebet",
          COUNT(*)                         AS "count"
        FROM public.loss_bonus_requests l
        WHERE l.player_id = ${playerId}
          AND l.status = 'APPROVED'
      `
    );

    const lossSummary = lossSummaryResult.rows[0] as
      | {
          totalLoss: number;
          totalBonusCash: number;
          totalBonusFreespin: number;
          totalBonusFreebet: number;
          count: number;
        }
      | undefined;

    // 3) Loss bonus geçmişi (sadece APPROVED, tüm kayıtlar)
    const lossHistoryResult = await db.execute(
      sql`
        SELECT
          l.id,
          l.created_at           AS "createdAt",
          l.loss,
          l.added_cash           AS "addedCash",
          l.added_freespin       AS "addedFreespin",
          l.added_freebet        AS "addedFreebet",
          l.requested_vip_status AS "requestedVipStatus",
          l.preferred_bonus_type AS "preferredBonusType",
          l.status,
          l.message
        FROM public.loss_bonus_requests l
        WHERE l.player_id = ${playerId}
          AND l.status = 'APPROVED'
        ORDER BY l.created_at DESC
      `
    );

    const lossHistory = lossHistoryResult.rows as Array<{
      id: number;
      createdAt: string;
      loss: number | null;
      addedCash: number | null;
      addedFreespin: number | null;
      addedFreebet: number | null;
      requestedVipStatus: string | null;
      preferredBonusType: string | null;
      status: string;
      message: string | null;
    }>;

    // ---------------------------
    // EXCEL WORKBOOK OLUŞTURMA
    // ---------------------------
    const wb = XLSX.utils.book_new();

    // SHEET 1: Üye Bilgileri
    const sheet1Data = [
      ["Üye Bilgileri"],
      [
        "ID",
        "Kullanıcı Adı",
        "Backoffice ID",
        "VIP Statüsü",
        "Kayıt Tarihi",
        "Son 90 Gün Yatırım",
      ],
      [
        member.id,
        member.username,
        member.backofficeId,
        member.vipStatus,
        formatDate(member.createdAt),
        member.deposit90d ?? 0,
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(wb, ws1, "Üye Bilgileri");

    // SHEET 2: Loss Bonus Özeti
    const s = lossSummary;
    const sheet2Data = [
      ["Loss Bonus Özeti (sadece APPROVED kayıtlar)"],
      ["Toplam Loss", "Toplam Nakit Bonus", "Toplam Freespin", "Toplam Freebet", "Toplam Kayıt Sayısı"],
      [
        s?.totalLoss ?? 0,
        s?.totalBonusCash ?? 0,
        s?.totalBonusFreespin ?? 0,
        s?.totalBonusFreebet ?? 0,
        s?.count ?? 0,
      ],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, "Loss Özeti");

    // SHEET 3: Loss Bonus Geçmişi
    const sheet3Data: any[][] = [
      ["Loss Bonus Geçmişi (APPROVED)"],
      [
        "Kayıt ID",
        "Tarih",
        "Loss",
        "Nakit Bonus",
        "Freespin",
        "Freebet",
        "Talep Edilen VIP",
        "Bonus Tipi",
        "Durum",
        "Mesaj",
      ],
    ];

    for (const row of lossHistory) {
      sheet3Data.push([
        row.id,
        formatDateTime(row.createdAt),
        row.loss ?? 0,
        row.addedCash ?? 0,
        row.addedFreespin ?? 0,
        row.addedFreebet ?? 0,
        row.requestedVipStatus ?? "",
        row.preferredBonusType ?? "",
        row.status,
        row.message ?? "",
      ]);
    }

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    XLSX.utils.book_append_sheet(wb, ws3, "Loss Geçmişi");

    // Workbook'u buffer olarak yaz
    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "buffer",
    });

    // Response – gerçek Excel dosyası
    const fileNameSafe = String(member.username || member.id)
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .slice(0, 50);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=vip_member_${fileNameSafe}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("member excel error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error?.message ?? "Excel oluşturulurken hata oluştu",
      },
      { status: 500 }
    );
  }
}