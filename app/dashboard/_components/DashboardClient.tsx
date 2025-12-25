// app/dashboard/_components/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// --- TİP TANIMLAMALARI ---
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
};

type ApiResponse = {
  ok: boolean;
  summary: Summary;
  levels: LevelRow[];
};

// --- YARDIMCI FONKSİYONLAR ---
function formatCurrency(amount: number | null | undefined) {
  const safe = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const val = Math.round(safe);
  return val.toLocaleString("tr-TR");
}

function formatCount(n: number | null | undefined) {
  const safe = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("tr-TR");
}

// --- İKONLAR ---
const Icons = {
  Users: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  UserPlus: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  Banknotes: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  Coins: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
};

// --- VIP İKONLARI ---
function getVipIcon(levelId: string) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 48 48",
    className: "w-5 h-5 mr-1.5 shrink-0",
    fill: "currentColor",
  };

  switch (levelId.toLowerCase()) {
    case "iron":
      return (
        <svg {...props} viewBox="0 0 160 160" className={`${props.className} text-slate-400`}>
          <path d="M44.561 126.637a2.01 2.01 0 0 0-2.011 2.011v11.974c0 1.111.9 2.011 2.011 2.011h92.387a2.01 2.01 0 0 0 2.011-2.011v-11.974a2.01 2.01 0 0 0-2.011-2.011H44.561zM136.948 68.916H44.561a2.01 2.01 0 0 0-2.011 2.011V104.5c0 1.1.883 1.99 1.983 2.014.451.01.902.015 1.355.015h.181c5.771 0 10.466 4.534 10.466 10.114 0 2.464-.925 4.72-2.45 6.475h69.236c-5.722-3.777-9.498-10.132-9.498-17.343 0-11.572 9.692-20.983 21.616-20.983a3.516 3.516 0 0 0 3.519-3.519V70.927a2.01 2.01 0 0 0-2.01-2.011zM36.192 76.287v-.002H9.554c-1.726 0-3.372.927-4.116 2.485a4.307 4.307 0 0 0 .959 5.073c8.253 9.771 19.914 15.903 32.634 17.323V76.287h-2.839zM150.476 34.061h-48.539v9.049h48.539a4.524 4.524 0 0 0 0-9.049zM95.653 17.367l-13.57 3.016a2.765 2.765 0 0 0-2.765 2.765v10.913h-2.823a4.524 4.524 0 0 0 0 9.048h2.823v10.913a2.765 2.765 0 0 0 2.765 2.765h13.57a2.765 2.765 0 0 0 2.765-2.765v-33.89a2.766 2.766 0 0 0-2.765-2.765zM49.802 53.438l11.372 8.759V51.941l6.358 12.401 2.926-3.607.822 4.677h5.077l-2.874-16.345-5.002 6.167L56.174 31.23v20.805L40.278 39.794l8.041 25.618h5.24zM107.186 60.275l3.983 3.718 6.865-5.169-1.649 6.588h5.154l4.774-19.082-14.8 11.145-6.017-5.616-6.113 13.553h5.485z"></path>
        </svg>
      );
    case "bronze":
      return (
        <svg {...props} viewBox="0 0 24 24" className={`${props.className} text-amber-600`}>
          <path fillRule="evenodd" d="M2.5 3C2.5 2.44772 2.94772 2 3.5 2H20.5C21.0523 2 21.5 2.44772 21.5 3C21.5 3.55228 21.0523 4 20.5 4H20V16C20 16.323 19.844 16.626 19.5812 16.8137L12.5812 21.8137C12.2335 22.0621 11.7665 22.0621 11.4188 21.8137L4.41876 16.8137C4.15597 16.626 4 16.323 4 16V4H3.5C2.94772 4 2.5 3.55228 2.5 3ZM12 6C12.3393 6 12.6555 6.1721 12.8398 6.45709L13.9984 8.24935L16.061 8.79748C16.389 8.88463 16.6504 9.13217 16.7553 9.45492C16.8601 9.77766 16.7942 10.1316 16.5801 10.3948L15.2336 12.0507L15.3496 14.1817C15.3681 14.5205 15.2134 14.8456 14.9389 15.0451C14.6644 15.2446 14.3074 15.2912 13.9908 15.1689L12 14.4L10.0091 15.1689C9.69256 15.2912 9.33559 15.2446 9.06105 15.0451C8.78651 14.8456 8.63186 14.5205 8.65032 14.1817L8.76639 12.0507L7.4199 10.3948C7.2058 10.1316 7.13983 9.77766 7.2447 9.45492C7.34956 9.13217 7.61095 8.88463 7.93892 8.79748L10.0015 8.24935L11.1602 6.45709C11.3444 6.1721 11.6606 6 12 6Z" clipRule="evenodd" />
        </svg>
      );
    case "silver":
      return (
        <svg {...props} viewBox="0 0 64 64" stroke="#d9d7d7" strokeWidth="0.5" fill="#1A61B0" className={`${props.className}`}>
          <path d="M48.9,24.5635A1,1,0,0,0,48,24H37.58L45.9038,6.4277A.9994.9994,0,0,0,45,5H29a1,1,0,0,0-.9126.5908l-13,29A1,1,0,0,0,16,36h9.7592L21.0229,57.7871a1,1,0,0,0,1.7627.832l26-33A1.0013,1.0013,0,0,0,48.9,24.5635Z" />
        </svg>
      );
        case "gold":

      return (

        <svg {...props} viewBox="0 0 500 500" className={`${props.className} text-yellow-300`}>

          <path fill="#efe047" fillRule="evenodd" d="M492.926 373.652l-29.862-56.448c-3.374-6.38-9.72-10.211-16.467-10.211-1.112 0-2.236.104-3.358.318l-58.772 11.211c-7.032 1.34-12.746 6.762-14.753 14.006l-18.202 65.62c-1.838 6.627-.296 13.787 4.077 18.922 3.612 4.242 8.73 6.603 14.03 6.603 1.115 0 2.236-.104 3.354-.316l106.837-20.379c5.998-1.144 11.102-5.278 13.707-11.096C496.118 386.06 495.899 379.271 492.926 373.652zM369.618 403.749l18.201-65.619 58.772-11.211 29.863 56.451L369.618 403.749zM101.114 175.552l166.149 134.811c7.635 6.071 12.772 11.493 33.646 7.636l105.604-19.074c5.931-1.073 10.977-4.941 13.55-10.388 2.574-5.448 2.357-11.804-.583-17.063l-28.299-65.626L212.287 70.352c-3.247-2.427-4.905-3.711-8.9-3.711-1.104 0-2.212.099-3.316.297l-66.737 10.704c-11.989 2.061-17.178 16.759-19.136 22.429l-18.961 54.912C92.676 162.392 95.027 170.612 101.114 175.552zM403.2 280.568l-105.605 19.076 17.992-61.423 63.764-12.759L403.2 280.568zM198.854 81.558l169.611 126.764-58.681 10.601L144.868 91.309 198.854 81.558zM131.828 106.157l164.966 127.126-17.779 62.597L112.866 161.069 131.828 106.157z" clipRule="evenodd"></path><path fill="#efe047" fillRule="evenodd" d="M304.888,333.504l-0.408-0.336l-41.14,7.302l-38.346,7.461L56.062,207.13l40.91-7.961l-16.327-13.866l-36.397,6.746c-12.281,2.274-17.598,18.49-19.602,24.746L5.224,277.381c-2.622,8.178-0.216,17.247,6.02,22.697l170.192,148.743c7.822,6.698,13.084,12.682,34.467,8.426l108.174-21.048c6.074-1.181,11.244-5.452,13.881-11.46c2.636-6.013,2.413-13.024-0.598-18.827L304.888,333.504z M193.474,432.842L23.281,284.099l19.425-60.587l168.98,140.264L193.474,432.842z M212.507,436.996l18.428-67.772l59.51-11.575l30.237,58.3L212.507,436.996z" clipRule="evenodd"></path><polygon fill="#efe047" fillRule="evenodd" points="408.858 168.462 416.592 136.253 448.8 128.52 416.592 120.785 408.858 88.576 401.124 120.785 368.916 128.52 401.124 136.253" clipRule="evenodd"></polygon><polygon fill="#efe047" fillRule="evenodd" points="337.533 94.638 343.167 72.109 365.695 66.479 343.167 60.845 337.533 38.317 331.903 60.845 309.373 66.479 331.903 72.109" clipRule="evenodd"></polygon>

        </svg>

      );
    case "plat":
      return (
        <svg {...props} viewBox="0 0 64 64" stroke="white" strokeWidth="0.5" className={`${props.className} text-indigo-400`}>
          <polygon points="47.616 42.516 43.867 43.765 41.22 57 44.208 57 47.616 42.516"></polygon>
          <polygon points="39.18 57 41.813 43.84 30.398 42.21 34.748 57 39.18 57"></polygon>
          <polygon points="4.943 31 13.847 31 12.363 20.612 4.943 31"></polygon>
          <polygon points="4.832 33 21.546 59 25.484 59 14.341 33 4.832 33"></polygon>
          <path d="M31.721,53.793l-3.68-12.511a1,1,0,0,1,.216-.951l1.6-1.781L28.2,26.518,16.291,32.473,27.333,58.239Z"></path>
        </svg>
      );
    case "diamond":
      return (
        <svg {...props} viewBox="0 0 68 68" className={`${props.className} text-cyan-400`}>
          <path d="M65.507 26.572c-1.441-1.567-5.415-6.188-7.016-7.335-.04-.054-.078-.11-.134-.154-2.02-1.554-4.523-3.47-6.642-4.893-1.244-.835-2.728-1.374-4.67-1.696-10.16-1.69-21.56-1.628-25.414.138-3.275 1.502-8.075 4.054-10.822 6.306-.05.041-.081.095-.118.145l-6.596 6.18c-5.562 2.44 1.56 8.328 5.03 12.478A5313.97 5313.97 0 0 0 31.645 64.5c1.679 1.98 2.884 2.057 4.568-.084l7.604-9.672c7.98-9.067 15.41-17.957 21.826-26.146.467-.596.411-1.43-.136-2.026z" />
        </svg>
      );
    default:
      return null;
  }
}

