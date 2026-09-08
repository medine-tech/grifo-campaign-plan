import { currentUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Shell user={user}>{children}</Shell>;
}
