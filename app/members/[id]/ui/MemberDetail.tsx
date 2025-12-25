"use client";

import React, { useEffect, useMemo, useState } from "react";

// --- TİP TANIMLAMALARI ---
type LevelId = "iron" | "bronze" | "silver" | "gold" | "plat" | "diamond";

interface Level {
  id: LevelId;
  name: string;
  min: number;
  max: number | null;
}

interface Rewards {
  iron: string | null;
  bronze: string | null;
  silver: string | null;
  gold: string | null;
  plat: string | null;
  diamond: string | null;
}

interface HistoryItem {
  id: LevelId;
  name: string;
  rewardAt: string;
}

interface LossSummary {
  totalLoss: number;
  totalBonusCash: number;
  totalBonusFreespin: number;
  totalBonusFreebet: number;
  count: number;
}

interface LossHistoryItem {
  id: number;
  loss: number;
  addedCash: number | null;
  addedFreespin: number | null;
  addedFreebet: number | null;
  requestedVipStatus: string;
  createdAt: string;
  status: string;
  preferredBonusType: string;
  message: string | null;
}

interface MemberPayload {
  id: number;
  username: string;
  backofficeId: number;
  vipStatus: string;
  createdAt: string;
  deposit90d: number;
  level: Level;
  rewards: Rewards;
  history: HistoryItem[];
  lossSummary?: LossSummary;
  lossHistory?: LossHistoryItem[];
  lossHistoryPage?: number;
  lossHistoryPageSize?: number;
  lossHistoryTotal?: number;
  lossHistoryTotalPages?: number;
}

interface MemberApiResponse {
  ok: boolean;
  message?: string;
  member?: MemberPayload;
}

interface MemberDetailProps {
  id: string;
}

// --- İKON SETİ ---
const Icons = {
  User: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  Calendar: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Money: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Trophy: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172V9.406c0-1.609.589-3.155 1.638-4.333.364-.409.578-.94.597-1.488A.986.986 0 0014.764 2.6H9.236a.986.986 0 00-.99 1.014c.02.548.233 1.079.597 1.488 1.049 1.178 1.638 2.724 1.638 4.333v2.172c0 1.12-.345 2.162-.982 3.172" />
    </svg>
  ),
  Download: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  TrendingUp: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
};

