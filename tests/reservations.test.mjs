import assert from "node:assert/strict";
import test from "node:test";
import { overlaps } from "../src/features/reservations/conflicts.ts";
import {
  assertLocalHours,
  assertStatusTransition,
  parseReservationCreate,
  parseReservationUpdate,
  parseAvailability,
} from "../src/features/reservations/validation.ts";
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
