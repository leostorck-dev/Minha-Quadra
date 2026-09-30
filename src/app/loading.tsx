export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#0b3f34] px-6 text-white"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#d8c29a]" />
        <p className="mt-4 text-sm font-medium text-white/80">
          Carregando sua quadra…
        </p>
      </div>
    </main>
  );
}
