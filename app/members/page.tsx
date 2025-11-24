// app/members/page.tsx
import AuthGuard from "../_components/AuthGuard";
import MembersClient from "./_components/MembersClient";

export default function MembersPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="w-full px-6 pt-4 py-8">
          <MembersClient />
        </main>
      </div>
    </AuthGuard>
  );
}