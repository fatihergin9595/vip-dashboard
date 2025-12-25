// app/members/_components/MembersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

// --- MOCK SEARCH PARAMS ---
const useSearchParams = () => {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setParams(new URLSearchParams(window.location.search));
    }
  }, []);
  return params;
};
// --------------------------

// --- TİP TANIMLAMALARI ---
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

// Kayıt tarihi (created) kaldırıldı, username eklendi
type SortOption = "deposit_desc" | "deposit_asc" 
                | "loss_total_desc" | "loss_total_asc" 
                | "bonus_cash_desc" | "bonus_cash_asc" 
                | "loss_count_desc" | "loss_count_asc"
                | "username_asc" | "username_desc";

type QuickFilter = "none" | "new" | "dropping" | "near_next_level";

const VIP_LEVEL_OPTIONS = [
  { value: "all", label: "Tüm VIP Seviyeleri" },
  { value: "iron", label: "Demir" },
  { value: "bronze", label: "Bronz" },
  { value: "silver", label: "Gümüş" },
  { value: "gold", label: "Altın" },
  { value: "plat", label: "Platin" },
  { value: "diamond", label: "Elmas" },
] as const;

const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "none", label: "Hızlı Filtre Yok" },
  { value: "new", label: "Yeni VIP Üyeler" },
  { value: "dropping", label: "Yatırımı Düşenler" },
  { value: "near_next_level", label: "Seviye Atlamaya Yakın" },
];

// Sıralama seçenekleri güncellendi
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "deposit_desc", label: "Yatırım (Önce Yüksek)" },
  { value: "deposit_asc", label: "Yatırım (Önce Düşük)" },
  { value: "loss_total_desc", label: "Toplam Kayıp (Önce Yüksek)" },
  { value: "loss_total_asc", label: "Toplam Kayıp (Önce Düşük)" },
  { value: "bonus_cash_desc", label: "Nakit Bonus (Önce Yüksek)" },
  { value: "bonus_cash_asc", label: "Nakit Bonus (Önce Düşük)" },
  { value: "loss_count_desc", label: "Talep Sayısı (Önce Yüksek)" },
  { value: "loss_count_asc", label: "Talep Sayısı (Önce Düşük)" },
  { value: "username_asc", label: "Kullanıcı Adı (A-Z)" },
  { value: "username_desc", label: "Kullanıcı Adı (Z-A)" },
];

const PAGE_SIZE = 50;

// --- GÖRSEL İKONLAR ---
const Icons = {
  Search: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  Calendar: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Filter: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  ),
  Money: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Download: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
};

