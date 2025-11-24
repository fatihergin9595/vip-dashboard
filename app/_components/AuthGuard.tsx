"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("vipUser");
    if (!raw) {
      // Giriş yok → login sayfasına gönder
      router.replace("/login");
      return;
    }

    // Kullanıcı var → içerik göster
    setAllowed(true);
  }, [router]);

  if (!allowed) {
    // İster buraya loading koy, şimdilik boş dursun
    return null;
  }

  return <>{children}</>;
}