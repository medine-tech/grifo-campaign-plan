import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";
import { safeReturnPath } from "@/lib/onboarding";
import { redirect } from "next/navigation";
export const metadata = { title: "Entrar" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = safeReturnPath((await searchParams).next);
  if (await currentUser()) redirect(nextPath);
  return <AuthForm nextPath={nextPath} />;
}
