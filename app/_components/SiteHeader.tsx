// app/_components/Header.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type VipUser = {
  username: string;
};

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<VipUser | null>(null);

  // Sayfa ilk açıldığında localStorage'dan kullanıcıyı çek
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("vipUser");
      if (!raw) {
        setUser(null);
        return;
      }

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.username === "string") {
        setUser({ username: parsed.username });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogoClick = () => {
    router.push("/dashboard");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("vipUser");
    }
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        
        {/* Logo (sadece yazı + hover efekti) */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="text-xl font-semibold tracking-tight text-white hover:text-emerald-400 transition cursor-pointer select-none"
        >
          VIP Dashboard
        </button>

        {/* Kullanıcı alanı (sadece login olduysa göster) */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="max-w-[140px] truncate">
                  {user.username}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
              >
                Çıkış
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}