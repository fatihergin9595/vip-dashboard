// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eğer zaten login ise login sayfasına gelince otomatik dashboard'a gönder
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("vipUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.username === "string") {
          router.replace("/dashboard");
        }
      }
    } catch {
      // ignore
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Giriş başarısız");
      }

      // Login başarılı → localStorage'e yaz
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "vipUser",
          JSON.stringify({
            username: json.user?.username ?? username,
          })
        );
      }

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Beklenmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg"
      >
        <h1 className="mb-4 text-xl font-semibold">VIP Dashboard Giriş</h1>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Kullanıcı adı
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/70"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-950/80 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/70"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş yap"}
        </button>
      </form>
    </div>
  );
}