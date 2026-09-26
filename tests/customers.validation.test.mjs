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
    parseCustomerSearch(
      " Ana ",
      "2",
      "inactive",
      " Mensalista ",
      "frequent_10",
    ),
    {
      query: "Ana",
      page: 2,
      status: "inactive",
      tag: "mensalista",
      segment: "frequent_10",
    },
  );
  assert.throws(() => parseCustomerSearch("", "0", null), ValidationError);
  assert.throws(() => parseCustomerSearch("", "1", "deleted"), ValidationError);
  assert.throws(
    () => parseCustomerSearch("", "1", "active", null, "unknown"),
    ValidationError,
  );
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

import { customerReport } from "../src/features/customers/reports.ts";
test("CSV de clientes preserva contatos, indicadores e protege fórmulas", () => {
  const item = {
    id: "id",
    name: "=1+1",
    phone: "+5531999999999",
    email: "a@example.invalid",
    birthDate: null,
    status: "inactive",
    tags: ["vip", "areia"],
    reservationCount: 12,
    lastReservationAt: "2026-09-26T10:00:00-03:00",
    notes: "nota privada",
    createdAt: "",
    updatedAt: "",
  };
  const csv = customerReport([item]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes("'+5531999999999"));
  assert.ok(
    csv.includes('"Inativo";"vip, areia";12;"2026-09-26T13:00:00.000Z"'),
  );
  assert.ok(!csv.includes("nota privada"));
  assert.equal(customerReport([]).split("\r\n").length, 2);
  assert.equal(
    customerReport(
      Array.from({ length: 1105 }, () => ({
        ...item,
        lastReservationAt: null,
      })),
    ).split("\r\n").length,
    1107,
  );
});
