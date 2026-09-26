import assert from "node:assert/strict";
import test from "node:test";
import {
  parseClass,
  parseClassSearch,
  parseClassChange,
  parseCoach,
} from "../src/features/classes/validation.ts";

const ids = {
  coachId: "a1111111-aaaa-4111-8111-111111111113",
  courtId: "b1111111-bbbb-4111-8111-111111111113",
  customerIds: ["c1111111-cccc-4111-8111-111111111113"],
};

test("agendamento valida tipo, alunos e horário", () => {
  const valid = {
    ...ids,
    kind: "individual",
    startAt: "2026-09-25T10:00:00Z",
    endAt: "2026-09-25T11:00:00Z",
    price: "100.00",
  };
  assert.equal(parseClass(valid).price, 100);
  assert.throws(() => parseClass({ ...valid, kind: "duo" }));
  assert.throws(() => parseClass({ ...valid, endAt: valid.startAt }));
  assert.throws(() =>
    parseClass({
      ...valid,
      customerIds: [ids.customerIds[0], ids.customerIds[0]],
    }),
  );
  assert.throws(() => parseClass({ ...valid, price: "100.001" }));
});

test("presença e cancelamento não aceitam campos extras", () => {
  assert.deepEqual(
    parseClassChange({
      status: "completed",
      presentCustomerIds: ids.customerIds,
    }),
    { status: "completed", presentCustomerIds: ids.customerIds },
  );
  assert.deepEqual(parseClassChange({ status: "cancelled" }), {
    status: "cancelled",
  });
  assert.throws(() =>
    parseClassChange({ status: "cancelled", presentCustomerIds: [] }),
  );
  assert.throws(() =>
    parseClassChange({
      status: "completed",
      presentCustomerIds: [ids.customerIds[0], ids.customerIds[0]],
    }),
  );
});

test("professor valida comissão e especialidades", () => {
  const valid = {
    name: " Professor ",
    phone: null,
    email: null,
    specialties: ["Futevôlei"],
    commissionType: "percentage",
    commissionValue: "20",
    profileId: null,
  };
  assert.equal(parseCoach(valid).name, "Professor");
  assert.throws(() => parseCoach({ ...valid, commissionValue: "101" }));
  assert.throws(() =>
    parseCoach({ ...valid, specialties: ["Futevôlei", "futevôlei"] }),
  );
});

test("consulta de aulas valida páginas, situação e professor", () => {
  assert.deepEqual(parseClassSearch(new URLSearchParams()), {
    page: 1,
    status: "all",
    coachId: null,
  });
  assert.deepEqual(
    parseClassSearch(
      new URLSearchParams({
        page: "21",
        status: "scheduled",
        coachId: ids.coachId,
      }),
    ),
    { page: 21, status: "scheduled", coachId: ids.coachId },
  );
  for (const params of [
    { page: "0" },
    { page: "1.5" },
    { page: "10001" },
    { page: "abc" },
    { status: "unknown" },
    { coachId: "invalid" },
  ]) {
    assert.throws(() => parseClassSearch(new URLSearchParams(params)));
  }
});