// --- VIP İKONLARI ---
function getVipIcon(levelId?: string | null) {
  if (!levelId) return null;
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 48 48", 
    className: "w-[18px] h-[18px] mr-1.5 shrink-0",
    fill: "currentColor"
  };

  switch (levelId.toLowerCase()) {
    case "iron":
      return <svg {...props} viewBox="0 0 160 160" className={`${props.className} text-slate-400`}><path d="M44.561 126.637a2.01 2.01 0 0 0-2.011 2.011v11.974c0 1.111.9 2.011 2.011 2.011h92.387a2.01 2.01 0 0 0 2.011-2.011v-11.974a2.01 2.01 0 0 0-2.011-2.011H44.561zM136.948 68.916H44.561a2.01 2.01 0 0 0-2.011 2.011V104.5c0 1.1.883 1.99 1.983 2.014.451.01.902.015 1.355.015h.181c5.771 0 10.466 4.534 10.466 10.114 0 2.464-.925 4.72-2.45 6.475h69.236c-5.722-3.777-9.498-10.132-9.498-17.343 0-11.572 9.692-20.983 21.616-20.983a3.516 3.516 0 0 0 3.519-3.519V70.927a2.01 2.01 0 0 0-2.01-2.011zM36.192 76.287v-.002H9.554c-1.726 0-3.372.927-4.116 2.485a4.307 4.307 0 0 0 .959 5.073c8.253 9.771 19.914 15.903 32.634 17.323V76.287h-2.839zM150.476 34.061h-48.539v9.049h48.539a4.524 4.524 0 0 0 0-9.049zM95.653 17.367l-13.57 3.016a2.765 2.765 0 0 0-2.765 2.765v10.913h-2.823a4.524 4.524 0 0 0 0 9.048h2.823v10.913a2.765 2.765 0 0 0 2.765 2.765h13.57a2.765 2.765 0 0 0 2.765-2.765v-33.89a2.766 2.766 0 0 0-2.765-2.765zM49.802 53.438l11.372 8.759V51.941l6.358 12.401 2.926-3.607.822 4.677h5.077l-2.874-16.345-5.002 6.167L56.174 31.23v20.805L40.278 39.794l8.041 25.618h5.24zM107.186 60.275l3.983 3.718 6.865-5.169-1.649 6.588h5.154l4.774-19.082-14.8 11.145-6.017-5.616-6.113 13.553h5.485z"></path></svg>;
    case "bronze":
      return <svg {...props} viewBox="0 0 24 24" className={`${props.className} text-amber-600`}><path fillRule="evenodd" d="M2.5 3C2.5 2.44772 2.94772 2 3.5 2H20.5C21.0523 2 21.5 2.44772 21.5 3C21.5 3.55228 21.0523 4 20.5 4H20V16C20 16.323 19.844 16.626 19.5812 16.8137L12.5812 21.8137C12.2335 22.0621 11.7665 22.0621 11.4188 21.8137L4.41876 16.8137C4.15597 16.626 4 16.323 4 16V4H3.5C2.94772 4 2.5 3.55228 2.5 3ZM12 6C12.3393 6 12.6555 6.1721 12.8398 6.45709L13.9984 8.24935L16.061 8.79748C16.389 8.88463 16.6504 9.13217 16.7553 9.45492C16.8601 9.77766 16.7942 10.1316 16.5801 10.3948L15.2336 12.0507L15.3496 14.1817C15.3681 14.5205 15.2134 14.8456 14.9389 15.0451C14.6644 15.2446 14.3074 15.2912 13.9908 15.1689L12 14.4L10.0091 15.1689C9.69256 15.2912 9.33559 15.2446 9.06105 15.0451C8.78651 14.8456 8.63186 14.5205 8.65032 14.1817L8.76639 12.0507L7.4199 10.3948C7.2058 10.1316 7.13983 9.77766 7.2447 9.45492C7.34956 9.13217 7.61095 8.88463 7.93892 8.79748L10.0015 8.24935L11.1602 6.45709C11.3444 6.1721 11.6606 6 12 6Z" clipRule="evenodd"></path></svg>;
    case "silver":
      return <svg {...props} viewBox="0 0 64 64" stroke="#d9d7d7" strokeWidth="0.5" fill="#1A61B0" className={`${props.className}`}><path d="M48.9,24.5635A1,1,0,0,0,48,24H37.58L45.9038,6.4277A.9994.9994,0,0,0,45,5H29a1,1,0,0,0-.9126.5908l-13,29A1,1,0,0,0,16,36h9.7592L21.0229,57.7871a1,1,0,0,0,1.7627.832l26-33A1.0013,1.0013,0,0,0,48.9,24.5635Z"></path></svg>;
           case "gold":
         return <svg {...props} viewBox="0 0 500 500" className={`${props.className} text-yellow-300`}>
         <path fill="#efe047" fillRule="evenodd" d="M492.926 373.652l-29.862-56.448c-3.374-6.38-9.72-10.211-16.467-10.211-1.112 0-2.236.104-3.358.318l-58.772 11.211c-7.032 1.34-12.746 6.762-14.753 14.006l-18.202 65.62c-1.838 6.627-.296 13.787 4.077 18.922 3.612 4.242 8.73 6.603 14.03 6.603 1.115 0 2.236-.104 3.354-.316l106.837-20.379c5.998-1.144 11.102-5.278 13.707-11.096C496.118 386.06 495.899 379.271 492.926 373.652zM369.618 403.749l18.201-65.619 58.772-11.211 29.863 56.451L369.618 403.749zM101.114 175.552l166.149 134.811c7.635 6.071 12.772 11.493 33.646 7.636l105.604-19.074c5.931-1.073 10.977-4.941 13.55-10.388 2.574-5.448 2.357-11.804-.583-17.063l-28.299-65.626L212.287 70.352c-3.247-2.427-4.905-3.711-8.9-3.711-1.104 0-2.212.099-3.316.297l-66.737 10.704c-11.989 2.061-17.178 16.759-19.136 22.429l-18.961 54.912C92.676 162.392 95.027 170.612 101.114 175.552zM403.2 280.568l-105.605 19.076 17.992-61.423 63.764-12.759L403.2 280.568zM198.854 81.558l169.611 126.764-58.681 10.601L144.868 91.309 198.854 81.558zM131.828 106.157l164.966 127.126-17.779 62.597L112.866 161.069 131.828 106.157z" clipRule="evenodd"></path><path fill="#efe047" fillRule="evenodd" d="M304.888,333.504l-0.408-0.336l-41.14,7.302l-38.346,7.461L56.062,207.13l40.91-7.961l-16.327-13.866l-36.397,6.746c-12.281,2.274-17.598,18.49-19.602,24.746L5.224,277.381c-2.622,8.178-0.216,17.247,6.02,22.697l170.192,148.743c7.822,6.698,13.084,12.682,34.467,8.426l108.174-21.048c6.074-1.181,11.244-5.452,13.881-11.46c2.636-6.013,2.413-13.024-0.598-18.827L304.888,333.504z M193.474,432.842L23.281,284.099l19.425-60.587l168.98,140.264L193.474,432.842z M212.507,436.996l18.428-67.772l59.51-11.575l30.237,58.3L212.507,436.996z" clipRule="evenodd"></path><polygon fill="#efe047" fillRule="evenodd" points="408.858 168.462 416.592 136.253 448.8 128.52 416.592 120.785 408.858 88.576 401.124 120.785 368.916 128.52 401.124 136.253" clipRule="evenodd"></polygon><polygon fill="#efe047" fillRule="evenodd" points="337.533 94.638 343.167 72.109 365.695 66.479 343.167 60.845 337.533 38.317 331.903 60.845 309.373 66.479 331.903 72.109" clipRule="evenodd"></polygon>
        </svg>;
    case "plat":
      return <svg {...props} viewBox="0 0 64 64" stroke="white" strokeWidth="0.5" className={`${props.className} text-indigo-400`}><polygon points="47.616 42.516 43.867 43.765 41.22 57 44.208 57 47.616 42.516"></polygon><polygon points="39.18 57 41.813 43.84 30.398 42.21 34.748 57 39.18 57"></polygon><polygon points="4.943 31 13.847 31 12.363 20.612 4.943 31"></polygon><polygon points="4.832 33 21.546 59 25.484 59 14.341 33 4.832 33"></polygon><path d="M31.721,53.793l-3.68-12.511a1,1,0,0,1,.216-.951l1.6-1.781L28.2,26.518,16.291,32.473,27.333,58.239Z"></path></svg>;
    case "diamond":
      return <svg {...props} viewBox="0 0 68 68" className={`${props.className} text-cyan-400`}><path d="M65.507 26.572c-1.441-1.567-5.415-6.188-7.016-7.335-.04-.054-.078-.11-.134-.154-2.02-1.554-4.523-3.47-6.642-4.893-1.244-.835-2.728-1.374-4.67-1.696-10.16-1.69-21.56-1.628-25.414.138-3.275 1.502-8.075 4.054-10.822 6.306-.05.041-.081.095-.118.145l-6.596 6.18c-5.562 2.44 1.56 8.328 5.03 12.478A5313.97 5313.97 0 0 0 31.645 64.5c1.679 1.98 2.884 2.057 4.568-.084l7.604-9.672c7.98-9.067 15.41-17.957 21.826-26.146.467-.596.411-1.43-.136-2.026z" /></svg>;
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

// --- FORMAT FONKSİYONLARI ---
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₺0";
  const abs = Math.round(amount);
  return "₺" + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatNumber(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "0";
  const abs = Math.round(amount);
  return abs.toLocaleString("tr-TR");
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function MembersClient() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<VipMember[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [vipLevel, setVipLevel] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("deposit_desc");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("none");

  const [minDeposit, setMinDeposit] = useState<string>("");
  const [maxDeposit, setMaxDeposit] = useState<string>("");

  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");

  const [initialized, setInitialized] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalVipMembers = useMemo(() => total, [total]);

  // Sıralama değişimi (CREATED KALDIRILDI, USERNAME EKLENDİ)
  const handleSortChange = (column: 'deposit' | 'username' | 'loss_total' | 'bonus_cash' | 'loss_count') => {
    const currentSortPrefix = `${column}_`;
    const isCurrentColumn = sort.startsWith(currentSortPrefix);
    const currentDirection = sort.endsWith('_desc') ? 'desc' : 'asc';
    
    let newSort: SortOption;
    if (isCurrentColumn) {
      const newDirection = currentDirection === 'desc' ? 'asc' : 'desc';
      newSort = `${column}_${newDirection}` as SortOption;
    } else {
      // Varsayılan yönler
      if (column === 'username') newSort = `${column}_asc` as SortOption; // A-Z
      else newSort = `${column}_desc` as SortOption; // Sayısal alanlar yüksek-düşük
    }
    setSort(newSort);
    setPage(1);
  };

  // Sıralama İkonu (CREATED KALDIRILDI)
  const getSortIcon = (column: 'deposit' | 'username' | 'loss_total' | 'bonus_cash' | 'loss_count') => {
    const sortPrefix = `${column}_`;
    if (sort.startsWith(sortPrefix)) {
      const direction = sort.endsWith('_asc') ? 'asc' : 'desc';
      const color = 'text-emerald-400';
      const rotation = direction === 'asc' ? 'rotate-180' : '';
      return (
        <svg className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-200 ${color} ${rotation}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
      </svg>
    );
  };

  // URL'den oku
  useEffect(() => {
    if (initialized) return;
    const sp = searchParams;
    if (!sp) return;

    const qpSearch = sp.get("search");
    const qpVip = sp.get("vipLevel") || sp.get("level");
    const qpSortRaw = sp.get("sort") || sp.get("sortBy");
    let qpQuick = sp.get("quickFilter") || sp.get("filter");
    if (qpQuick === "new_vip") qpQuick = "new";

    const qpMin = sp.get("minDeposit");
    const qpMax = sp.get("maxDeposit");
    const qpFrom = sp.get("createdFrom");
    const qpTo = sp.get("createdTo");
    const qpPage = sp.get("page");

    if (qpSearch) setSearch(qpSearch);
    if (qpVip) setVipLevel(qpVip);
    if (qpSortRaw) {
        if (SORT_OPTIONS.some((o) => o.value === qpSortRaw)) {
            setSort(qpSortRaw as SortOption);
        } else if (qpSortRaw === "totalDeposit") {
            setSort("deposit_desc");
        }
    }
    if (qpQuick && QUICK_FILTER_OPTIONS.some((o) => o.value === qpQuick)) setQuickFilter(qpQuick as QuickFilter);
    if (qpMin) setMinDeposit(qpMin);
    if (qpMax) setMaxDeposit(qpMax);
    if (qpFrom) setCreatedFrom(qpFrom);
    if (qpTo) setCreatedTo(qpTo);
    if (qpPage && !Number.isNaN(Number(qpPage))) setPage(Number(qpPage));

    setInitialized(true);
  }, [searchParams, initialized]);

  // Veri Çekme
  useEffect(() => {
    if (!initialized) return;
    const controller = new AbortController();

    async function fetchMembers() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        params.set("sort", sort);
        params.set("sortBy", sort);

        if (search.trim()) params.set("search", search.trim());
        if (vipLevel && vipLevel !== "all") {
            params.set("vipLevel", vipLevel);
            params.set("level", vipLevel);
        }
        if (minDeposit.trim()) params.set("minDeposit", minDeposit.trim());
        if (maxDeposit.trim()) params.set("maxDeposit", maxDeposit.trim());
        if (createdFrom.trim()) params.set("createdFrom", createdFrom.trim());
        if (createdTo.trim()) params.set("createdTo", createdTo.trim());
        if (quickFilter && quickFilter !== "none") {
            params.set("quickFilter", quickFilter);
            params.set("filter", quickFilter);
        }

        if (typeof window !== "undefined") {
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState(null, "", newUrl);
        }

        const res = await fetch(`/api/vip-members?${params.toString()}`, { signal: controller.signal });
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
           console.warn("API Error:", res.status);
           setItems([]);
           return;
        }

        // --- GÜNCELLENMİŞ FRONTEND SIRALAMA ---
        // (Tüm sayısal alanlar ve kullanıcı adı eklendi)
        let sortedItems = json.items ?? [];
        
        const sortableColumns = ['deposit', 'loss_total', 'bonus_cash', 'loss_count', 'username'];

        if (sortableColumns.some(col => sort.includes(col))) {
            const [column, direction] = sort.split('_');
            const isDesc = direction === 'desc';

            sortedItems.sort((a, b) => {
                let valA: number | string = 0;
                let valB: number | string = 0;

                switch (column) {
                    case 'deposit': 
                        valA = a.deposit90d; 
                        valB = b.deposit90d; 
                        break;
                    case 'loss_total': 
                        valA = a.lossTotal; 
                        valB = b.lossTotal; 
                        break;
                    case 'bonus_cash': 
                        valA = a.lossBonusCash; 
                        valB = b.lossBonusCash; 
                        break;
                    case 'loss_count': 
                        valA = a.lossBonusCount; 
                        valB = b.lossBonusCount; 
                        break;
                    case 'username':
                        // String karşılaştırma
                        return isDesc 
                            ? b.username.localeCompare(a.username) 
                            : a.username.localeCompare(b.username);
                    default: 
                        return 0;
                }

                if (valA === valB) return 0;
                // Sayısal karşılaştırma
                return isDesc ? (valA < valB ? 1 : -1) : (valA > valB ? 1 : -1);
            });
        }
        // ------------------------------------

        setItems(sortedItems);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("vip-members fetch error", err);
        setError(err?.message ?? "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
    return () => controller.abort();
  }, [initialized, page, sort, search, vipLevel, minDeposit, maxDeposit, createdFrom, createdTo, quickFilter]);

  function resetFilters() {
    setSearch("");
    setVipLevel("all");
    setSort("deposit_desc");
    setQuickFilter("none");
    setMinDeposit("");
    setMaxDeposit("");
    setCreatedFrom("");
    setCreatedTo("");
    setPage(1);
  }

  async function handleExportExcel() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "5000"); 
      params.set("sort", sort);
      params.set("sortBy", sort);
      if (search.trim()) params.set("search", search.trim());
      if (vipLevel && vipLevel !== "all") { params.set("vipLevel", vipLevel); params.set("level", vipLevel); }
      if (minDeposit.trim()) params.set("minDeposit", minDeposit.trim());
      if (maxDeposit.trim()) params.set("maxDeposit", maxDeposit.trim());
      if (createdFrom.trim()) params.set("createdFrom", createdFrom.trim());
      if (createdTo.trim()) params.set("createdTo", createdTo.trim());
      if (quickFilter && quickFilter !== "none") { params.set("quickFilter", quickFilter); params.set("filter", quickFilter); }

      const res = await fetch(`/api/vip-members/export.xlsx?${params.toString()}`);
      if (!res.ok) throw new Error(`Export HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vip-uyeler-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("excel export error", err);
      alert("Excel indirme hatası: " + (err?.message ?? ""));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">VIP Üyeler</h1>
          <p className="text-sm text-slate-400 mt-1">
            Son 90 günde minimum 10.000₺ yatırımı olan üyeler listesi.
          </p>
        </div>
        
        {/* Performans için backdrop-blur kaldırıldı, solid renk kullanıldı */}
        <div className="bg-slate-900 border border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-md">
           <div className="bg-emerald-500/10 p-2 rounded-lg">
             <Icons.Filter className="w-6 h-6 text-emerald-400" />
           </div>
           <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtrelenen Üye</p>
              <p className="text-2xl font-bold text-white">{totalVipMembers.toLocaleString("tr-TR")}</p>
           </div>
        </div>
      </header>

      {/* --- KONTROL PANELİ (FİLTRELER) --- */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        
        {/* Satır 1: Ana Aramalar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="relative group col-span-1 md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icons.Search className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            </div>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Kullanıcı adı veya Backoffice ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-sm"
            />
          </div>

          <div className="relative">
             <select
                value={vipLevel}
                onChange={(e) => { setVipLevel(e.target.value); setPage(1); }}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer"
             >
                {VIP_LEVEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
               <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
             </div>
          </div>

          <div className="relative">
             <select
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer"
             >
                {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
             </div>
          </div>
        </div>

        {/* Satır 2: Detaylı Filtreler */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          
          <div className="lg:col-span-3 flex flex-col gap-1.5">
             <label className="text-xs font-medium text-slate-400 ml-1 flex items-center gap-1">
                <Icons.Money className="w-3.5 h-3.5" /> Yatırım Aralığı
             </label>
             <div className="flex items-center gap-2">
               <input
                 value={minDeposit}
                 onChange={(e) => { setMinDeposit(e.target.value); setPage(1); }}
                 placeholder="Min"
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500/50 outline-none"
               />
               <span className="text-slate-600">-</span>
               <input
                 value={maxDeposit}
                 onChange={(e) => { setMaxDeposit(e.target.value); setPage(1); }}
                 placeholder="Max"
                 className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs focus:border-emerald-500/50 outline-none"
               />
             </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-1.5">
             <label className="text-xs font-medium text-slate-400 ml-1 flex items-center gap-1">
                <Icons.Calendar className="w-3.5 h-3.5" /> Kayıt Tarihi
             </label>
             <div className="flex items-center gap-2">
                <input type="date" value={createdFrom} onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-emerald-500/50 outline-none" />
                <span className="text-slate-600">-</span>
                <input type="date" value={createdTo} onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-emerald-500/50 outline-none" />
             </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-1.5">
             <label className="text-xs font-medium text-slate-400 ml-1">Hızlı Filtreler</label>
             <select
                value={quickFilter}
                onChange={(e) => { setQuickFilter(e.target.value as QuickFilter); setPage(1); }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:border-emerald-500/50 outline-none cursor-pointer"
             >
                {QUICK_FILTER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          </div>

          <div className="lg:col-span-3 flex items-center justify-end gap-2">
             <button
               type="button"
               onClick={resetFilters}
               className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors hover:text-white"
             >
               Temizle
             </button>
             <button
               type="button"
               onClick={handleExportExcel}
               disabled={exporting}
               className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {exporting ? (
                 <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
               ) : (
                 <Icons.Download className="w-4 h-4" />
               )}
               {exporting ? "İndiriliyor..." : "Excel İndir"}
             </button>
          </div>

        </div>
      </section>

      {/* --- TABLO --- */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                {/* Kullanıcı Adı Sıralaması */}
                <th 
                  className="px-6 py-4 text-left font-semibold cursor-pointer group hover:text-emerald-400 transition-colors"
                  onClick={() => handleSortChange('username')}
                >
                   <div className="flex items-center">
                      Kullanıcı
                      {getSortIcon('username')}
                   </div>
                </th>

                <th className="px-6 py-4 text-left font-semibold">ID</th>
                <th className="px-6 py-4 text-left font-semibold">Seviye</th>
                
                {/* Sayısal Sıralamalar */}
                {[
                  { key: 'deposit', label: '90 Gün Yatırım', align: 'right' },
                  { key: 'loss_count', label: 'Talep', align: 'right' },
                  { key: 'loss_total', label: 'Toplam Kayıp', align: 'right' },
                  { key: 'bonus_cash', label: 'Nakit Bonus', align: 'right' },
                ].map((col) => (
                  <th 
                    key={col.key}
                    className={`px-6 py-4 cursor-pointer group hover:text-emerald-400 transition-colors text-${col.align}`}
                    onClick={() => handleSortChange(col.key as any)}
                  >
                    <div className={`flex items-center justify-${col.align === 'right' ? 'end' : 'start'}`}>
                      {col.label}
                      {getSortIcon(col.key as any)}
                    </div>
                  </th>
                ))}

                <th className="px-6 py-4 text-right font-semibold">Freebet / Spin</th>
                <th className="px-6 py-4 text-left font-semibold">Kayıt Tarihi</th> {/* Sıralama kaldırıldı */}
                <th className="px-6 py-4 text-right font-semibold">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <Icons.Search className="w-10 h-10 mb-3 opacity-20" />
                        Seçilen filtrelere uygun VIP üye bulunamadı.
                    </div>
                  </td>
                </tr>
              )}

              {items.map((m) => (
                <tr key={m.id} className="group hover:bg-slate-800/50 transition-colors duration-100">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{m.username}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{m.backofficeId}</td>
                  <td className="px-6 py-4">
                    <span className={getBadgeStyle(m.levelId ?? "")}>
                      {getVipIcon(m.levelId)}
                      <span className="ml-1.5">{m.levelName ?? m.vipStatus ?? "VIP"}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-400">
                    {formatCurrency(m.deposit90d)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    {m.lossBonusCount?.toLocaleString("tr-TR") ?? "0"}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-200">
                    {formatCurrency(m.lossTotal)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-[#efe047]">
                    {formatCurrency(m.lossBonusCash)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                       <span className="text-xs text-slate-400">FB: <span className="text-slate-200">{formatNumber(m.lossBonusFreebet)}</span></span>
                       <span className="text-xs text-slate-400">FS: <span className="text-slate-200">{formatNumber(m.lossBonusFreespin)}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a href={`/members/${m.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </a>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 animate-pulse">
                    Veriler yükleniyor...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Toplam <span className="font-semibold text-white">{items.length}</span> kayıt gösteriliyor — Sayfa başı {PAGE_SIZE}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Önceki
            </button>
            <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200">
               {page} / {totalPages}
            </div>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}