function getBadgeStyle(levelId: string) {
  const base = "inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium border transition-colors";
  switch (levelId.toLowerCase()) {
    case "iron": return `${base} bg-slate-900 border-slate-700 text-slate-300`;
    case "bronze": return `${base} bg-amber-950/30 border-amber-800/50 text-amber-200`;
    case "silver": return `${base} bg-slate-800 border-slate-600 text-slate-200`;
    case "gold": return `${base} bg-yellow-500/10 border-yellow-400/70 text-yellow-300`;
    case "plat": return `${base} bg-indigo-950/30 border-indigo-700/50 text-indigo-200`;
    case "diamond": return `${base} bg-cyan-950/30 border-cyan-700/50 text-cyan-200`;
    default: return `${base} bg-slate-900 border-slate-700 text-slate-300`;
  }
}

// --- OPTİMİZE EDİLMİŞ STAT CARD (Blur kaldırıldı) ---
function StatCard({
  title,
  value,
  icon: Icon,
  gradientClass,
  textClass,
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  icon: any;
  gradientClass: string;
  textClass?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden group cursor-pointer rounded-2xl border border-white/5 p-6 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${gradientClass}`}
    >
      {/* Background Gradient - Opaklık ayarlandı, blur yok */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      {/* Watermark İkon */}
      <Icon className="absolute -bottom-6 -right-6 h-32 w-32 text-white opacity-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-10" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center space-x-3 mb-2">
          {/* İkon Arkası - Blur yerine solid renk */}
          <div className="p-2 rounded-lg bg-black/30 shadow-inner">
            <Icon className={`w-5 h-5 ${textClass}`} />
          </div>
          <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase opacity-90">
            {title}
          </p>
        </div>
        
        <p className={`text-3xl font-bold tracking-tight mt-1 ${textClass ? textClass : 'text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  );
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
        const res = await fetch("/api/dashboard", { next: { revalidate: 60 } });
        const json = (await res.json()) as ApiResponse;
        if (!canceled && json) setData(json);
      } catch (err: any) {
        console.error("dashboard api error", err);
        if (!canceled) setError(err?.message ?? "Bilinmeyen hata");
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, []);

  function openMembersWithParams(params: string) {
    router.push(`/members?${params}`);
  }

  async function handleExportExcel() {
    try {
      setExporting(true);
      const res = await fetch("/api/dashboard/export.xlsx", { cache: "no-store" });
      if (!res.ok) throw new Error(`Export HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vip-dashboard-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("dashboard excel export error", err);
      alert("Hata: " + (err?.message ?? ""));
    } finally {
      setExporting(false);
    }
  }

  if (loading && !data) {
    return <div className="w-full px-6 py-8 text-slate-300 animate-pulse">Dashboard yükleniyor...</div>;
  }

  if (error || !data) {
    return <div className="w-full px-6 py-8 text-red-400">Hata: {error ?? "Bilinmeyen hata"}</div>;
  }

  const summary = data.summary ?? ({ totalVipMembers: 0, newVipMembers: 0, lostVipMembers: 0, last90dDeposit: 0, lossBonusTotal: 0 } as Summary);
  const levels = data.levels ?? [];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">VIP Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            VIP üye performans ve finansal özet raporu.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center bg-emerald-600/90 hover:bg-emerald-500 text-xs font-semibold text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/50"
        >
          {exporting ? "İndiriliyor..." : "Excel Raporu İndir"}
        </button>
      </div>

      {/* --- KARTLAR (Optimize Edildi) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        
        {/* Kart 1: Toplam VIP */}
        <StatCard
          title="TOPLAM VIP ÜYE"
          value={formatCount(summary.totalVipMembers)}
          icon={Icons.Users}
          gradientClass="bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg border-slate-700"
          textClass="text-slate-100"
          onClick={() => openMembersWithParams("minDeposit=10000")}
        />

        {/* Kart 2: Yeni VIP */}
        <StatCard
          title="YENİ ÜYELER (15G)"
          value={formatCount(summary.newVipMembers)}
          icon={Icons.UserPlus}
          gradientClass="bg-gradient-to-br from-emerald-900/80 to-slate-900 border-emerald-500/30 shadow-lg"
          textClass="text-emerald-400"
          onClick={() => openMembersWithParams("filter=new&days=15")}
        />

        {/* Kart 3: 90 Günlük Yatırım */}
        <StatCard
          title="SON 90 GÜN YATIRIM"
          value={`₺${formatCurrency(summary.last90dDeposit)}`}
          icon={Icons.Banknotes}
          gradientClass="bg-gradient-to-br from-indigo-900/80 to-slate-900 border-indigo-500/30 shadow-lg"
          textClass="text-indigo-300"
          onClick={() => openMembersWithParams("sortBy=totalDeposit&period=90d")}
        />

        {/* Kart 4: Loss Bonus */}
        <StatCard
          title="LOSS BONUS (NAKİT)"
          value={`₺${formatCurrency(summary.lossBonusTotal)}`}
          icon={Icons.Coins}
          gradientClass="bg-gradient-to-br from-amber-900/40 to-slate-900 border-amber-600/30 shadow-lg"
          textClass="text-[#efe047]" 
          onClick={() => openMembersWithParams("sortBy=lossBonus")}
        />
      </div>

      {/* Liste Bölümü - Optimize Edildi (Backdrop blur kaldırıldı) */}
      <section className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">VIP Seviye Dağılımı</h2>
          <p className="text-sm text-slate-400">
            Seviye bazlı üye yoğunluğu ve finansal performans.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left tracking-wider">Seviye</th>
                <th className="px-6 py-4 text-left tracking-wider">Aralık</th>
                <th className="px-6 py-4 text-left tracking-wider">Üye Sayısı</th>
                <th className="px-6 py-4 text-left tracking-wider">Toplam Yatırım</th>
                <th className="px-6 py-4 text-left tracking-wider">Ortalama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {levels.map((lvl) => {
                const memberCount = typeof lvl.memberCount === "number" ? lvl.memberCount : 0;
                const totalDeposit = typeof lvl.totalDeposit === "number" ? lvl.totalDeposit : 0;
                const avg = memberCount > 0 ? Math.round(totalDeposit / memberCount) : 0;
                return (
                  <tr
                    key={lvl.id}
                    onClick={() => openMembersWithParams(`level=${lvl.id}`)}
                    className="group hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className={getBadgeStyle(lvl.id)}>
                        {getVipIcon(lvl.id)}
                        <span>{lvl.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {lvl.max != null
                        ? `₺${formatCurrency(lvl.min)} – ₺${formatCurrency(lvl.max)}`
                        : `≥ ₺${formatCurrency(lvl.min)}`}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{formatCount(memberCount)}</td>
                    <td className="px-6 py-4 font-medium text-slate-200">₺{formatCurrency(totalDeposit)}</td>
                    <td className="px-6 py-4 text-slate-400 group-hover:text-slate-200 transition-colors">₺{formatCurrency(avg)}</td>
                  </tr>
                );
              })}
              <tr
                key="lost-vip"
                onClick={() => openMembersWithParams("filter=lost")}
                className="bg-red-950/10 hover:bg-red-950/20 cursor-pointer transition-colors border-t border-slate-800"
              >
                <td className="px-6 py-4">
                  <div className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium border bg-red-500/10 border-red-500/20 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse" />
                    VIP’ten Düşen
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">—</td>
                <td className="px-6 py-4 font-bold text-red-400">{formatCount(summary.lostVipMembers)}</td>
                <td className="px-6 py-4 text-slate-500">—</td>
                <td className="px-6 py-4 text-slate-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}