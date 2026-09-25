"use client";

import { useEffect, useState } from "react";
import type { ClassSession } from "@/features/classes/service";
import type {
  CoachCommissionPayout,
  CoachPayoutMethod,
} from "@/features/coach-commissions/service";
import type { Role } from "@/lib/auth/context";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const methods: Record<CoachPayoutMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  transfer: "Transferência",
};
type Details = {
  payout: CoachCommissionPayout | null;
  amount: number;
  classStatus: string;
};

async function load(classId: string, signal?: AbortSignal): Promise<Details> {
  const response = await fetch(`/api/classes/${classId}/commission`, {
    cache: "no-store",
    signal,
  });
  const body = (await response.json()) as Details & {
    error?: { message: string };
  };
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Não foi possível carregar a comissão.",
    );
  return body;
}

export function CoachCommissionPanel({
  classSession,
  coachName,
  role,
  onClose,
  onChanged,
}: {
  classSession: ClassSession;
  coachName: string;
  role: Role;
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [method, setMethod] = useState<CoachPayoutMethod>("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    load(classSession.id, controller.signal)
      .then(setDetails)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar comissão.",
        );
      });
    return () => controller.abort();
  }, [classSession.id]);

  async function submit() {
    if (
      !window.confirm(
        `Confirmar que ${money.format(details?.amount ?? 0)} já foram pagos a ${coachName} fora do sistema?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/classes/${classSession.id}/commission`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method }),
        },
      );
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Não foi possível liquidar a comissão.",
        );
      setDetails(await load(classSession.id));
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao liquidar comissão.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comissão da aula"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Comissão da aula</h2>
            <p className="mt-1 text-sm text-slate-400">{coachName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        {!details ? (
          <p className="mt-5 text-sm text-slate-400">Carregando comissão...</p>
        ) : (
          <>
            <div className="mt-5 rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Valor da comissão</p>
              <p className="mt-1 text-2xl font-bold">
                {money.format(details.amount)}
              </p>
              <p className="mt-3 text-sm">
                Situação:{" "}
                <strong>
                  {details.payout
                    ? "Liquidada"
                    : details.classStatus === "completed"
                      ? "Pendente"
                      : "Aula não concluída"}
                </strong>
              </p>
              {details.payout && (
                <p className="mt-2 text-sm text-slate-300">
                  Pago em{" "}
                  {new Date(details.payout.paid_at).toLocaleString("pt-BR")} ·{" "}
                  {methods[details.payout.method as CoachPayoutMethod]}
                </p>
              )}
            </div>
            {!details.payout &&
              details.classStatus === "completed" &&
              details.amount > 0 &&
              (role === "OWNER" || role === "MANAGER") && (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-slate-400">
                    Registre a liquidação após pagar o professor. Isso criará
                    uma despesa no financeiro.
                  </p>
                  <label className="block text-sm font-medium">
                    Forma de pagamento
                    <select
                      value={method}
                      onChange={(event) =>
                        setMethod(event.target.value as CoachPayoutMethod)
                      }
                      className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                    >
                      {Object.entries(methods).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submit()}
                    className="rounded-lg bg-lime-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Registrar comissão paga
                  </button>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