// --- VIP İKONLARI ---
function getVipIcon(levelId?: string | null, size = 18) {
  if (!levelId) return null;
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 48 48", 
    className: `w-[${size}px] h-[${size}px] shrink-0`,
    fill: "currentColor"
  };

  switch (levelId.toLowerCase()) {
    case "iron": return <svg {...props} viewBox="0 0 160 160" className={`${props.className} text-slate-400`}><path d="M44.561 126.637a2.01 2.01 0 0 0-2.011 2.011v11.974c0 1.111.9 2.011 2.011 2.011h92.387a2.01 2.01 0 0 0 2.011-2.011v-11.974a2.01 2.01 0 0 0-2.011-2.011H44.561zM136.948 68.916H44.561a2.01 2.01 0 0 0-2.011 2.011V104.5c0 1.1.883 1.99 1.983 2.014.451.01.902.015 1.355.015h.181c5.771 0 10.466 4.534 10.466 10.114 0 2.464-.925 4.72-2.45 6.475h69.236c-5.722-3.777-9.498-10.132-9.498-17.343 0-11.572 9.692-20.983 21.616-20.983a3.516 3.516 0 0 0 3.519-3.519V70.927a2.01 2.01 0 0 0-2.01-2.011zM36.192 76.287v-.002H9.554c-1.726 0-3.372.927-4.116 2.485a4.307 4.307 0 0 0 .959 5.073c8.253 9.771 19.914 15.903 32.634 17.323V76.287h-2.839zM150.476 34.061h-48.539v9.049h48.539a4.524 4.524 0 0 0 0-9.049zM95.653 17.367l-13.57 3.016a2.765 2.765 0 0 0-2.765 2.765v10.913h-2.823a4.524 4.524 0 0 0 0 9.048h2.823v10.913a2.765 2.765 0 0 0 2.765 2.765h13.57a2.765 2.765 0 0 0 2.765-2.765v-33.89a2.766 2.766 0 0 0-2.765-2.765zM49.802 53.438l11.372 8.759V51.941l6.358 12.401 2.926-3.607.822 4.677h5.077l-2.874-16.345-5.002 6.167L56.174 31.23v20.805L40.278 39.794l8.041 25.618h5.24zM107.186 60.275l3.983 3.718 6.865-5.169-1.649 6.588h5.154l4.774-19.082-14.8 11.145-6.017-5.616-6.113 13.553h5.485z"></path></svg>;
    case "bronze": return <svg {...props} viewBox="0 0 24 24" className={`${props.className} text-amber-600`}><path fillRule="evenodd" d="M2.5 3C2.5 2.44772 2.94772 2 3.5 2H20.5C21.0523 2 21.5 2.44772 21.5 3C21.5 3.55228 21.0523 4 20.5 4H20V16C20 16.323 19.844 16.626 19.5812 16.8137L12.5812 21.8137C12.2335 22.0621 11.7665 22.0621 11.4188 21.8137L4.41876 16.8137C4.15597 16.626 4 16.323 4 16V4H3.5C2.94772 4 2.5 3.55228 2.5 3ZM12 6C12.3393 6 12.6555 6.1721 12.8398 6.45709L13.9984 8.24935L16.061 8.79748C16.389 8.88463 16.6504 9.13217 16.7553 9.45492C16.8601 9.77766 16.7942 10.1316 16.5801 10.3948L15.2336 12.0507L15.3496 14.1817C15.3681 14.5205 15.2134 14.8456 14.9389 15.0451C14.6644 15.2446 14.3074 15.2912 13.9908 15.1689L12 14.4L10.0091 15.1689C9.69256 15.2912 9.33559 15.2446 9.06105 15.0451C8.78651 14.8456 8.63186 14.5205 8.65032 14.1817L8.76639 12.0507L7.4199 10.3948C7.2058 10.1316 7.13983 9.77766 7.2447 9.45492C7.34956 9.13217 7.61095 8.88463 7.93892 8.79748L10.0015 8.24935L11.1602 6.45709C11.3444 6.1721 11.6606 6 12 6Z" clipRule="evenodd"></path></svg>;
    case "silver": return <svg {...props} viewBox="0 0 64 64" stroke="#d9d7d7" strokeWidth="0.5" fill="#1A61B0" className={`${props.className}`}><path d="M48.9,24.5635A1,1,0,0,0,48,24H37.58L45.9038,6.4277A.9994.9994,0,0,0,45,5H29a1,1,0,0,0-.9126.5908l-13,29A1,1,0,0,0,16,36h9.7592L21.0229,57.7871a1,1,0,0,0,1.7627.832l26-33A1.0013,1.0013,0,0,0,48.9,24.5635Z"></path></svg>;
    case "gold": return <svg {...props} viewBox="0 0 500 500" className={`${props.className} text-yellow-300`}><path fill="#efe047" fillRule="evenodd" d="M492.926 373.652l-29.862-56.448c-3.374-6.38-9.72-10.211-16.467-10.211-1.112 0-2.236.104-3.358.318l-58.772 11.211c-7.032 1.34-12.746 6.762-14.753 14.006l-18.202 65.62c-1.838 6.627-.296 13.787 4.077 18.922 3.612 4.242 8.73 6.603 14.03 6.603 1.115 0 2.236-.104 3.354-.316l106.837-20.379c5.998-1.144 11.102-5.278 13.707-11.096C496.118 386.06 495.899 379.271 492.926 373.652z" clipRule="evenodd"></path></svg>;
    case "plat": return <svg {...props} viewBox="0 0 64 64" stroke="white" strokeWidth="0.5" className={`${props.className} text-indigo-400`}><polygon points="47.616 42.516 43.867 43.765 41.22 57 44.208 57 47.616 42.516"></polygon><polygon points="39.18 57 41.813 43.84 30.398 42.21 34.748 57 39.18 57"></polygon><polygon points="4.943 31 13.847 31 12.363 20.612 4.943 31"></polygon><polygon points="4.832 33 21.546 59 25.484 59 14.341 33 4.832 33"></polygon><path d="M31.721,53.793l-3.68-12.511a1,1,0,0,1,.216-.951l1.6-1.781L28.2,26.518,16.291,32.473,27.333,58.239Z"></path></svg>;
    case "diamond": return <svg {...props} viewBox="0 0 68 68" className={`${props.className} text-cyan-400`}><path d="M65.507 26.572c-1.441-1.567-5.415-6.188-7.016-7.335-.04-.054-.078-.11-.134-.154-2.02-1.554-4.523-3.47-6.642-4.893-1.244-.835-2.728-1.374-4.67-1.696-10.16-1.69-21.56-1.628-25.414.138-3.275 1.502-8.075 4.054-10.822 6.306-.05.041-.081.095-.118.145l-6.596 6.18c-5.562 2.44 1.56 8.328 5.03 12.478A5313.97 5313.97 0 0 0 31.645 64.5c1.679 1.98 2.884 2.057 4.568-.084l7.604-9.672c7.98-9.067 15.41-17.957 21.826-26.146.467-.596.411-1.43-.136-2.026z" /></svg>;
    default: return null;
  }
}

