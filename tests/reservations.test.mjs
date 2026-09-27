import assert from "node:assert/strict";
import test from "node:test";
import { overlaps } from "../src/features/reservations/conflicts.ts";
import {
  assertLocalHours,
  assertStatusTransition,
  parseReservationCreate,
  parseReservationUpdate,
  parseAvailability,
  parseReservationList,
} from "../src/features/reservations/validation.ts";
import {
  assertPaymentFilterPermission,
  filterReservationsByPayment,
} from "../src/features/reservations/payment-filter.ts";
import { ValidationError } from "../src/lib/api/validation-error.ts";

const courtId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const base = {
  kind: "booking",
  courtId,
  customerId,
  startAt: "2026-09-25T09:00:00-03:00",
  endAt: "2026-09-25T10:00:00-03:00",
};

test("conflito cobre sobreposição exata e parcial; intervalos encostados são livres", () => {
  const start = "2026-09-25T12:00:00Z";
  const end = "2026-09-25T13:00:00Z";
  assert.equal(overlaps(start, end, start, end), true);
  assert.equal(
    overlaps(start, end, "2026-09-25T12:30:00Z", "2026-09-25T13:30:00Z"),
    true,
  );
  assert.equal(
    overlaps(start, end, "2026-09-25T11:30:00Z", "2026-09-25T12:30:00Z"),
    true,
  );
  assert.equal(overlaps(start, end, end, "2026-09-25T14:00:00Z"), false);
  assert.equal(overlaps(start, end, "2026-09-25T11:00:00Z", start), false);
});

test("criação valida duração, identidade e bloqueio", () => {
  assert.equal(parseReservationCreate(base).startAt, "2026-09-25T12:00:00Z");
  assert.equal(
    parseReservationCreate({ ...base, kind: "block", customerId: null })
      .customerId,
    null,
  );
  assert.throws(
    () => parseReservationCreate({ ...base, tenantId: courtId }),
    ValidationError,
  );
  assert.throws(
    () =>
      parseReservationCreate({ ...base, endAt: "2026-09-25T09:00:00-03:00" }),
    ValidationError,
  );
  assert.throws(
    () =>
      parseReservationCreate({ ...base, endAt: "2026-09-25T09:45:00-03:00" }),
    ValidationError,
  );
  assert.throws(
    () => parseReservationCreate({ ...base, kind: "block" }),
    ValidationError,
  );
});

test("horário respeita o fuso e a abertura da quadra", () => {
  assert.doesNotThrow(() =>
    assertLocalHours(
      "2026-09-25T12:00:00Z",
      "2026-09-25T13:00:00Z",
      "America/Sao_Paulo",
      "08:00",
      "22:00",
    ),
  );
  assert.throws(
    () =>
      assertLocalHours(
        "2026-09-25T10:00:00Z",
        "2026-09-25T11:00:00Z",
        "America/Sao_Paulo",
        "08:00",
        "22:00",
      ),
    ValidationError,
  );
  assert.throws(
    () =>
      assertLocalHours(
        "2026-09-25T12:15:00Z",
        "2026-09-25T13:15:00Z",
        "America/Sao_Paulo",
        "08:00",
        "22:00",
      ),
    ValidationError,
  );
});

test("transições de status e filtros inválidos são rejeitados", () => {
  assert.doesNotThrow(() =>
    assertStatusTransition("confirmed", "checked_in", "booking"),
  );
  assert.doesNotThrow(() =>
    assertStatusTransition("checked_in", "completed", "booking"),
  );
  assert.throws(
    () => assertStatusTransition("completed", "confirmed", "booking"),
    ValidationError,
  );
  assert.throws(
    () => assertStatusTransition("confirmed", "checked_in", "block"),
    ValidationError,
  );
  assert.throws(
    () => parseReservationUpdate({ status: "paid" }),
    ValidationError,
  );
  assert.throws(() => parseReservationUpdate({ price: 1 }), ValidationError);
  assert.throws(
    () =>
      parseAvailability(new URLSearchParams({ courtId, date: "2026-02-30" })),
    ValidationError,
  );
});
import { agendaReport } from "../src/features/reservations/reports.ts";

const reportItem = {
  id: courtId,
  courtId,
  courtName: '=Quadra "A"',
  customerId,
  customerName: "@Cliente",
  kind: "booking",
  startAt: "2026-09-27T01:00:00Z",
  endAt: "2026-09-27T02:00:00Z",
  status: "confirmed",
  price: 125.5,
  notes: null,
  createdAt: base.startAt,
  updatedAt: base.startAt,
  paymentSituation: "paid",
};

test("CSV da agenda converte o fuso, mantém centavos e neutraliza fórmulas", () => {
  const result = agendaReport([reportItem], "America/Sao_Paulo");
  assert.ok(result.startsWith("\ufeff"));
  assert.ok(result.includes('"2026-09-26T22:00:00";"2026-09-26T23:00:00"'));
  assert.ok(result.includes('"125,50";"Pago"'));
  assert.ok(result.includes('"\'=Quadra ""A"""'));
  assert.ok(result.includes('"\'@Cliente"'));
});

