import Link from "next/link";
import { redirect } from "next/navigation";
import { CourtEditor } from "@/components/court-editor";
import { getAuthContext } from "@/lib/auth/context";

export default async function NewCourtPage() {
  const context = await getAuthContext();
  if (context?.role !== "OWNER" && context?.role !== "MANAGER")
    redirect("/courts");
  return (
    <section className="max-w-3xl">
      <Link href="/courts" className="text-sm text-lime-400 hover:underline">
        ← Voltar para quadras
      </Link>
      <h1 className="mt-5 mb-7 text-3xl font-bold">Nova quadra</h1>
      <CourtEditor />
    </section>
  );
}
