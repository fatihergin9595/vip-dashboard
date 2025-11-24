// app/dashboard/_components/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LevelRow = {
  id: string;
  name: string;
  min: number;
  max: number | null;
  memberCount: number;
  totalDeposit: number;
};

type Summary = {
  totalVipMembers: number;
  newVipMembers: number;
  lostVipMembers: number;
  last90dDeposit: number;
  lossBonusTotal: number;
  // promoBonusTotal removed
};

type ApiResponse = {
  ok: boolean;
  summary: Summary;
  levels: LevelRow[];
};

function formatCurrency(amount: number | null | undefined) {
  if (!amount) return "0";
  const val = Math.round(amount);
  return val.toLocaleString("tr-TR");
}

function getVipBadgeClasses(levelId: string) {
  const base =
    "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border";
  switch (levelId) {
    case "iron":
      return `${base} bg-slate-800 text-slate-100 border-slate-500`;
    case "bronze":
      return `${base} bg-amber-900/70 text-amber-200 border-amber-500/70`;
    case "silver":
      return `${base} bg-slate-700 text-slate-100 border-slate-300/80`;
    case "gold":
      return `${base} bg-yellow-500/10 text-yellow-300 border-yellow-400/70`;
    case "plat":
      return `${base} bg-indigo-500/10 text-indigo-300 border-indigo-400/70`;
    case "diamond":
      return `${base} bg-cyan-500/10 text-cyan-300 border-cyan-400/70`;
    default:
      return `${base} bg-slate-800 text-slate-200 border-slate-600/60`;
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/dashboard");
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
          console.warn("Dashboard API error or empty");
        }

        if (!canceled && json) setData(json);
      } catch (err: any) {
        console.error("dashboard api error", err);
        if (!canceled) setError(err?.message ?? "Bilinmeyen hata");
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    load();
    return () => {
      canceled = true;
    };
  }, []);

  function openMembersWithParams(params: string) {
    router.push(`/members?${params}`);
  }

  async function handleExportExcel() {
    try {
      setExporting(true);
      
      const res = await fetch("/api/dashboard/export.xlsx");
      
      if (!res.ok) {
        throw new Error(`Export HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vip-dashboard-raporu-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("dashboard excel export error", err);
      alert("Dashboard raporu alınırken hata oluştu: " + (err?.message ?? ""));
    } finally {
      setExporting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="w-full px-6 py-8 text-slate-300 animate-pulse">
        Dashboard yükleniyor...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-6 py-8 text-red-400">
        Dashboard yüklenirken hata oluştu: {error ?? "Bilinmeyen hata"}
      </div>
    );
  }

  const { summary, levels } = data;

  return (
    <div className="w-full">
      {/* Üst başlık + Excel butonu */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            VIP Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Son 90 gün yatırım verilerine göre VIP üye dağılımı ve loss bonus
            istatistikleri.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-slate-950 px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? "İndiriliyor..." : "Dashboard Excel indir"}
        </button>
      </div>

      {/* Üst kutular (4 adet) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Toplam VIP üye */}
        <div
          onClick={() => openMembersWithParams("minDeposit=10000")}
          className="cursor-pointer bg-slate-900 hover:bg-slate-800 transition border border-slate-700 rounded-xl p-5 shadow-lg"
        >
          <p className="text-sm text-slate-400">TOPLAM VIP ÜYE</p>
          <p className="text-3xl font-bold mt-1">
            {summary.totalVipMembers.toLocaleString("tr-TR")}
          </p>
        </div>

        {/* Yeni VIP üyeler */}
        <div
          onClick={() => openMembersWithParams("filter=new&days=15")}
          className="cursor-pointer bg-emerald-900/40 hover:bg-emerald-900/60 transition border border-emerald-600 rounded-xl p-5 shadow-lg"
        >
          <p className="text-sm text-emerald-200">
            YENİ VIP ÜYELER (SON 15 GÜN)
          </p>
          <p className="text-3xl font-bold mt-1 text-emerald-100">
            {summary.newVipMembers.toLocaleString("tr-TR")}
          </p>
        </div>

        {/* Son 90 gün VIP yatırım */}
        <div
          onClick={() => openMembersWithParams("sortBy=totalDeposit&period=90d")}
          className="cursor-pointer bg-slate-800 hover:bg-slate-700 transition border border-slate-600 rounded-xl p-5 shadow-lg"
        >
          <p className="text-sm text-slate-300">SON 90 GÜN VIP YATIRIM</p>
          <p className="text-3xl font-bold mt-1">
            ₺{formatCurrency(summary.last90dDeposit)}
          </p>
        </div>

        {/* Toplam loss bonus (nakit) */}
        <div
          onClick={() => openMembersWithParams("sortBy=lossBonus")}
          className="cursor-pointer bg-amber-900 hover:bg-amber-800 transition border border-amber-700 rounded-xl p-5 shadow-lg"
        >
          <p className="text-sm text-amber-200">TOPLAM LOSS BONUS (NAKİT)</p>
          <p className="text-3xl font-bold mt-1 text-amber-100">
            ₺{formatCurrency(summary.lossBonusTotal)}
          </p>
        </div>
      </div>

      {/* VIP seviye dağılımı tablosu */}
      <section className="w-full mt-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-1">VIP seviye dağılımı</h2>
        <p className="text-sm text-slate-400 mb-4">
          Her seviyedeki üye sayısı ve son 90 gün toplam yatırım tutarları.
          Satıra tıklayarak ilgili seviyedeki üyeleri görebilirsiniz.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="py-3 text-left">SEVİYE</th>
              <th className="py-3 text-left">ARALIK</th>
              <th className="py-3 text-left">ÜYE SAYISI</th>
              <th className="py-3 text-left">TOPLAM YATIRIM</th>
              <th className="py-3 text-left">ÜYE BAŞI ORTALAMA</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((lvl) => {
              const avg =
                lvl.memberCount > 0
                  ? Math.round(lvl.totalDeposit / lvl.memberCount)
                  : 0;

              return (
                <tr
                  key={lvl.id}
                  onClick={() => openMembersWithParams(`level=${lvl.id}`)}
                  className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <td className="py-3">
                    <span className={getVipBadgeClasses(lvl.id)}>
                      {lvl.name}
                    </span>
                  </td>
                  <td className="py-3">
                    {lvl.max
                      ? `₺${formatCurrency(lvl.min)} – ₺${formatCurrency(
                          lvl.max
                        )}`
                      : `≥ ₺${formatCurrency(lvl.min)}`}
                  </td>
                  <td className="py-3">{lvl.memberCount.toLocaleString("tr-TR")}</td>
                  <td className="py-3">
                    ₺{formatCurrency(lvl.totalDeposit)}
                  </td>
                  <td className="py-3">₺{formatCurrency(avg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}