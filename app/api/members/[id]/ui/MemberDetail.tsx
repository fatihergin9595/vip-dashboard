"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

// Yardımcı format fonksiyonları
function formatTL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return (
    "₺" +
    value
      .toFixed(0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
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

export const MemberDetail: React.FC<MemberDetailProps> = ({ id }) => {
  const router = useRouter();

  // Login guard
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("vipUser");
      if (!raw) {
        router.push("/login");
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.username !== "string") {
        router.push("/login");
        return;
      }

      setAuthChecked(true);
    } catch {
      router.push("/login");
    }
  }, [router]);

  const [member, setMember] = useState<MemberPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loss bonus sayfalama
  const [lossPage, setLossPage] = useState(1);

  // Üye detayını çek
  useEffect(() => {
    if (!authChecked) return; // login kontrolü bitmeden API çağrısı yapma

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/members/${id}?lossPage=${lossPage}`;
        const res = await fetch(url);

        const json = (await res.json()) as MemberApiResponse;

        if (!res.ok || !json.ok) {
          throw new Error(
            !res.ok ? `HTTP ${res.status}` : json.message ?? "API error"
          );
        }

        if (!json.member) {
          throw new Error("Member missing in response");
        }

        if (!cancelled) {
          setMember(json.member);
        }
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

    return () => {
      cancelled = true;
    };
  }, [id, lossPage, authChecked]);

  // Auth check tamamlanmadan hiçbir şey render etme
  if (!authChecked) {
    return null;
  }

  // VIP istatistikleri
  const vipStats = useMemo(() => {
    if (!member) return null;
    const history = member.history ?? [];

    if (!history.length) {
      return {
        total: 0,
        first: null as string | null,
        last: null as string | null,
        daysSinceLast: null as number | null,
      };
    }

    const sorted = [...history].sort(
      (a, b) => new Date(a.rewardAt).getTime() - new Date(b.rewardAt).getTime()
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const days =
      last?.rewardAt != null
        ? diffInDays(new Date(last.rewardAt), new Date())
        : null;

    return {
      total: history.length,
      first: first?.rewardAt ?? null,
      last: last?.rewardAt ?? null,
      daysSinceLast: days,
    };
  }, [member]);

  // Seviye bazlı ödül tarihleri için map
  const levelRewardMap = useMemo(() => {
    if (!member) return null;

    const map: Partial<Record<LevelId, string | null>> = {
      iron: member.rewards.iron,
      bronze: member.rewards.bronze,
      silver: member.rewards.silver,
      gold: member.rewards.gold,
      plat: member.rewards.plat,
      diamond: member.rewards.diamond,
    };

    return map;
  }, [member]);

  // Loss bonus sayfalama metrikleri
  const lossMeta = useMemo(() => {
    if (!member) return null;

    const total = member.lossHistoryTotal ?? 0;
    const page = member.lossHistoryPage ?? lossPage;
    const pageSize = member.lossHistoryPageSize ?? 20;
    const totalPages = member.lossHistoryTotalPages ?? 1;

    return { total, page, pageSize, totalPages };
  }, [member, lossPage]);

  // UI state
  if (loading && !member) {
    return (
      <div className="p-8 text-sm text-slate-300">
        Yükleniyor, lütfen bekleyin...
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-100">
          <div className="font-semibold mb-1">Kullanıcı bulunamadı / hata</div>
          <div>{error ?? "ID geçersiz veya böyle bir kullanıcı yok."}</div>
          <div className="mt-2 text-xs opacity-70">ID: {id || "—"}</div>
        </div>
      </div>
    );
  }

  const lossSummary: LossSummary | undefined = member.lossSummary;
  const lossHistory: LossHistoryItem[] = member.lossHistory ?? [];

  const levelMin = member.level.min;
  const levelMax = member.level.max;
  const deposit = member.deposit90d ?? 0;
  const progressPercent =
    levelMax && levelMax > levelMin
      ? Math.min(
          100,
          Math.max(0, ((deposit - levelMin) / (levelMax - levelMin)) * 100)
        )
      : 0;

  return (
    <div className="p-8 space-y-8 text-slate-100">
      {/* Üst başlık */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-semibold">{member.username}</div>
          <div className="text-xs opacity-70 mt-1">
            Backoffice ID: {member.backofficeId}
          </div>
        </div>
        <div className="text-right space-y-2">
          <div>
            <div className="text-xs opacity-60">MEVCUT VIP SEVİYE</div>
            <div className="text-xl font-semibold">{member.level.name}</div>
          </div>
          {/* Excel export butonu */}
          <div>
            <a
              href={`/api/members/${member.id}/export`}
              className="inline-flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-100 transition-colors"
            >
              Bu üyeyi Excel’e indir
            </a>
          </div>
        </div>
      </div>

      {/* Üst 3 kart: Son 90 gün, Kayıt tarihi, VIP özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-[#020617] border border-white/5 p-5">
          <div className="text-xs font-medium opacity-70 mb-1">
            SON 90 GÜN YATIRIM
          </div>
          <div className="text-2xl font-semibold">
            {formatTL(member.deposit90d)}
          </div>
          <div className="text-xs opacity-60 mt-1">
            Sadece yatırımlar, bonuslar hariç.
          </div>
        </div>

        <div className="rounded-xl bg-[#020617] border border-white/5 p-5">
          <div className="text-xs font-medium opacity-70 mb-1">KAYIT TARİHİ</div>
          <div className="text-2xl font-semibold">
            {formatDate(member.createdAt)}
          </div>
          <div className="text-xs opacity-60 mt-1">
            Sisteme ilk katıldığı tarih.
          </div>
        </div>

        <div className="rounded-xl bg-[#020617] border border-white/5 p-5">
          <div className="text-xs font-medium opacity-70 mb-1">VIP ÖZET</div>
          <div className="text-sm">
            <span className="opacity-70">Seviye: </span>
            <span className="font-semibold">{member.level.name}</span>
          </div>
          <div className="text-xs opacity-60 mt-1">
            Son 90 günde min. 10.000₺ yatırımı olan üyeler VIP listesine
            dahildir.
          </div>
        </div>
      </div>

      {/* Son 90 gün yatırım grafiği */}
      <div className="rounded-xl bg-[#020617] border border-white/5 p-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="font-medium">Son 90 gün yatırım grafiği</div>
          <div className="opacity-70">
            Seviye aralığı: {formatTL(levelMin)}{" "}
            {levelMax ? `- ${formatTL(levelMax)}` : "ve üzeri"}
          </div>
        </div>

        <div className="text-xs opacity-70 mb-1">Toplam 90g yatırım</div>
        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden mb-4">
          <div
            className="h-3 bg-emerald-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>

        <div className="text-xs opacity-70 mb-1">
          Mevcut VIP seviye içindeki konumu
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-2 bg-sky-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] opacity-60 mt-2">
          <div>Min: {formatTL(levelMin)}</div>
          <div>%{progressPercent.toFixed(0)}</div>
          <div>Max: {levelMax ? formatTL(levelMax) : "∞"}</div>
        </div>
      </div>

      {/* VIP istatistikleri + seviye bazlı ödül tarihleri */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* VIP istatistikleri */}
        <div className="rounded-xl bg-[#020617] border border-white/5 p-6">
          <div className="text-lg font-semibold mb-4">VIP istatistikleri</div>
          {vipStats ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Toplam VIP ödül sayısı:</span>
                <span className="font-medium">{vipStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">İlk VIP ödülü:</span>
                <span className="font-medium">
                  {formatDate(vipStats.first ?? undefined)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Son VIP ödülü:</span>
                <span className="font-medium">
                  {formatDate(vipStats.last ?? undefined)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">VIP’te geçen tahmini süre:</span>
                <span className="font-medium">
                  {vipStats.daysSinceLast != null
                    ? `${vipStats.daysSinceLast} gün`
                    : "-"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-70">
              Bu üyeye ait VIP ödül kaydı bulunamadı.
            </div>
          )}
        </div>

        {/* Seviye bazlı ödül tarihleri */}
        <div className="rounded-xl bg-[#020617] border border-white/5 p-6">
          <div className="text-lg font-semibold mb-4">
            Seviye bazlı ödül tarihleri
          </div>
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full text-left border-separate border-spacing-y-1">
              <thead className="text-xs opacity-70">
                <tr>
                  <th className="py-1 pr-4">Seviye</th>
                  <th className="py-1 pr-4">Ödül tarihi</th>
                  <th className="py-1 pr-4 text-right">Durum</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(LEVEL_LABELS) as LevelId[]).map((lvl) => {
                  const rewardDate = levelRewardMap?.[lvl];
                  const taken = !!rewardDate;
                  return (
                    <tr key={lvl} className="align-middle">
                      <td className="py-1 pr-4">{LEVEL_LABELS[lvl]}</td>
                      <td className="py-1 pr-4">
                        {rewardDate ? formatDate(rewardDate) : "-"}
                      </td>
                      <td className="py-1 pr-4 text-right">
                        {taken ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 px-2 py-[2px] text-[11px]">
                            Ödül alınmış
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-700/40 text-slate-200 border border-slate-500/40 px-2 py-[2px] text-[11px]">
                            Henüz yok
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

      {/* Loss bonus istatistikleri + geçmişi */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Loss bonus istatistikleri */}
        <div className="rounded-xl bg-[#020617] border border-white/5 p-6">
          <div className="text-lg font-semibold mb-4">
            Loss bonus istatistikleri
          </div>
          {lossSummary && lossSummary.count > 0 ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Toplam loss bonus sayısı:</span>
                <span className="font-medium">{lossSummary.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Toplam kayıp (talep bazlı):</span>
                <span className="font-medium">
                  {formatTL(lossSummary.totalLoss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Toplam nakit bonus:</span>
                <span className="font-medium">
                  {formatTL(lossSummary.totalBonusCash)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Toplam freespin:</span>
                <span className="font-medium">
                  {lossSummary.totalBonusFreespin || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Toplam freebet:</span>
                <span className="font-medium">
                  {lossSummary.totalBonusFreebet || 0}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-70">
              Bu üyeye ait loss bonus kaydı bulunamadı.
            </div>
          )}
        </div>

        {/* Loss bonus geçmişi */}
        <div className="rounded-xl bg-[#020617] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Loss bonus geçmişi</div>
            {lossMeta && (
              <div className="text-xs opacity-70">
                Toplam {lossMeta.total} kayıt — sayfa başı{" "}
                {lossMeta.pageSize}
              </div>
            )}
          </div>

          {lossHistory.length === 0 ? (
            <div className="text-sm opacity-70">
              Loss bonus kaydı bulunamadı.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto text-sm mb-4">
                <table className="min-w-full text-left border-separate border-spacing-y-1">
                  <thead className="text-xs opacity-70">
                    <tr>
                      <th className="py-1 pr-4">Tarih</th>
                      <th className="py-1 pr-4">Kayıp</th>
                      <th className="py-1 pr-4">Nakit</th>
                      <th className="py-1 pr-4">Freespin</th>
                      <th className="py-1 pr-4">Freebet</th>
                      <th className="py-1 pr-4 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossHistory.map((row) => (
                      <tr key={row.id} className="align-middle">
                        <td className="py-1 pr-4">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="py-1 pr-4">
                          {formatTL(row.loss ?? 0)}
                        </td>
                        <td className="py-1 pr-4">
                          {row.addedCash ? formatTL(row.addedCash) : "-"}
                        </td>
                        <td className="py-1 pr-4">
                          {row.addedFreespin ?? "-"}
                        </td>
                        <td className="py-1 pr-4">
                          {row.addedFreebet ?? "-"}
                        </td>
                        <td className="py-1 pr-4 text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 px-2 py-[2px] text-[11px]">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {lossMeta && lossMeta.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="opacity-70">
                    Sayfa {lossMeta.page} / {lossMeta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
                      disabled={lossMeta.page <= 1}
                      onClick={() =>
                        setLossPage((p) => Math.max(1, p - 1))
                      }
                    >
                      ⟵ Önceki
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
                      disabled={lossMeta.page >= lossMeta.totalPages}
                      onClick={() =>
                        setLossPage((p) =>
                          Math.min(lossMeta.totalPages, p + 1)
                        )
                      }
                    >
                      Sonraki ⟶
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;