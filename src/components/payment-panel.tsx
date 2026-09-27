"use client";

import { saveAndRefresh } from "@/lib/api/save-and-refresh";
import { useEffect, useRef, useState } from "react";
import type { Reservation } from "@/features/reservations/service";
import type { Payment, PaymentEvent } from "@/features/payments/service";
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
  payment: Payment | null;
  events: PaymentEvent[];
  situation: "pending" | "paid" | "refunded" | "cancelled" | "free";
  amount: number;
};

export function PaymentPanel({
  reservation,
  onClose,
  onChanged,
}: {
  reservation: Reservation;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [notice, setNotice] = useState("");
  const sending = useRef(false);

  async function reload(signal?: AbortSignal) {
    const response = await fetch(
      `/api/reservations/${reservation.id}/payment`,
      {
        signal,
        cache: "no-store",
      },
    );
    const body = (await response.json()) as Details & {
      error?: { message: string };
    };
    if (!response.ok)
      throw new Error(
        body.error?.message ?? "Não foi possível carregar a cobrança.",
      );
    setDetails(body);
    setRefreshRequired(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reservations/${reservation.id}/payment`, {
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
            : "Não foi possível carregar a cobrança.",
        );
      });
    return () => controller.abort();
  }, [reservation.id]);

  async function retryLoad() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar a cobrança.",
      );
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
        "Registrar o estorno? Confirme também a devolução do dinheiro fora do sistema.",
      )
    )
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveAndRefresh(
        async () => {
          const response = await fetch(
            `/api/reservations/${reservation.id}/payment`,
            {
              method: action === "pay" ? "POST" : "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                action === "pay" ? { method } : { status: "refunded" },
              ),
            },
          );
          const body = (await response.json()) as {
            error?: { message: string };
          };
          if (!response.ok)
            throw new Error(
              body.error?.message ?? "Não foi possível salvar o pagamento.",
            );
        },
        async () => {
          onChanged();
          await reload();
        },
      );
      setNotice(
        action === "pay"
          ? "Pagamento registrado com sucesso."
          : "Estorno registrado com sucesso.",
      );
      if (!result.refreshed) {
        setRefreshRequired(true);
        setError(
          "O registro foi concluído, mas a cobrança não foi atualizada na tela. Atualize os dados antes de continuar; não é necessário registrar novamente.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar o pagamento.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const situationLabels: Record<Details["situation"], string> = {
    pending: "Pendente",
    paid: "Pago",
    refunded: "Estornado",
    cancelled: "Cancelado",
    free: "Sem cobrança",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento da reserva"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Pagamento da reserva</h2>
            <p className="mt-1 text-sm text-slate-400">
              {reservation.customerName} · {reservation.courtName}
            </p>
          </div>
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
          <p role="alert" className="mt-5 text-sm text-rose-300">
            {error}
          </p>
        )}
        {!details ? (
          <p className="mt-6 text-sm text-slate-400">Carregando cobrança...</p>
        ) : (
          <>
            <div className="mt-6 rounded-xl bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Valor da reserva</p>
              <p className="mt-1 text-2xl font-bold">
                {money.format(details.amount)}
              </p>
              <p className="mt-3 text-sm">
                Situação: <strong>{situationLabels[details.situation]}</strong>
              </p>
              {details.payment && (
                <p className="mt-1 text-sm text-slate-300">
                  Forma: {methods[details.payment.method]}
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
                  onClick={() => submit("pay")}
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
                onClick={() => submit("refund")}
                className="mt-5 rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-300 disabled:opacity-50"
              >
                Registrar estorno
              </button>
            )}
            {details.events.length > 0 && (
              <div className="mt-7 border-t border-white/10 pt-5">
                <h3 className="font-semibold">Histórico</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {details.events.map((event) => (
                    <li key={event.id}>
                      {event.event === "paid"
                        ? "Pagamento registrado"
                        : "Estorno registrado"}
                      {" · "}
                      {new Date(event.createdAt).toLocaleString("pt-BR")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
