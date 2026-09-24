import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export default async function DashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  return (
    <section>
      <p className="text-sm text-lime-400">Visão geral</p>
      <h1 className="mt-2 text-3xl font-bold">Olá, {context.name}</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Clientes, quadras e agenda estão disponíveis. As métricas de reservas e
        faturamento aparecerão em uma próxima etapa.
      </p>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Clientes</p>
          <p className="mt-3 text-xl font-semibold">Cadastre e acompanhe</p>
          {context.role !== "COACH" && (
            <Link
              href="/customers"
              className="mt-5 inline-block text-sm font-semibold text-lime-400 hover:underline"
            >
              Abrir clientes →
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Quadras</p>
          <p className="mt-3 text-xl font-semibold">Gerencie seus espaços</p>
          <Link
            href="/courts"
            className="mt-5 inline-block text-sm font-semibold text-lime-400 hover:underline"
          >
            Abrir quadras →
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Agenda</p>
          <p className="mt-3 text-xl font-semibold">Acompanhe reservas</p>
          <Link
            href="/agenda"
            className="mt-5 inline-block text-sm font-semibold text-lime-400 hover:underline"
          >
            Abrir agenda →
          </Link>
        </div>
      </div>
    </section>
  );
}
