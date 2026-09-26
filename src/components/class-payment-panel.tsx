"use client";

import { saveAndRefresh } from "@/lib/api/save-and-refresh";
import { useEffect, useRef, useState } from "react";
import type { ClassSession } from "@/features/classes/service";
import type { ClassPayment } from "@/features/class-payments/service";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/features/payments/validation";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const methods: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
};
type Details = {
  payment: ClassPayment | null;
  amount: number;
  situation: "pending" | "paid" | "refunded" | "cancelled" | "free";
};

async function request(
  classId: string,
  method = "GET",
  payload?: unknown,
): Promise<Details> {
  const response = await fetch(`/api/classes/${classId}/payment`, {
    method,
    cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = (await response.json()) as Details & {
    error?: { message: string };
  };
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Não foi possível carregar a cobrança.",
    );
  return body;
}

export function ClassPaymentPanel({
  classSession,
  onClose,
  onChanged,
}: {
  classSession: ClassSession;
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [notice, setNotice] = useState("");
  const sending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/classes/${classSession.id}/payment`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as Details & {
          error?: { message: string };
        };
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Não foi possível carregar a cobrança.",
          );
        return body;
      })
      .then(setDetails)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar a cobrança.",
        );
      });
    return () => controller.abort();
  }, [classSession.id]);

  async function refresh() {
    setDetails(await request(classSession.id));
    await onChanged();
    setRefreshRequired(false);
  }
  async function retryLoad() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await refresh();
    } catch {
      setError("Não foi possível atualizar os dados. Tente novamente.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function submit(action: "pay" | "refund") {
    if (sending.current || busy || refreshRequired) return;
    if (
      action === "refund" &&
      !window.confirm(
        "Registrar o estorno? Confirme a devolução do dinheiro fora do sistema.",
      )
    )
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveAndRefresh(async () => {
        await request(
          classSession.id,
          action === "pay" ? "POST" : "PATCH",
          action === "pay" ? { method } : { status: "refunded" },
        );
      }, refresh);
      setNotice("Operação registrada com sucesso.");
      if (!result.refreshed) {
        setRefreshRequired(true);
        setError(
          "A operação foi concluída. Atualize os dados antes de continuar; não é necessário registrar novamente.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao salvar o pagamento.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento da aula"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">Pagamento da aula</h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Registre aqui apenas uma cobrança avulsa da sessão. Mensalidades são
          lançadas separadamente.
        </p>
        {notice && (
          <p role="status" className="mt-4 text-sm text-lime-300">
            {notice}
          </p>
        )}
        {(refreshRequired || (!details && error)) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void retryLoad()}
            className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
          >
            Atualizar dados
          </button>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        {!details ? (
          <p className="mt-5 text-sm text-slate-400">Carregando cobrança...</p>
        ) : (
          <>
            <div className="mt-5 rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Valor total da aula</p>
              <p className="mt-1 text-2xl font-bold">
                {money.format(details.amount)}
              </p>
              <p className="mt-3 text-sm">
                Situação:{" "}
                <strong>
                  {
                    {
                      pending: "Pendente",
                      paid: "Pago",
                      refunded: "Estornado",
                      cancelled: "Cancelada",
                      free: "Sem cobrança",
                    }[details.situation]
                  }
                </strong>
              </p>
              {details.payment && (
                <p className="mt-2 text-sm text-slate-300">
                  Forma: {methods[details.payment.method as PaymentMethod]} ·
                  Pago em{" "}
                  {new Date(details.payment.paid_at).toLocaleString("pt-BR")}
                </p>
              )}
              {details.payment?.refunded_at && (
                <p className="mt-1 text-sm text-slate-300">
                  Estornado em{" "}
                  {new Date(details.payment.refunded_at).toLocaleString(
                    "pt-BR",
                  )}
                </p>
              )}
            </div>
            {details.situation === "pending" && (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-medium">
                  Forma de pagamento recebida
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                    className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"
                  >
                    {PAYMENT_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {methods[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy || refreshRequired}
                  onClick={() => void submit("pay")}
                  className="rounded-lg bg-lime-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Registrar pagamento
                </button>
              </div>
            )}
            {details.situation === "paid" && (
              <button
                type="button"
                disabled={busy || refreshRequired}
                onClick={() => void submit("refund")}
                className="mt-5 rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-300 disabled:opacity-50"
              >
                Registrar estorno
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
