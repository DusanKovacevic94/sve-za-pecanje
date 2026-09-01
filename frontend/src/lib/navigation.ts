const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function safeNextPath(
  value: string | null | undefined,
  fallback = "/nalog"
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER.test(value)
  ) {
    return fallback;
  }

  return value;
}

export function loginHref(nextPath: string): string {
  return `/prijava?next=${encodeURIComponent(safeNextPath(nextPath, "/"))}`;
}

export function registrationHref(nextPath: string): string {
  return `/registracija?next=${encodeURIComponent(safeNextPath(nextPath, "/"))}`;
}
