"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/auth/context";

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/agenda", label: "Agenda" },
    { href: "/classes", label: "Aulas" },
    ...(role === "COACH" ? [] : [{ href: "/tournaments", label: "Torneios" }]),
    ...(role === "COACH" ? [] : [{ href: "/customers", label: "Clientes" }]),
    { href: "/courts", label: "Quadras" },
    ...(["OWNER", "MANAGER"].includes(role)
      ? [
          { href: "/finance", label: "Financeiro" },
          { href: "/memberships", label: "Planos" },
          { href: "/audit", label: "Auditoria" },
        ]
      : []),
    ...(role === "OWNER"
      ? [{ href: "/settings", label: "Configurações" }]
      : []),
  ];
  const mobilePrimary = links.slice(0, 4);
  const mobileMore = links.slice(4);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <nav aria-label="Navegação principal" className="hidden md:block">
        <div className="space-y-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive(href)
                  ? "bg-[#d8c29a] text-[#0b3f34]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <nav
        aria-label="Navegação mobile"
        className={`fixed inset-x-0 bottom-0 z-20 grid ${mobileMore.length > 0 ? "grid-cols-5" : "grid-cols-4"} border-t border-white/10 bg-[#0b3f34]/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur md:hidden`}
      >
        {mobilePrimary.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`min-w-0 px-1 py-4 text-center text-[11px] font-semibold ${
              isActive(href) ? "text-[#d8c29a]" : "text-slate-300"
            }`}
          >
            <span className="block truncate">{label}</span>
          </Link>
        ))}
        {mobileMore.length > 0 && (
          <details className="group relative">
            <summary className="flex h-full cursor-pointer list-none items-center justify-center px-1 text-center text-[11px] font-semibold text-slate-300 marker:content-none">
              Mais
            </summary>
            <div className="absolute right-0 bottom-full mb-3 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0b3f34] p-2 shadow-2xl">
              {mobileMore.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive(href)
                      ? "bg-[#d8c29a] text-[#0b3f34]"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </details>
        )}
      </nav>
    </>
  );
}
