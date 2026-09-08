import { Tokens } from "@/components/tokens";
import { currentUser } from "@/lib/auth";
export const metadata = { title: "Mis agentes" };
export default async function Page() {
  return (
    <Tokens
      user={(await currentUser())!}
      origin={process.env.APP_URL || "http://localhost:3000"}
    />
  );
}
