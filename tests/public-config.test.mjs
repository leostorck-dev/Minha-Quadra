import assert from "node:assert/strict";
import test from "node:test";
import {
  parseExternalHttpUrl,
  parseSignupMode,
} from "../src/lib/public-config.ts";

test("cadastro fica protegido por padrão em produção", () => {
  assert.equal(parseSignupMode(undefined, "production"), "invite");
  assert.equal(parseSignupMode("valor-invalido", "production"), "invite");
});

test("desenvolvimento permanece aberto e modos válidos são respeitados", () => {
  assert.equal(parseSignupMode(undefined, "development"), "open");
  assert.equal(parseSignupMode(" OPEN ", "production"), "open");
  assert.equal(parseSignupMode("closed", "development"), "closed");
});

test("CTA externo aceita somente endereços HTTP ou HTTPS válidos", () => {
  assert.equal(parseExternalHttpUrl(undefined), null);
  assert.equal(parseExternalHttpUrl("javascript:alert(1)"), null);
  assert.equal(parseExternalHttpUrl("não é uma url"), null);
  assert.equal(
    parseExternalHttpUrl("https://example.com/demonstracao"),
    "https://example.com/demonstracao",
  );
});
