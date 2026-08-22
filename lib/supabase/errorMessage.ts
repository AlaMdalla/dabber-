export function describeError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof e.message === "string" && e.message) parts.push(e.message);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(e.hint);

    const code = e.code ?? e.status ?? e.statusCode;
    if (code !== undefined && code !== null) parts.push(`(code: ${code})`);

    if (parts.length > 0) return parts.join(" — ");
  }

  if (error instanceof Error) return error.message;

  return "Erreur inconnue — voir la console pour plus de détails.";
}
