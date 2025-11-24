// app/members/_components/MembersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
// import { useSearchParams } from "next/navigation"; // Gerçek projede bu satırı açın, alttaki mock'u silin.

// --- ÖNİZLEME İÇİN MOCK (Tarayıcı ortamı simülasyonu) ---
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

type SortOption = "deposit_desc" | "deposit_asc" | "created_desc" | "created_asc";
type QuickFilter = "none" | "new" | "dropping" | "near_next_level";

const VIP_LEVEL_OPTIONS = [
  { value: "all", label: "Tüm VIP seviyeleri" },
  { value: "iron", label: "Demir" },
  { value: "bronze", label: "Bronz" },
  { value: "silver", label: "Gümüş" },
  { value: "gold", label: "Altın" },
  { value: "plat", label: "Platin" },
  { value: "diamond", label: "Elmas" },
] as const;

const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "none", label: "Hazır filtre yok" },
  { value: "new", label: "Yeni VIP üyeler" },
  { value: "dropping", label: "Yatırımı düşen VIP’ler" },
  { value: "near_next_level", label: "Bir üst VIP seviyesine yaklaşanlar" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "deposit_desc", label: "Yatırım (yüksek → düşük)" },
  { value: "deposit_asc", label: "Yatırım (düşük → yüksek)" },
  { value: "created_desc", label: "Kayıt tarihi (yeni → eski)" },
  { value: "created_asc", label: "Kayıt tarihi (eski → yeni)" },
];

const PAGE_SIZE = 50;

function getVipBadgeClasses(levelId?: string | null): string {
  const base =
    "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium border";

  if (!levelId) {
    return `${base} bg-slate-800 text-slate-200 border-slate-600/60`;
  }

  switch (levelId.toLowerCase()) {
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

// Yatırım Miktarı Formatlayıcı (TL)
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "₺0";
  // Veritabanı artık TL olduğu için direkt yuvarlıyoruz
  const abs = Math.round(amount);
  return (
    "₺" +
    abs
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

// DÜZELTME: Freespin/Freebet formatlayıcı
// İsteğiniz üzerine 100'e bölme işlemini kaldırdık, veriyi direkt gösteriyoruz.
function formatNumber(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "0";
  const abs = Math.round(amount); // Bölme işlemi kaldırıldı
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

  // URL'den ilk filtreleri çek
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

    if (qpQuick && QUICK_FILTER_OPTIONS.some((o) => o.value === qpQuick))
      setQuickFilter(qpQuick as QuickFilter);
      
    if (qpMin) setMinDeposit(qpMin);
    if (qpMax) setMaxDeposit(qpMax);
    if (qpFrom) setCreatedFrom(qpFrom);
    if (qpTo) setCreatedTo(qpTo);
    if (qpPage && !Number.isNaN(Number(qpPage))) setPage(Number(qpPage));

    setInitialized(true);
  }, [searchParams, initialized]);

  // API'den verileri çek
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

        const res = await fetch(`/api/vip-members?${params.toString()}`, {
          signal: controller.signal,
        });

        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
           console.warn("API Error:", res.status);
           setItems([]);
           return;
        }

        setItems(json.items ?? []);
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
  }, [
    initialized,
    page,
    sort,
    search,
    vipLevel,
    minDeposit,
    maxDeposit,
    createdFrom,
    createdTo,
    quickFilter,
  ]);

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

      const res = await fetch(
        `/api/vip-members/export.xlsx?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error(`Export HTTP ${res.status}`);
      }

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
    <div className="w-full space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VIP Üyeler</h1>
          <p className="text-sm text-slate-400">
            Son 90 günde minimum 10.000₺ yatırımı olan üyeler.
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          <span className="uppercase text-xs tracking-wide">
            Toplam VIP üye
          </span>
          <div className="text-lg font-semibold text-slate-50">
            {totalVipMembers.toLocaleString("tr-TR")}
          </div>
        </div>
      </header>

      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Kullanıcı adı veya Backoffice ID ara..."
            className="flex-1 rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
          />

          <select
            value={vipLevel}
            onChange={(e) => {
              setVipLevel(e.target.value);
              setPage(1);
            }}
            className="w-44 rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
          >
            {VIP_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOption);
              setPage(1);
            }}
            className="w-52 rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Yatırım aralığı</span>
            <input
              value={minDeposit}
              onChange={(e) => {
                setMinDeposit(e.target.value);
                setPage(1);
              }}
              placeholder="Min"
              className="w-24 rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
            <span className="text-xs text-slate-500">-</span>
            <input
              value={maxDeposit}
              onChange={(e) => {
                setMaxDeposit(e.target.value);
                setPage(1);
              }}
              placeholder="Maks"
              className="w-24 rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Kayıt tarihi</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => {
                setCreatedFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
            <span className="text-xs text-slate-500">-</span>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => {
                setCreatedTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-2 justify-end">
            <select
              value={quickFilter}
              onChange={(e) => {
                setQuickFilter(e.target.value as QuickFilter);
                setPage(1);
              }}
              className="w-52 rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            >
              {QUICK_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
            >
              Filtreleri temizle
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? "İndiriliyor..." : "Excel indir"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Kullanıcı</th>
                <th className="px-4 py-2 text-left">Backoffice ID</th>
                <th className="px-4 py-2 text-left">VIP seviye</th>
                <th className="px-4 py-2 text-right">Son 90 gün yatırım</th>
                <th className="px-4 py-2 text-right">
                  Toplam VIP Kayıp Talep Sayısı
                </th>
                <th className="px-4 py-2 text-right">
                  Toplam kayıp (talep bazlı)
                </th>
                <th className="px-4 py-2 text-right">Toplam nakit bonus</th>
                <th className="px-4 py-2 text-right">
                  Toplam freebet / freespin
                </th>
                <th className="px-4 py-2 text-left">Kayıt tarihi</th>
                <th className="px-4 py-2 text-right">Detay</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    Seçilen filtrelere uygun VIP üye bulunamadı.
                  </td>
                </tr>
              )}

              {items.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/40 transition"
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-50">
                        {m.username}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ID: {m.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle text-slate-100">
                    {m.backofficeId}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className={getVipBadgeClasses(m.levelId)}>
                      {m.levelName ?? m.vipStatus ?? "VIP"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {formatCurrency(m.deposit90d)}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {m.lossBonusCount?.toLocaleString("tr-TR") ?? "0"}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {formatCurrency(m.lossTotal)}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {formatCurrency(m.lossBonusCash)}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <div className="flex flex-col items-end text-xs text-slate-200">
                      <span>
                        Freebet: {formatNumber(m.lossBonusFreebet)}
                      </span>
                      <span>
                        Freespin: {formatNumber(m.lossBonusFreespin)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle text-slate-100">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <a
                      href={`/members/${m.id}`}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Detay →
                    </a>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-sm text-slate-400"
                  >
                    Yükleniyor...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Toplam{" "}
            <span className="font-semibold text-slate-100">
              {items.length}
            </span>{" "}
            kayıt — sayfa başı {PAGE_SIZE}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-xs"
            >
              ← Önceki
            </button>
            <span>
              Sayfa{" "}
              <span className="font-semibold text-slate-100">{page}</span> /{" "}
              {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-xs"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}