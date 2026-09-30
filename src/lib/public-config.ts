export type SignupMode = "open" | "invite" | "closed";

const signupModes = new Set<SignupMode>(["open", "invite", "closed"]);

export function parseSignupMode(
  value: string | undefined,
  nodeEnv: string | undefined,
): SignupMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized && signupModes.has(normalized as SignupMode)) {
    return normalized as SignupMode;
  }

  return nodeEnv === "production" ? "invite" : "open";
}

export function getSignupMode() {
  return parseSignupMode(
    process.env.SIGNUP_MODE ?? process.env.NEXT_PUBLIC_SIGNUP_MODE,
    process.env.NODE_ENV,
  );
}

export function parseExternalHttpUrl(value: string | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function getDemoUrl() {
  return parseExternalHttpUrl(process.env.NEXT_PUBLIC_DEMO_URL);
}
