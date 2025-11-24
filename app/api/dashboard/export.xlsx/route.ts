// app/api/dashboard/export.xlsx/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema/players";
import ExcelJS from "exceljs";

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

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const minVipDeposit = LEVELS[0].min * DEPOSIT_SCALE;

    // 1. ÖZET VERİLER
    
    // Toplam VIP Üye
    const totalVipRes = await db.execute(
      sql`SELECT COUNT(*) as "count" FROM ${players} WHERE ${players.deposit90d} >= ${minVipDeposit}`
    );
    const totalVip = Number(totalVipRes.rows[0]?.count ?? 0);

    // Yeni VIP Üyeler
    const newVipRes = await db.execute(
      sql`
        SELECT COUNT(*) as "count" 
        FROM ${players} 
        WHERE ${players.deposit90d} >= ${minVipDeposit}
          AND ${players.createdAt} >= NOW() - INTERVAL '15 days'
      `
    );
    const newVip = Number(newVipRes.rows[0]?.count ?? 0);

    // Toplam Yatırım
    const totalDepositRes = await db.execute(
      sql`SELECT COALESCE(SUM(${players.deposit90d}), 0) as "sum" FROM ${players} WHERE ${players.deposit90d} >= ${minVipDeposit}`
    );
    const totalDeposit = Number(totalDepositRes.rows[0]?.sum ?? 0) / DEPOSIT_SCALE;

    // Toplam Loss Bonus (Sadece Nakit - added_cash)
    const totalLossRes = await db.execute(
      sql`SELECT COALESCE(SUM(added_cash), 0) as "sum" FROM public.loss_bonus_requests WHERE status = 'APPROVED'`
    );
    const totalLoss = Number(totalLossRes.rows[0]?.sum ?? 0);

    // 2. SEVİYE VERİLERİ
    const levelStats = [];
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
      const avg = count > 0 ? Math.round(deposit / count) : 0;

      levelStats.push({
        name: lvl.name,
        range: max ? `${lvl.min.toLocaleString("tr-TR")} - ${lvl.max.toLocaleString("tr-TR")}` : `>= ${lvl.min.toLocaleString("tr-TR")}`,
        count,
        deposit,
        avg
      });
    }

    // 3. EXCEL OLUŞTUR
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dashboard Raporu");

    worksheet.columns = [
      { width: 30 }, 
      { width: 30 }, 
      { width: 20 }, 
      { width: 25 }, 
      { width: 25 }, 
    ];

    const titleRow = worksheet.addRow(["ÖZET RAPORU"]);
    titleRow.font = { bold: true, size: 14 };
    
    worksheet.addRow(["Rapor Tarihi", new Date().toLocaleDateString("tr-TR")]);
    worksheet.addRow([]);

    const summaryHeader = worksheet.addRow(["Metrik", "Değer"]);
    summaryHeader.font = { bold: true };
    
    worksheet.addRow(["Toplam VIP Üye", totalVip]);
    worksheet.addRow(["Yeni VIP Üyeler (15 Gün)", newVip]);
    worksheet.addRow(["Son 90 Gün Toplam Yatırım", totalDeposit]).getCell(2).numFmt = '#,##0 "₺"';
    worksheet.addRow(["Toplam Dağıtılan Loss Bonus (Nakit)", totalLoss]).getCell(2).numFmt = '#,##0 "₺"';
    // Terfi Ödülü satırı kaldırıldı.
    
    worksheet.addRow([]);
    worksheet.addRow([]);

    const levelTitleRow = worksheet.addRow(["VIP SEVİYE DAĞILIMI"]);
    levelTitleRow.font = { bold: true, size: 14 };

    const tableHeader = worksheet.addRow([
      "Seviye", 
      "Yatırım Aralığı (TL)", 
      "Üye Sayısı", 
      "Toplam Yatırım (TL)", 
      "Üye Başı Ortalama (TL)"
    ]);
    
    tableHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    tableHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
    });

    levelStats.forEach(stat => {
      const row = worksheet.addRow([
        stat.name,
        stat.range,
        stat.count,
        stat.deposit,
        stat.avg
      ]);
      row.getCell(4).numFmt = '#,##0 "₺"';
      row.getCell(5).numFmt = '#,##0 "₺"';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `vip-dashboard-raporu-${new Date().toISOString().slice(0,10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (err: any) {
    console.error("dashboard export error", err);
    return NextResponse.json(
      { ok: false, message: err.message ?? "Error" },
      { status: 500 }
    );
  }
}