test("CSV da agenda diferencia estorno, pendência e bloqueio", () => {
  const result = agendaReport(
    [
      { ...reportItem, paymentSituation: "refunded" },
      { ...reportItem, paymentSituation: "pending" },
      {
        ...reportItem,
        kind: "block",
        customerName: null,
        price: 0,
        paymentSituation: undefined,
      },
    ],
    "America/Sao_Paulo",
  );
  assert.ok(result.includes('"Estornado"'));
  assert.ok(result.includes('"Pendente"'));
  assert.ok(result.includes('"Bloqueio"'));
  assert.ok(result.includes('"0,00";"Não se aplica"'));
});

test("CSV da agenda preserva cabeçalho vazio e mais de mil reservas", () => {
  assert.equal(agendaReport([], "America/Sao_Paulo").split("\r\n").length, 2);
  const rows = Array.from({ length: 1105 }, (_, index) => ({
    ...reportItem,
    id: String(index),
  }));
  assert.equal(
    agendaReport(rows, "America/Sao_Paulo").split("\r\n").length,
    1107,
  );
});

import { summarizeAgenda } from "../src/features/reservations/summary.ts";
const summaryFrom = "2026-09-27T00:00:00Z";
const summaryTo = "2026-09-28T00:00:00Z";

test("resumo distingue reservas, bloqueios e situações sem somar cancelamentos/faltas", () => {
  const summary = summarizeAgenda(
    [
      { ...reportItem, status: "completed", paymentSituation: "pending" },
      { ...reportItem, kind: "block", price: 900, paymentSituation: "pending" },
      { ...reportItem, status: "cancelled", paymentSituation: "pending" },
      { ...reportItem, status: "no_show", paymentSituation: "pending" },
    ],
    summaryFrom,
    summaryTo,
  );
  assert.deepEqual(summary, {
    bookings: 1,
    blocks: 1,
    minutes: 120,
    pendingCents: 12550,
  });
});

test("resumo preserva centavos e não considera pagos, estornados ou gratuitos pendentes", () => {
  const rows = [
    "pending",
    "pending",
    "paid",
    "refunded",
    "free",
    undefined,
  ].map((paymentSituation, i) => ({
    ...reportItem,
    price: i === 0 ? 0.1 : 0.2,
    paymentSituation,
  }));
  assert.equal(summarizeAgenda(rows, summaryFrom, summaryTo).pendingCents, 30);
});

test("horas limitadas ao período somam quadras simultâneas e excluem intervalos externos", () => {
  const rows = [
    {
      ...reportItem,
      startAt: "2026-09-26T23:00:00Z",
      endAt: "2026-09-27T01:00:00Z",
    },
    {
      ...reportItem,
      startAt: "2026-09-27T23:30:00Z",
      endAt: "2026-09-28T01:00:00Z",
    },
    { ...reportItem, courtId: customerId },
    { ...reportItem, endAt: summaryFrom, startAt: "2026-09-26T23:00:00Z" },
    { ...reportItem, startAt: summaryTo, endAt: "2026-09-28T01:00:00Z" },
  ];
  const summary = summarizeAgenda(rows, summaryFrom, summaryTo);
  assert.equal(summary.bookings, 3);
  assert.equal(summary.minutes, 150);
  assert.deepEqual(summarizeAgenda([], summaryFrom, summaryTo), {
    bookings: 0,
    blocks: 0,
    minutes: 0,
    pendingCents: 0,
  });
});

test("filtro de cobrança valida opções e usa todas por padrão", () => {
  const params = new URLSearchParams({
    from: "2026-09-27T00:00:00Z",
    to: "2026-09-28T00:00:00Z",
  });
  assert.equal(parseReservationList(params).paymentSituation, "all");
  for (const situation of [
    "all",
    "pending",
    "paid",
    "refunded",
    "cancelled",
    "free",
  ]) {
    params.set("paymentSituation", situation);
    assert.equal(parseReservationList(params).paymentSituation, situation);
  }
  params.set("paymentSituation", "unknown");
  assert.throws(() => parseReservationList(params), ValidationError);
});

test("filtro de cobrança mantém blocos apenas em Todas e separa as situações", () => {
  const rows = ["pending", "paid", "refunded", "cancelled", "free"].map(
    (paymentSituation) => ({
      ...reportItem,
      id: paymentSituation,
      paymentSituation,
    }),
  );
  rows.push({
    ...reportItem,
    id: "block",
    kind: "block",
    paymentSituation: undefined,
  });
  assert.equal(filterReservationsByPayment(rows, "all").length, 6);
  for (const situation of [
    "pending",
    "paid",
    "refunded",
    "cancelled",
    "free",
  ]) {
    assert.deepEqual(
      filterReservationsByPayment(rows, situation).map((row) => row.id),
      [situation],
    );
  }
});

test("professor não consulta filtro financeiro", () => {
  assert.doesNotThrow(() => assertPaymentFilterPermission("COACH", "all"));
  for (const situation of [
    "pending",
    "paid",
    "refunded",
    "cancelled",
    "free",
  ]) {
    assert.throws(
      () => assertPaymentFilterPermission("COACH", situation),
      ValidationError,
    );
    assert.doesNotThrow(() =>
      assertPaymentFilterPermission("RECEPTIONIST", situation),
    );
  }
});
