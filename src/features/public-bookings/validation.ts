import { ValidationError } from "../../lib/api/validation-error.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const date = /^\d{4}-\d{2}-\d{2}$/;
const token = /^[0-9a-f]{64}$/;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Envie dados válidos.");
  }
  return value as Record<string, unknown>;
}

function allowedKeys(input: Record<string, unknown>, allowed: Set<string>) {
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new ValidationError("O envio contém campos não permitidos.");
  }
}

function validDate(value: string) {
  if (!date.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function parsePublicArenaSearch(search: URLSearchParams) {
  const arenaSlug = (search.get("slug") ?? "").trim().toLowerCase();
  const courtId = search.get("court")?.trim() || null;
  const selectedDate = search.get("date")?.trim() || null;

  if (!slug.test(arenaSlug) || arenaSlug.length > 80) {
    throw new ValidationError("Arena inválida.");
  }
  if (courtId && !uuid.test(courtId)) {
    throw new ValidationError("Quadra inválida.");
  }
  if (selectedDate && !validDate(selectedDate)) {
    throw new ValidationError("Data inválida.");
  }

  return { arenaSlug, courtId, selectedDate };
}

export function normalizeBrazilianPhone(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("Informe um telefone válido.");
  }
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits.startsWith("55")) digits = `55${digits}`;
  if (!/^55[1-9][0-9]{9,10}$/.test(digits)) {
    throw new ValidationError("Informe um telefone brasileiro com DDD.");
  }
  return digits;
}

export function parsePublicBookingRequest(value: unknown) {
  const input = record(value);
  allowedKeys(
    input,
    new Set([
      "slug",
      "courtId",
      "startAt",
      "name",
      "phone",
      "token",
      "website",
    ]),
  );

  const arenaSlug =
    typeof input.slug === "string" ? input.slug.trim().toLowerCase() : "";
  const courtId = typeof input.courtId === "string" ? input.courtId.trim() : "";
  const name =
    typeof input.name === "string"
      ? input.name.trim().replace(/\s+/g, " ")
      : "";
  const requestToken = typeof input.token === "string" ? input.token : "";
  const website = typeof input.website === "string" ? input.website : "";
  const startAt = typeof input.startAt === "string" ? input.startAt : "";

  if (!slug.test(arenaSlug) || arenaSlug.length > 80)
    throw new ValidationError("Arena inválida.");
  if (!uuid.test(courtId)) throw new ValidationError("Quadra inválida.");
  if (name.length < 2 || name.length > 120)
    throw new ValidationError("O nome deve ter entre 2 e 120 caracteres.");
  if (!token.test(requestToken))
    throw new ValidationError("Identificador do pedido inválido.");
  if (website) throw new ValidationError("Não foi possível enviar o pedido.");
  if (!startAt || Number.isNaN(new Date(startAt).valueOf()))
    throw new ValidationError("Horário inválido.");

  return {
    arenaSlug,
    courtId,
    startAt,
    name,
    phone: normalizeBrazilianPhone(input.phone),
    token: requestToken,
    website,
  };
}

export function parseStatusToken(value: string | null) {
  const requestToken = value?.trim() ?? "";
  if (!token.test(requestToken)) throw new ValidationError("Pedido inválido.");
  return requestToken;
}

export function parseBookingDecision(value: unknown) {
  const input = record(value);
  allowedKeys(input, new Set(["id", "approve", "reason"]));
  const id = typeof input.id === "string" ? input.id : "";
  const approve = input.approve;
  const reason =
    typeof input.reason === "string"
      ? input.reason.trim().replace(/\s+/g, " ")
      : "";

  if (!uuid.test(id)) throw new ValidationError("Solicitação inválida.");
  if (typeof approve !== "boolean")
    throw new ValidationError("Decisão inválida.");
  if (approve && reason)
    throw new ValidationError("Não informe motivo ao aprovar.");
  if (!approve && (reason.length < 5 || reason.length > 240)) {
    throw new ValidationError("O motivo deve ter entre 5 e 240 caracteres.");
  }
  return { id, approve, reason: approve ? "" : reason };
}

export function parsePublicPageSettings(value: unknown) {
  const input = record(value);
  allowedKeys(
    input,
    new Set(["action", "enabled", "whatsapp", "address", "instructions"]),
  );
  if (input.action !== "public-page")
    throw new ValidationError("Ação inválida.");
  if (typeof input.enabled !== "boolean")
    throw new ValidationError("Situação inválida.");

  const optionalText = (field: unknown, label: string, max: number) => {
    if (field === null || field === undefined || field === "") return null;
    if (typeof field !== "string")
      throw new ValidationError(`${label} inválido.`);
    const text = field.trim().replace(/\s+/g, " ");
    if (text.length < 3 || text.length > max)
      throw new ValidationError(
        `${label} deve ter entre 3 e ${max} caracteres.`,
      );
    return text;
  };

  return {
    enabled: input.enabled,
    whatsapp:
      input.whatsapp === null ||
      input.whatsapp === undefined ||
      input.whatsapp === ""
        ? null
        : normalizeBrazilianPhone(input.whatsapp),
    address: optionalText(input.address, "Endereço", 180),
    instructions: optionalText(input.instructions, "Orientações", 500),
  };
}