// --- YARDIMCI FORMAT FONKSİYONLARI ---
function formatTL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return "₺" + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return Math.floor(value).toLocaleString("tr-TR");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("tr-TR");
}

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const LEVEL_LABELS: Record<LevelId, string> = {
  iron: "Demir",
  bronze: "Bronz",
  silver: "Gümüş",
  gold: "Altın",
  plat: "Platin",
  diamond: "Elmas",
};

// --- YENİ ŞIK KART BİLEŞENİ (Performanslı) ---
function DetailStatCard({ title, value, subtext, icon: Icon, colorClass }: any) {
    return (
        <div className="relative group overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-colors">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
                <Icon className="w-16 h-16 transform translate-x-4 -translate-y-4 rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-slate-800/50 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</span>
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                {subtext && <div className="text-xs text-slate-500 mt-1 font-medium">{subtext}</div>}
            </div>
        </div>
    );
}

export const MemberDetail: React.FC<MemberDetailProps> = ({ id }) => {
  const [member, setMember] = useState<MemberPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lossPage, setLossPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/members/${id}?lossPage=${lossPage}`;
        const res = await fetch(url);
        const json = (await res.json()) as MemberApiResponse;

        if (!res.ok || !json.ok) throw new Error(!res.ok ? `HTTP ${res.status}` : json.message ?? "API error");
        if (!json.member) throw new Error("Member missing in response");

        if (!cancelled) setMember(json.member);
      } catch (e: any) {
        if (!cancelled) {
          console.error("member detail fetch error", e);
          setError(e?.message ?? "Beklenmeyen bir hata oluştu.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, lossPage]);

  const vipStats = useMemo(() => {
    if (!member) return null;
    const history = member.history ?? [];
    if (!history.length) return { total: 0, first: null, last: null, daysSinceLast: null };

    const sorted = [...history].sort((a, b) => new Date(a.rewardAt).getTime() - new Date(b.rewardAt).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = last?.rewardAt != null ? diffInDays(new Date(last.rewardAt), new Date()) : null;

    return { total: history.length, first: first?.rewardAt ?? null, last: last?.rewardAt ?? null, daysSinceLast: days };
  }, [member]);

  const levelRewardMap = useMemo(() => {
    if (!member) return null;
    return {
      iron: member.rewards.iron,
      bronze: member.rewards.bronze,
      silver: member.rewards.silver,
      gold: member.rewards.gold,
      plat: member.rewards.plat,
      diamond: member.rewards.diamond,
    } as Partial<Record<LevelId, string | null>>;
  }, [member]);

  const lossMeta = useMemo(() => {
    if (!member) return null;
    return {
      total: member.lossHistoryTotal ?? 0,
      page: member.lossHistoryPage ?? lossPage,
      pageSize: member.lossHistoryPageSize ?? 20,
      totalPages: member.lossHistoryTotalPages ?? 1,
    };
  }, [member, lossPage]);

  if (loading && !member) return <div className="p-8 text-sm text-slate-400 animate-pulse">Üye detayları yükleniyor...</div>;

  if (error || !member) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-950/20 border border-red-900/50 px-6 py-4 text-sm text-red-200">
          <div className="font-semibold mb-1 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Hata Oluştu
          </div>
          <div className="opacity-80">{error ?? "Kullanıcı bulunamadı."}</div>
        </div>
      </div>
    );
  }

  const lossSummary: LossSummary | undefined = member.lossSummary;
  const lossHistory: LossHistoryItem[] = member.lossHistory ?? [];
  const levelMin = member.level.min;
  const levelMax = member.level.max;
  const deposit = member.deposit90d ?? 0;
  const progressPercent = levelMax && levelMax > levelMin
      ? Math.min(100, Math.max(0, ((deposit - levelMin) / (levelMax - levelMin)) * 100))
      : 0;

  return (
    <div className="p-6 md:p-8 space-y-8 text-slate-100 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-xl">
                 <Icons.User className="w-8 h-8" />
            </div>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight text-white">{member.username}</h1>
                 <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-slate-400 font-mono">ID: {member.backofficeId}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span className="text-slate-400">Kayıt: {formatDate(member.createdAt)}</span>
                 </div>
            </div>
        </div>
        
        {/* Header Sağ Taraf */}
        <div className="flex flex-col items-end gap-3">
            {/* Mevcut Seviye Kutusu Kaldırıldı */}
            
            <a
              href={`/api/members/${member.id}/export`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 px-4 py-2 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-900/20"
            >
              <Icons.Download className="w-4 h-4" />
              Excel Raporu İndir
            </a>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DetailStatCard 
            title="SON 90 GÜN YATIRIM" 
            value={formatTL(member.deposit90d)} 
            subtext="Sadece onaylı yatırımlar" 
            icon={Icons.Money} 
            colorClass="text-emerald-500" 
        />
        <DetailStatCard 
            title="SİSTEMDEKİ SÜRESİ" 
            value={`${diffInDays(new Date(member.createdAt), new Date())} Gün`} 
            subtext={`Kayıt: ${formatDate(member.createdAt)}`} 
            icon={Icons.Calendar} 
            colorClass="text-indigo-400" 
        />
        <DetailStatCard 
            title="VIP DURUMU" 
            value={member.level.name} 
            subtext="Aktif VIP Üye" 
            icon={Icons.Trophy} 
            colorClass="text-amber-400" 
        />
      </div>

      {/* YATIRIM GRAFİĞİ */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl">
        <div className="flex items-end justify-between mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Icons.TrendingUp className="w-5 h-5 text-emerald-400" />
                    Seviye İlerlemesi
                </h3>
                <p className="text-sm text-slate-400 mt-1">Son 90 gün yatırım hedefine göre mevcut konum.</p>
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold text-white">{progressPercent.toFixed(0)}%</div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tamamlandı</div>
            </div>
        </div>

        <div className="relative h-4 w-full bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-800/50">
           <div 
             className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.4)]"
             style={{ width: `${Math.min(progressPercent, 100)}%` }}
           ></div>
        </div>

        <div className="flex justify-between mt-3 text-xs font-medium text-slate-500">
            <span>{formatTL(levelMin)}</span>
            <span>{levelMax ? formatTL(levelMax) : "∞"}</span>
        </div>
      </div>

      {/* VIP DETAYLARI VE GEÇMİŞİ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Sol: VIP İstatistikleri */}
        <div className="space-y-6">
             <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 h-full shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-6 border-b border-slate-800 pb-4">VIP Genel Bakış</h3>
                
                {vipStats ? (
                <div className="space-y-4">
                     <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <span className="text-sm text-slate-400">Toplam Ödül</span>
                        <span className="text-base font-bold text-white">{vipStats.total}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <span className="text-sm text-slate-400">İlk Ödül Tarihi</span>
                        <span className="text-sm font-medium text-slate-200">{formatDate(vipStats.first ?? undefined)}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <span className="text-sm text-slate-400">Son Ödül Tarihi</span>
                        <span className="text-sm font-medium text-slate-200">{formatDate(vipStats.last ?? undefined)}</span>
                     </div>
                     <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                        <span className="text-sm text-slate-400">Geçen Süre</span>
                        <span className="text-sm font-medium text-slate-200">{vipStats.daysSinceLast != null ? `${vipStats.daysSinceLast} gün` : "-"}</span>
                     </div>
                </div>
                ) : (
                    <div className="text-sm text-slate-500 italic">Veri bulunamadı.</div>
                )}
             </div>
        </div>

        {/* Sağ: Ödül Tablosu */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
             <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30">
                 <h3 className="text-lg font-semibold text-white">Seviye Ödülleri</h3>
             </div>
             <div className="p-0">
                 <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                         <tr>
                             <th className="px-6 py-3 font-semibold">Seviye</th>
                             <th className="px-6 py-3 font-semibold">Ödül Tarihi</th>
                             <th className="px-6 py-3 font-semibold text-right">Durum</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                        {(Object.keys(LEVEL_LABELS) as LevelId[]).map((lvl) => {
                            const rewardDate = levelRewardMap?.[lvl];
                            const taken = !!rewardDate;
                            return (
                                <tr key={lvl} className="group hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-2 font-medium text-slate-200">
                                        {getVipIcon(lvl)}
                                        {LEVEL_LABELS[lvl]}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                        {rewardDate ? formatDate(rewardDate) : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {taken ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Alındı
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                                                Bekliyor
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                     </tbody>
                 </table>
             </div>
        </div>
      </div>

      {/* LOSS BONUS BÖLÜMÜ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Sol: Loss İstatistikleri */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-lg h-full">
            <h3 className="text-lg font-semibold text-white mb-6 border-b border-slate-800 pb-4">Kayıp Bonus Özeti</h3>
            
            {lossSummary && lossSummary.count > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <div className="text-xs text-slate-500 uppercase mb-1">Toplam Talep</div>
                        <div className="text-2xl font-bold text-white">{lossSummary.count}</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <div className="text-xs text-slate-500 uppercase mb-1">Toplam Kayıp</div>
                        <div className="text-2xl font-bold text-slate-200">{formatTL(lossSummary.totalLoss)}</div>
                    </div>
                    <div className="col-span-1 sm:col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="text-xs text-slate-500 uppercase mb-1">Toplam Nakit Bonus</div>
                            <div className="text-3xl font-bold text-[#efe047]">{formatTL(lossSummary.totalBonusCash)}</div>
                        </div>
                        <div className="absolute right-0 top-0 p-4 opacity-10">
                            <Icons.Money className="w-16 h-16 text-yellow-500" />
                        </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <div className="text-xs text-slate-500 uppercase mb-1">Freespin</div>
                        <div className="text-lg font-semibold text-slate-300">{formatNumber(lossSummary.totalBonusFreespin)}</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <div className="text-xs text-slate-500 uppercase mb-1">Freebet</div>
                        <div className="text-lg font-semibold text-slate-300">{formatNumber(lossSummary.totalBonusFreebet)}</div>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-slate-500 italic">Kayıt bulunamadı.</div>
            )}
        </div>

        {/* Sağ: Loss Geçmişi Tablosu */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Talep Geçmişi</h3>
                {lossMeta && <span className="text-xs text-slate-500">Toplam {lossMeta.total}</span>}
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Tarih</th>
                            <th className="px-6 py-3 font-semibold text-right">Kayıp</th>
                            <th className="px-6 py-3 font-semibold text-right">Nakit</th>
                            <th className="px-6 py-3 font-semibold text-right">Ekstra</th>
                            <th className="px-6 py-3 font-semibold text-right">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {lossHistory.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Kayıt yok.</td></tr>
                        ) : (
                            lossHistory.map((row) => (
                                <tr key={row.id} className="group hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-3 text-slate-400 text-xs font-mono">{formatDate(row.createdAt)}</td>
                                    <td className="px-6 py-3 text-right font-medium text-slate-300">{formatTL(row.loss ?? 0)}</td>
                                    <td className="px-6 py-3 text-right font-bold text-[#efe047]">
                                        {row.addedCash ? formatTL(row.addedCash) : "-"}
                                    </td>
                                    <td className="px-6 py-3 text-right text-xs text-slate-400">
                                        {(row.addedFreespin || 0) > 0 && <div>{row.addedFreespin} FS</div>}
                                        {(row.addedFreebet || 0) > 0 && <div>{row.addedFreebet} FB</div>}
                                        {!row.addedFreespin && !row.addedFreebet && "-"}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {lossMeta && lossMeta.totalPages > 1 && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/30 flex items-center justify-between">
                    <button
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={lossMeta.page <= 1}
                        onClick={() => setLossPage((p) => Math.max(1, p - 1))}
                    >
                        ← Önceki
                    </button>
                    <span className="text-xs text-slate-500 font-mono">
                        {lossMeta.page} / {lossMeta.totalPages}
                    </span>
                    <button
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={lossMeta.page >= lossMeta.totalPages}
                        onClick={() => setLossPage((p) => Math.min(lossMeta.totalPages, p + 1))}
                    >
                        Sonraki →
                    </button>
                </div>
            )}
        </div>

      </div>

    </div>
  );
};

export default MemberDetail;