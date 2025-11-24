// app/dashboard/page.tsx
import AuthGuard from "../_components/AuthGuard";
import DashboardClient from "./_components/DashboardClient";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-vip-bg text-slate-100">
        <main className="w-full px-6 pt-4 py-8">
          <DashboardClient />
        </main>
      </div>
    </AuthGuard>
  );
}