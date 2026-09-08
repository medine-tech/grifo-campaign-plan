import { Settings } from "@/components/settings";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Configuración" };
export default async function Page() {
  return <Settings user={(await currentUser())!} />;
}
