import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeBrazilianPhone,
  parseBookingDecision,
  parsePublicArenaSearch,
  parsePublicBookingRequest,
  parsePublicPageSettings,
  parseStatusToken,
} from "../src/features/public-bookings/validation.ts";
import { ValidationError } from "../src/lib/api/validation-error.ts";

const courtId = "11111111-1111-4111-8111-111111111111";
const token = "a".repeat(64);

test("consulta pública valida slug, quadra e data civil", () => {
  assert.deepEqual(
    parsePublicArenaSearch(
      new URLSearchParams({
        slug: "arena-central",
        court: courtId,
        date: "2026-10-01",
      }),
    ),
    { arenaSlug: "arena-central", courtId, selectedDate: "2026-10-01" },
  );
  for (const params of [
    { slug: "Arena Inválida" },
    { slug: "arena", court: "x" },
    { slug: "arena", date: "2026-02-30" },
  ]) {
    assert.throws(
      () => parsePublicArenaSearch(new URLSearchParams(params)),
      ValidationError,
    );
  }
});

test("telefone brasileiro é normalizado sem aceitar números incompletos", () => {
  assert.equal(normalizeBrazilianPhone("(31) 99999-9999"), "5531999999999");
  assert.equal(normalizeBrazilianPhone("+55 31 3333-4444"), "553133334444");
  assert.throws(() => normalizeBrazilianPhone("9999-9999"), ValidationError);
});

test("pedido público aceita somente o contrato esperado", () => {
  const valid = {
    slug: "arena-central",
    courtId,
    startAt: "2026-10-01T18:00:00-03:00",
    name: "  Ana   Souza ",
    phone: "(31) 99999-9999",
    token,
    website: "",
  };
  assert.deepEqual(parsePublicBookingRequest(valid), {
    arenaSlug: "arena-central",
    courtId,
    startAt: valid.startAt,
    name: "Ana Souza",
    phone: "5531999999999",
    token,
    website: "",
  });
  assert.throws(
    () => parsePublicBookingRequest({ ...valid, admin: true }),
    ValidationError,
  );
  assert.throws(
    () => parsePublicBookingRequest({ ...valid, website: "spam.test" }),
    ValidationError,
  );
  assert.throws(() => parseStatusToken("A".repeat(64)), ValidationError);
});

test("decisão exige motivo apenas na recusa", () => {
  assert.deepEqual(
    parseBookingDecision({ id: courtId, approve: true, reason: "" }),
    {
      id: courtId,
      approve: true,
      reason: "",
    },
  );
  assert.deepEqual(
    parseBookingDecision({
      id: courtId,
      approve: false,
      reason: "  Horário bloqueado  ",
    }),
    { id: courtId, approve: false, reason: "Horário bloqueado" },
  );
  assert.throws(
    () => parseBookingDecision({ id: courtId, approve: false, reason: "não" }),
    ValidationError,
  );
});

test("configuração pública normaliza contato e limita textos", () => {
  assert.deepEqual(
    parsePublicPageSettings({
      action: "public-page",
      enabled: true,
      whatsapp: "(31) 99999-9999",
      address: "  Rua da Arena, 10  ",
      instructions: "  Chegue com antecedência.  ",
    }),
    {
      enabled: true,
      whatsapp: "5531999999999",
      address: "Rua da Arena, 10",
      instructions: "Chegue com antecedência.",
    },
  );
});
