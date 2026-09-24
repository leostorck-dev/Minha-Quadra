import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCourtHours,
  parseCourtCreate,
  parseCourtSearch,
  parseCourtUpdate,
} from "../src/features/courts/validation.ts";
import { ValidationError } from "../src/lib/api/validation-error.ts";

const valid = {
  name: "  Quadra 1  ",
  sport: "Futevôlei",
  pricePerHour: "120.50",
  openingTime: "08:00",
  closingTime: "22:00",
};

test("aceita quadra e normaliza campos", () => {
  assert.deepEqual(parseCourtCreate(valid), {
    name: "Quadra 1",
    sport: "Futevôlei",
    description: null,
    pricePerHour: 120.5,
    openingTime: "08:00",
    closingTime: "22:00",
  });
});

test("preço aceita zero e rejeita negativo, excesso e mais de duas casas", () => {
  assert.equal(
    parseCourtCreate({ ...valid, pricePerHour: "0" }).pricePerHour,
    0,
  );
  for (const pricePerHour of ["-1", "100000", "12.345", "1e3", 12.5]) {
    assert.throws(
      () => parseCourtCreate({ ...valid, pricePerHour }),
      ValidationError,
    );
  }
});

test("horários exigem formato válido e ordem dentro do mesmo dia", () => {
  assert.throws(
    () => parseCourtCreate({ ...valid, openingTime: "25:00" }),
    ValidationError,
  );
  assert.throws(
    () => parseCourtCreate({ ...valid, closingTime: "08:00" }),
    ValidationError,
  );
  assert.throws(
    () => parseCourtCreate({ ...valid, closingTime: "07:59" }),
    ValidationError,
  );
  assert.throws(() => assertCourtHours("20:00", "10:00"), ValidationError);
  assert.equal(parseCourtUpdate({ openingTime: "09:00" }).openingTime, "09:00");
});

test("rejeita identidade do cliente e valida status e filtro", () => {
  assert.throws(
    () => parseCourtCreate({ ...valid, tenantId: "outro" }),
    ValidationError,
  );
  assert.throws(
    () => parseCourtUpdate({ createdBy: "outro" }),
    ValidationError,
  );
  assert.throws(() => parseCourtUpdate({ status: "deleted" }), ValidationError);
  assert.deepEqual(parseCourtSearch(" Areia ", "maintenance"), {
    query: "Areia",
    status: "maintenance",
  });
  assert.throws(() => parseCourtSearch("", "deleted"), ValidationError);
});
