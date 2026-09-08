import { notFound } from "next/navigation";
import { getIsland } from "@/lib/domain";
import { IslandWorkspace } from "@/components/island-workspace";
import { currentUser } from "@/lib/auth";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return {
    title: getIsland((await params).slug)?.name || "Isla no encontrada",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const island = getIsland((await params).slug);
  if (!island) notFound();
  return <IslandWorkspace islandId={island.id} user={(await currentUser())!} />;
}
