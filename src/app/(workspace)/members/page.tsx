import { Members } from "@/components/members";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Miembros" };
export default async function Page() {
  return <Members user={(await currentUser())!} />;
}
