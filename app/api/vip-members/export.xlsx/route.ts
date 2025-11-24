// app/api/vip-members/export.xlsx/route.ts
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

type VipMember = {
  id: number;
  username: string;
  backofficeId: number;
  vipStatus: string | null;
  levelId: string | null;
  levelName: string | null;
  deposit90d: number;
  createdAt: string;

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
  items: VipMember[];
};

function toExcelDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: NextRequest) {
  try {
    // ---- Mevcut query paramlarını al, export için uyumlu hale getir ----
    const url = new URL(req.url);
    const params = url.searchParams;

    // Export’ta her zaman en azından 1. sayfayı ve büyük bir pageSize’i kullan
    params.set("page", "1");
    if (!params.get("pageSize")) {
      params.set("pageSize", "5000"); // gerekirse ileride 100000 yaparsın
    }
    if (!params.get("sort")) {
      params.set("sort", "deposit_desc");
    }

    // ---- Base URL oluştur (local/dev/prod hepsinde çalışsın) ----
    const h = req.headers;
    const host =
      h.get("x-forwarded-host") ??
      h.get("host") ??
      process.env.NEXT_PUBLIC_HOST ??
      "localhost:3000";

    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    const baseUrl = `${proto}://${host}`;

    // ---- Asıl VIP liste API'sini çağır ----
    const res = await fetch(
      `${baseUrl}/api/vip-members?${params.toString()}`,
      {
        cache: "no-store",
        headers: {
          // istersen backend’de ayırt etmek için
          "x-internal-export": "1",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          message: `Source API error ${res.status}: ${text}`,
        },
        { status: 500 }
      );
    }

    const json = (await res.json()) as ApiResponse;

    if (!json.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: (json as any)?.message ?? "Source API returned ok=false",
        },
        { status: 500 }
      );
    }

    const items = json.items ?? [];

    // ---- ExcelJS workbook/worksheet oluştur ----
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("VIP Üyeler");

    // Kolon tanımları
    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Kullanıcı", key: "username", width: 24 },
      { header: "Backoffice ID", key: "backofficeId", width: 16 },
      { header: "VIP seviye", key: "vipLevel", width: 14 },
      { header: "Son 90g Yatırım", key: "deposit90d", width: 18 },
      { header: "Loss bonus sayısı", key: "lossBonusCount", width: 18 },
      { header: "Toplam kayıp", key: "lossTotal", width: 18 },
      { header: "Toplam nakit bonus", key: "lossBonusCash", width: 20 },
      { header: "Toplam freebet", key: "lossBonusFreebet", width: 18 },
      { header: "Toplam freespin", key: "lossBonusFreespin", width: 18 },
      { header: "Kayıt tarihi", key: "createdAt", width: 16 },
    ];

    // Header stil
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Satırları doldur – para alanlarını NUMBER, tarihleri Date olarak yaz
    for (const m of items) {
      sheet.addRow({
        id: m.id,
        username: m.username,
        backofficeId: m.backofficeId,
        vipLevel: m.levelName ?? m.vipStatus ?? "",
        deposit90d: Number(m.deposit90d ?? 0),
        lossBonusCount: Number(m.lossBonusCount ?? 0),
        lossTotal: Number(m.lossTotal ?? 0),
        lossBonusCash: Number(m.lossBonusCash ?? 0),
        lossBonusFreebet: Number(m.lossBonusFreebet ?? 0),
        lossBonusFreespin: Number(m.lossBonusFreespin ?? 0),
        createdAt: toExcelDate(m.createdAt),
      });
    }

    // ---- Excel number formatları ----
    // Para kolonları
    sheet.getColumn("deposit90d").numFmt = '"₺"#,##0';
    sheet.getColumn("lossTotal").numFmt = '"₺"#,##0';
    sheet.getColumn("lossBonusCash").numFmt = '"₺"#,##0';

    // Adet / sayı kolonları
    sheet.getColumn("lossBonusCount").numFmt = '#,##0';
    sheet.getColumn("lossBonusFreebet").numFmt = '#,##0';
    sheet.getColumn("lossBonusFreespin").numFmt = '#,##0';

    // Tarih
    sheet.getColumn("createdAt").numFmt = "dd.mm.yyyy";

    // Biraz border/görünüm güzelleştirme (opsiyonel)
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "middle" };
      if (rowNumber > 1) {
        row.border = {
          bottom: { style: "thin", color: { argb: "FF1F2933" } },
        };
      }
    });

    // ---- Workbook’u buffer’a yaz ve response dön ----
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="vip-uyeler.xlsx"',
      },
    });
  } catch (err: any) {
    console.error("vip-members export.xlsx error", err);
    return NextResponse.json(
      {
        ok: false,
        message: err?.message ?? "Export error",
      },
      { status: 500 }
    );
  }
}