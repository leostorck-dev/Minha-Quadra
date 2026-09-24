"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth/context";

const upcoming = ["Configurações"];

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/agenda", label: "Agenda" },
    ...(role === "COACH" ? [] : [{ href: "/customers", label: "Clientes" }]),
    { href: "/courts", label: "Quadras" },
    ...(["OWNER", "MANAGER"].includes(role)
      ? [
          { href: "/finance", label: "Financeiro" },
          { href: "/audit", label: "Auditoria" },
        ]
      : []),
  ];

  return (
    <>
      <nav aria-label="Navegação principal" className="hidden md:block">
        <div className="space-y-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "page"
                  : undefined
              }
              className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "bg-lime-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="px-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Próximos módulos
          </p>
          {upcoming.map((label) => (
            <span
              key={label}
              className="block px-4 py-3 text-sm text-slate-500"
            >
              {label}
            </span>
          ))}
        </div>
      </nav>

      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-white/10 bg-slate-900 px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || pathname.startsWith(`${href}/`)
                ? "page"
                : undefined
            }
            className={`shrink-0 px-3 py-4 text-center text-xs font-semibold ${
              pathname === href || pathname.startsWith(`${href}/`)
                ? "text-lime-400"
                : "text-slate-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
