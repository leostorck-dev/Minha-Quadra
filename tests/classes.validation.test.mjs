import assert from "node:assert/strict";
import test from "node:test";
import {
  parseClass,
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
