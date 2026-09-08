import { Dashboard } from "@/components/dashboard";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Vista general" };
export default async function Page() {
  return <Dashboard name={(await currentUser())!.name} />;
}
