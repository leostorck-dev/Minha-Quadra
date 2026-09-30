import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-6 text-[#1f2937]">
      <div className="w-full max-w-lg text-center">
        <BrandLogo className="mx-auto w-52" />
        <p className="mt-10 text-sm font-bold tracking-[0.22em] text-[#0f6b46] uppercase">
          Erro 404
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Esta quadra não existe
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          O endereço pode ter mudado ou a página não está mais disponível.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#0f6b46] px-6 py-3 font-semibold text-white hover:bg-[#0b3f34]"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
