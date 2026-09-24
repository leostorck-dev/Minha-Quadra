import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCustomerCreate,
  parseCustomerSearch,
  parseCustomerUpdate,
  ValidationError,
} from "../src/features/customers/validation.ts";

test("aceita cliente com telefone e normaliza espaços", () => {
  const result = parseCustomerCreate({
    name: "  Ana Silva  ",
    phone: "(11) 99999-9999",
  });
  assert.equal(result.name, "Ana Silva");
  assert.equal(result.phone, "(11) 99999-9999");
  assert.equal(result.email, null);
  assert.deepEqual(result.tags, []);
});

test("exige contato e rejeita identidade enviada pelo cliente", () => {
  assert.throws(
    () => parseCustomerCreate({ name: "Ana Silva" }),
    ValidationError,
  );
  assert.throws(
    () =>
      parseCustomerCreate({
        name: "Ana Silva",
        email: "ana@example.com",
        tenant_id: "outra-arena",
      }),
    ValidationError,
  );
  assert.throws(
    () => parseCustomerUpdate({ created_by: "outro-usuario" }),
    ValidationError,
  );
});

test("rejeita data impossível e email inválido", () => {
  assert.throws(
    () =>
      parseCustomerCreate({
        name: "Ana Silva",
        email: "ana@example.com",
        birthDate: "2026-02-30",
      }),
    ValidationError,
  );
  assert.throws(
    () => parseCustomerCreate({ name: "Ana Silva", email: "sem-arroba" }),
    ValidationError,
  );
});

test("valida paginação e filtro de status", () => {
  assert.deepEqual(
    parseCustomerSearch(" Ana ", "2", "inactive", " Mensalista "),
    {
      query: "Ana",
      page: 2,
      status: "inactive",
      tag: "mensalista",
    },
  );
  assert.throws(() => parseCustomerSearch("", "0", null), ValidationError);
  assert.throws(() => parseCustomerSearch("", "1", "deleted"), ValidationError);
});

test("normaliza etiquetas e rejeita duplicatas", () => {
  assert.deepEqual(
    parseCustomerCreate({
      name: "Ana Silva",
      email: "ana@example.com",
      tags: [" Mensalista ", "VIP"],
    }).tags,
    ["mensalista", "vip"],
  );
  assert.deepEqual(parseCustomerUpdate({ tags: [] }).tags, []);
  assert.throws(
    () => parseCustomerUpdate({ tags: ["VIP", "vip"] }),
    ValidationError,
  );
  assert.throws(
    () => parseCustomerUpdate({ tags: Array(11).fill("etiqueta") }),
    ValidationError,
  );
});
