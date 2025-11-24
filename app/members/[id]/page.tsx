// app/members/[id]/page.tsx
import MemberDetail from "./ui/MemberDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetail id={id} />;
}